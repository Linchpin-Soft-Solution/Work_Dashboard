import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, email, role, designation, baseMonthlySalary, isActive, password } = body;

    if (email && !email.endsWith("@linchpinsoftsolution.com")) {
      return NextResponse.json({ error: "Email must be a @linchpinsoftsolution.com address" }, { status: 400 });
    }

    const dataToUpdate: any = {
      name,
      email,
      role,
      designation,
      baseMonthlySalary: baseMonthlySalary !== undefined ? parseFloat(baseMonthlySalary) : undefined,
      isActive,
    };

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    // Filter out undefined values
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Soft delete by setting isActive to false
    const deletedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(deletedUser);
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
