import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    // Require 'read' permission on 'users' resource
    await requirePermission(request, 'users', 'read');

    // Fetch all users with their roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        roleId: true,
        role_data: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        createdAt: true
      },
      orderBy: {
        email: 'asc'
      }
    });

    // Transform the data for the frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      role: {
        id: user.role_data.id,
        name: user.role_data.name
      },
      roleDescription: user.role_data.description,
      phoneNumber: user.phoneNumber,
      isActive: true, // Since isActive is not in schema yet, default to true so they appear in widget
      createdAt: user.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedUsers,
      count: transformedUsers.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require 'create' permission on 'users' resource
    await requirePermission(request, 'users', 'create');

    const body = await request.json();
    const { email, password, roleId, phoneNumber } = body;

    // Basic validation
    if (!email || !password || !roleId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: email, password, and roleId are required.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'A user with this email already exists.' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roleId,
        phoneNumber: phoneNumber || null,
      },
      include: {
        role_data: true
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

