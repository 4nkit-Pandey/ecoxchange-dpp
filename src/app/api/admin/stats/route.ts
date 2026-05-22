import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/stats — Platform statistics
export async function GET() {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const [
    totalUsers,
    totalProducts,
    activeProducts,
    listedProducts,
    totalTransfers,
    totalRepairs,
    totalListings,
    recentProducts,
    recentUsers,
    categoryBreakdown,
    statusBreakdown,
    recentActions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.product.count({ where: { status: "LISTED" } }),
    prisma.ownershipHistory.count({ where: { transferType: { in: ["SALE", "GIFT"] } } }),
    prisma.repairLog.count(),
    prisma.marketplaceListing.count(),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { currentOwner: { select: { name: true } } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, college: true, trustScore: true, createdAt: true },
    }),
    prisma.product.groupBy({
      by: ["category"],
      _count: { category: true },
    }),
    prisma.product.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.adminAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        admin: { select: { name: true } },
        product: { select: { dppId: true, brand: true, model: true } },
      },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalUsers,
      totalProducts,
      activeProducts,
      listedProducts,
      unclaimedProducts: totalProducts - activeProducts - listedProducts,
      totalTransfers,
      totalRepairs,
      totalListings,
    },
    recentProducts,
    recentUsers,
    categoryBreakdown,
    statusBreakdown,
    recentActions,
  });
}

