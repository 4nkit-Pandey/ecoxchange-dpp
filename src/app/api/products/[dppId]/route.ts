import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dppId: string }> }
) {
  const { dppId } = await params;

  const product = await prisma.product.findUnique({
    where: { dppId },
    include: {
      currentOwner: {
        select: { id: true, name: true, college: true, trustScore: true, createdAt: true },
      },
      ownershipHistory: {
        include: {
          newOwner: { select: { name: true, college: true } },
        },
        orderBy: { transferDate: "desc" },
      },
      repairLogs: {
        include: { loggedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
      listings: {
        where: { listingStatus: "ACTIVE" },
        include: { seller: { select: { name: true, trustScore: true } } },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}
