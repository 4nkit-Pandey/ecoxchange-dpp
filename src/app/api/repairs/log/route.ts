import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

// POST /api/repairs/log — Log a repair for a product
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { dppId, repairType, repairShop, repairNotes, repairCost, receiptUrl } = body;

  if (!dppId || !repairType) {
    return NextResponse.json({ error: "Product and repair type required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { dppId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  if (product.currentOwnerId !== session.user.id) {
    return NextResponse.json(
      { error: "Only the current owner can log repairs" },
      { status: 403 }
    );
  }

  // Condition impact per repair type
  const conditionImpact: Record<string, number> = {
    HARDWARE: -5,
    SOFTWARE: -1,
    COSMETIC: -3,
    BATTERY: -4,
    SCREEN: -8,
    WATER_DAMAGE: -15,
    OTHER: -2,
  };

  const impact = conditionImpact[repairType] ?? -3;
  const newCondition = Math.max(0, product.conditionScore + impact);

  const [repair] = await prisma.$transaction([
    prisma.repairLog.create({
      data: {
        productId: product.id,
        loggedById: session.user.id,
        repairType,
        repairShop,
        repairNotes,
        repairCost: repairCost ? parseFloat(String(repairCost)) : undefined,
        receiptUrl,
      },
      include: {
        product: {
          select: { dppId: true, brand: true, model: true, category: true },
        },
      },
    }),
    prisma.product.update({
      where: { id: product.id },
      data: { conditionScore: newCondition },
    }),
  ]);

  return NextResponse.json({ success: true, repair });
}

// GET /api/repairs/log — Get repairs (for current user if no dppId, or for specific product)
export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const dppId = searchParams.get("dppId");

  // If dppId provided — public product repair history
  if (dppId) {
    const product = await prisma.product.findUnique({ where: { dppId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const repairs = await prisma.repairLog.findMany({
      where: { productId: product.id },
      include: {
        loggedBy: { select: { name: true } },
        product: { select: { dppId: true, brand: true, model: true, category: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ repairs });
  }

  // No dppId — return all repairs for the current user
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const repairs = await prisma.repairLog.findMany({
    where: { loggedById: session.user.id },
    include: {
      product: { select: { dppId: true, brand: true, model: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ repairs });
}
