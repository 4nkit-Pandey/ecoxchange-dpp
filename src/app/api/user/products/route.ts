import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { currentOwnerId: session.user.id },
    include: {
      _count: { select: { ownershipHistory: true, repairLogs: true } },
      listings: {
        where: { listingStatus: "ACTIVE" },
        select: { askingPrice: true },
      },
    },
    orderBy: { activatedAt: "desc" },
  });

  return NextResponse.json({ products });
}

