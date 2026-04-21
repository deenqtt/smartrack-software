// File: app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";


export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validasi input dasar
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Cek apakah email sudah ada
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "Email already in use." },
        { status: 409 } // Conflict
      );
    }

    // Get USER role
    const userRole = await prisma.role.findUnique({
      where: { name: "USER" },
    });

    if (!userRole) {
      return NextResponse.json(
        { message: "Default user role not found. Please run database seeding first." },
        { status: 500 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat pengguna baru dengan peran USER
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roleId: userRole.id, // Pengguna baru selalu menjadi USER
      },
    });

    // Jangan kirim data sensitif kembali
    return NextResponse.json(
      { message: "User created successfully. Please login." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "An error occurred during registration." },
      { status: 500 }
    );
  }
}
