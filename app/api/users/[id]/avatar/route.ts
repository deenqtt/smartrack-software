import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "avatars");

// Ensure upload directory exists
async function ensureUploadDir() {
  const fs = await import("fs");
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// POST /api/users/[id]/avatar - Upload user avatar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    await ensureUploadDir();

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${randomUUID()}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Delete old avatar if exists
    if (user.avatar) {
      try {
        const oldFilePath = join(process.cwd(), "public", user.avatar);
        await unlink(oldFilePath);
      } catch (error) {
        // Ignore if old file doesn't exist
        console.warn("Could not delete old avatar:", error);
      }
    }

    // Update user with new avatar path
    const avatarUrl = `/uploads/avatars/${fileName}`;
    await prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
    });

    return NextResponse.json({
      message: "Avatar uploaded successfully",
      avatar: avatarUrl,
    });

  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { message: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/avatar - Delete user avatar
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Delete avatar file if exists
    if (user.avatar) {
      try {
        const filePath = join(process.cwd(), "public", user.avatar);
        await unlink(filePath);
      } catch (error) {
        console.warn("Could not delete avatar file:", error);
      }
    }

    // Remove avatar from user record
    await prisma.user.update({
      where: { id },
      data: { avatar: null },
    });

    return NextResponse.json({
      message: "Avatar deleted successfully",
    });

  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json(
      { message: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
