import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

// GET /api/marketplace — Public marketplace feed
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 12;

  const where: Record<string, unknown> = { listingStatus: "ACTIVE" };
  if (category && category !== "ALL") {
    where.product = { category };
  }
  if (minPrice || maxPrice) {
    where.askingPrice = {
      ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
      ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
    };
  }

  const [listings, total] = await Promise.all([
    prisma.marketplaceListing.findMany({
      where,
      include: {
        product: {
          select: {
            dppId: true,
            category: true,
            brand: true,
            model: true,
            conditionScore: true,
            trustScore: true,
            isVerified: true,
            qrCodeUrl: true,
            ownershipHistory: { select: { id: true } },
            repairLogs: { select: { id: true } },
          },
        },
        seller: { select: { name: true, college: true, trustScore: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.marketplaceListing.count({ where }),
  ]);

  // Increment view count for returned listings (fire-and-forget)
  Promise.all(
    listings.map((l) =>
      prisma.marketplaceListing.update({
        where: { id: l.id },
        data: { viewCount: { increment: 1 } },
      })
    )
  ).catch(() => {});

  // Normalize listings — merge CampusKartt external fields into response
  const normalizedListings = listings.map((l) => ({
    ...l,
    // For CampusKartt listings: override seller display
    seller: l.seller ?? {
      name: l.sellerLabel ?? "CampusKartt",
      college: "Campus Kartt",
      trustScore: l.externalTrustScore ?? 70,
    },
  }));

  return NextResponse.json({
    listings: normalizedListings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}


// POST /api/marketplace — Create a new listing
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { dppId, askingPrice, originalPrice, description, condition } = body;

  if (!dppId || !askingPrice) {
    return NextResponse.json({ error: "Product and asking price required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { dppId },
    include: { listings: { where: { listingStatus: "ACTIVE" } } },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.currentOwnerId !== session.user.id) {
    return NextResponse.json({ error: "You do not own this product" }, { status: 403 });
  }

  if (product.listings.length > 0) {
    return NextResponse.json({ error: "Product already has an active listing" }, { status: 409 });
  }

  const [listing] = await prisma.$transaction([
    prisma.marketplaceListing.create({
      data: {
        productId: product.id,
        sellerId: session.user.id,
        askingPrice: parseFloat(askingPrice),
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        description,
        condition,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    }),
    prisma.product.update({
      where: { id: product.id },
      data: { status: "LISTED" },
    }),
  ]);

  return NextResponse.json({ success: true, listing });
}

