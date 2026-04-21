// File: app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
// Hapus 'PrismaClient' dari impor di sini
import bcrypt from "bcryptjs";
import { getAuthFromCookie, getAuthFromHeader } from "@/lib/auth";

// highlight-start
// GANTI baris 'new PrismaClient()' DENGAN IMPORT DARI lib/prisma
import { prisma } from "@/lib/prisma";
// highlight-end

// PUT (update) pengguna
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check both cookie (web) and Authorization header (mobile)
  let auth = await getAuthFromCookie(request);
  if (!auth) {
    auth = await getAuthFromHeader(request);
  }

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    // ✨ Tambahkan phoneNumber di sini
    const { email, password, roleId, phoneNumber } = await request.json();
    const dataToUpdate: any = {};

    if (email) dataToUpdate.email = email;
    if (roleId) dataToUpdate.roleId = roleId;  //  FIXED: Use roleId, not role
    if (phoneNumber !== undefined) {
      dataToUpdate.phoneNumber = phoneNumber;
    }

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Email sudah terdaftar pada pengguna lain" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate pengguna" },
      { status: 500 }
    );
  }
}

// DELETE pengguna
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check both cookie (web) and Authorization header (mobile)
  let auth = await getAuthFromCookie(request);
  if (!auth) {
    auth = await getAuthFromHeader(request);
  }

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (auth.userId === id) {
      return NextResponse.json(
        { message: "Anda tidak dapat menghapus akun Anda sendiri" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus pengguna" },
      { status: 500 }
    );
  }
}
