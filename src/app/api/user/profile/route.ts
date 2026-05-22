import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      college: true,
      phone: true,
      trustScore: true,
      isAdmin: true,
      createdAt: true,
      ownedProducts: {
        select: {
          id: true,
          dppId: true,
          category: true,
          brand: true,
          model: true,
          status: true,
          conditionScore: true,
          activatedAt: true,
        },
        orderBy: { activatedAt: "desc" },
        take: 20,
      },
      sellerListings: {
        select: {
          id: true,
          askingPrice: true,
          listingStatus: true,
          createdAt: true,
          product: { select: { dppId: true, brand: true, model: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { ownedProducts: true, sellerListings: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone } = body;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name ? { name: String(name).trim() } : {}),
      ...(phone !== undefined ? { phone: String(phone).trim() || null } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      college: true,
      phone: true,
      trustScore: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: updated });
}
