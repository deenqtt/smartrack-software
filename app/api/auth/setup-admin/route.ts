// File: app/api/auth/setup-admin/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";


export async function GET() {
  try {
    // 1. Get ADMIN role
    const adminRole = await prisma.role.findUnique({
      where: { name: "ADMIN" },
    });

    // 2. Cek apakah sudah ada admin di database
    const existingAdmin = await prisma.user.findFirst({
      where: { roleId: adminRole?.id },
    });

    if (!adminRole) {
      return NextResponse.json(
        { message: "Admin role not found. Please run database seeding first." },
        { status: 500 }
      );
    }

    // 2. Jika sudah ada, kembalikan error untuk mencegah pembuatan admin ganda
    if (existingAdmin) {
      return NextResponse.json(
        { message: "Admin user already exists." },
        { status: 409 } // 409 Conflict
      );
    }

    // 3. Buat password acak yang aman untuk admin pertama
    const generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // 4. Simpan admin baru ke database
    await prisma.user.create({
      data: {
        email: "admin@example.com",
        password: hashedPassword,
        roleId: adminRole.id,
      },
    });

    // 5. Tampilkan password di log server. Ini hanya akan muncul sekali.
    // Pengguna harus segera login dan mengganti password ini.
    console.log("===================================");
    console.log("ADMIN USER CREATED SUCCESSFULLY");
    console.log("Email: admin@example.com");
    console.log("Password:", generatedPassword);
    console.log("===================================");

    return NextResponse.json({
      message:
        "Admin user created successfully. Check server logs for password.",
    });
  } catch (error) {
    console.error("Failed to setup admin user:", error);
    return NextResponse.json(
      { message: "Failed to setup admin user." },
      { status: 500 }
    );
  }
}
