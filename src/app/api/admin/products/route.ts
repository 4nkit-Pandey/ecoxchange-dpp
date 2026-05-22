import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/products — All products with filters
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (category && category !== "ALL") where.category = category;
  if (search) {
    where.OR = [
      { dppId: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        currentOwner: { select: { name: true, email: true, college: true } },
        _count: { select: { ownershipHistory: true, repairLogs: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

// PATCH /api/admin/products — Verify or flag a product
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { productId, action, notes } = body; // action: "verify" | "flag" | "unflag"

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  let actionType: "PRODUCT_VERIFIED" | "PRODUCT_FLAGGED";

  if (action === "verify") {
    updateData.isVerified = true;
    updateData.trustScore = Math.min(100, product.trustScore + 20);
    actionType = "PRODUCT_VERIFIED";
  } else if (action === "flag") {
    updateData.isFlagged = true;
    actionType = "PRODUCT_FLAGGED";
  } else if (action === "unflag") {
    updateData.isFlagged = false;
    actionType = "PRODUCT_FLAGGED"; // Reuse type
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: updateData }),
    prisma.adminAction.create({
      data: { adminId: session.user.id, productId, actionType, notes },
    }),
  ]);

  return NextResponse.json({ success: true });
}

