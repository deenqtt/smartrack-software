import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface DeviceImportData {
  uniqId?: string;
  name: string;
  topic: string;
  address?: string;
}

interface ImportPayload {
  devices: DeviceImportData[];
  mode: 'add_only' | 'update_existing' | 'replace_all';
}

/**
 * POST: Advanced import with mode selection
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Require create permission
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'create');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const body: ImportPayload = await request.json();

    if (!Array.isArray(body.devices)) {
      return NextResponse.json(
        { error: "Expected devices array in payload" },
        { status: 400 }
      );
    }

    if (!['add_only', 'update_existing', 'replace_all'].includes(body.mode)) {
      return NextResponse.json(
        { error: "Invalid import mode" },
        { status: 400 }
      );
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Get existing devices for lookup if not replacing all
      let existingTopics = new Set<string>();
      let existingUniqIds = new Set<string>();
      let existingNames = new Set<string>();

      if (body.mode !== 'replace_all') {
        const existing = await tx.deviceExternal.findMany({
          select: { topic: true, uniqId: true, name: true }
        });
        existingTopics = new Set(existing.map(d => d.topic));
        existingUniqIds = new Set(existing.map(d => d.uniqId));
        existingNames = new Set(existing.map(d => d.name.toLowerCase()));
      } else {
        // WARNING: This deletes ALL existing devices and their configurations
        // We must delete referencing records that don't have cascade delete first to avoid foreign key violations
        await tx.loggingConfiguration.deleteMany({});
        await tx.billConfiguration.deleteMany({});
        await tx.pueConfiguration.deleteMany({});
        await tx.powerAnalyzerConfiguration.deleteMany({});
        await tx.iPAddressAllocation.deleteMany({});
        await tx.maintenance.deleteMany({});

        await tx.deviceExternal.deleteMany({});
      }

      for (const device of body.devices) {
        try {
          // Validate required fields
          if (!device.name || !device.topic || device.name.trim() === '' || device.topic.trim() === '') {
            skippedCount++;
            errors.push(`${device.name || 'Unknown'}: Missing required fields (name, topic)`);
            continue;
          }

          const nameLower = device.name.toLowerCase();

          if (body.mode === 'add_only') {
            // Check if device already exists
            const hasTopicConflict = existingTopics.has(device.topic);
            const hasUniqIdConflict = device.uniqId ? existingUniqIds.has(device.uniqId) : false;
            const hasNameConflict = existingNames.has(nameLower);

            if (hasTopicConflict || hasUniqIdConflict || hasNameConflict) {
              skippedCount++;
              let reason = '';
              if (hasTopicConflict) reason = 'topic conflict';
              else if (hasUniqIdConflict) reason = 'uniqId conflict';
              else if (hasNameConflict) reason = 'name conflict';
              errors.push(`${device.name}: Device already exists (${reason})`);
              continue;
            }

            // Create new device
            await tx.deviceExternal.create({
              data: {
                ...(device.uniqId && { uniqId: device.uniqId }),
                name: device.name,
                topic: device.topic,
                ...(device.address && { address: device.address })
              }
            });

            // Add to sets to prevent intra-batch duplicates
            existingTopics.add(device.topic);
            if (device.uniqId) existingUniqIds.add(device.uniqId);
            existingNames.add(nameLower);
            createdCount++;

          } else if (body.mode === 'update_existing') {
            // Try to find existing device to update
            let targetId: string | null = null;

            // 1. Check by uniqId
            if (device.uniqId && existingUniqIds.has(device.uniqId)) {
              const existing = await tx.deviceExternal.findUnique({ where: { uniqId: device.uniqId } });
              if (existing) targetId = existing.id;
            }

            // 2. Check by topic if not found by uniqId
            if (!targetId && existingTopics.has(device.topic)) {
              const existing = await tx.deviceExternal.findUnique({ where: { topic: device.topic } });
              if (existing) targetId = existing.id;
            }

            if (targetId) {
              // Update mode: check if new topic/name/uniqId conflicts with OTHER devices
              const updateData: any = {
                name: device.name,
                topic: device.topic
              };
              if (device.address !== undefined) updateData.address = device.address;
              if (device.uniqId !== undefined) updateData.uniqId = device.uniqId;

              await tx.deviceExternal.update({
                where: { id: targetId },
                data: updateData
              });

              existingNames.add(nameLower);
              existingTopics.add(device.topic);
              if (device.uniqId) existingUniqIds.add(device.uniqId);

              updatedCount++;
            } else {
              // Not found, check for conflicts before creating
              if (existingTopics.has(device.topic) || (device.uniqId && existingUniqIds.has(device.uniqId)) || existingNames.has(nameLower)) {
                skippedCount++;
                errors.push(`${device.name}: Duplicate found during update-or-create lookup`);
                continue;
              }

              // Create new
              await tx.deviceExternal.create({
                data: {
                  ...(device.uniqId && { uniqId: device.uniqId }),
                  name: device.name,
                  topic: device.topic,
                  ...(device.address && { address: device.address })
                }
              });

              existingTopics.add(device.topic);
              if (device.uniqId) existingUniqIds.add(device.uniqId);
              existingNames.add(nameLower);
              createdCount++;
            }
          } else if (body.mode === 'replace_all') {
            await tx.deviceExternal.create({
              data: {
                ...(device.uniqId && { uniqId: device.uniqId }),
                name: device.name,
                topic: device.topic,
                ...(device.address && { address: device.address })
              }
            });
            createdCount++;
          }

        } catch (error: any) {
          skippedCount++;
          errors.push(`${device.name}: ${error.message || 'Database error'}`);
        }
      }

      return { createdCount, updatedCount, skippedCount, errors };
    });

    return NextResponse.json({
      message: 'Import completed successfully',
      ...result
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Internal server error during import' },
      { status: 500 }
    );
  }
}
