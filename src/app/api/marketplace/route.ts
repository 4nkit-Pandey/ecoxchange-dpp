import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

// ── CampusKartt Supabase (anon key — public data only, active listings) ────
const CK_URL     = "https://edzicxebgtiosahshvgi.supabase.co";
const CK_ANON    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkemljeGViZ3Rpb3NhaHNodmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDIxMzIsImV4cCI6MjA5MDYxODEzMn0._gV35IiY97ufGvHMGDEZHiT0zISIaugK8tk90IJiJDE";

const CK_CONDITION_SCORE: Record<string, number> = {
  like_new: 95, good: 75, fair: 55, old: 30,
};
const CK_CATEGORY_MAP: Record<string, string> = {
  textbooks: "ACADEMIC_EQUIPMENT", drafter: "ACADEMIC_EQUIPMENT",
  bicycle: "CYCLE", chair: "APPLIANCE", lamp: "APPLIANCE",
  calculator: "ACADEMIC_EQUIPMENT", drawer: "APPLIANCE",
  electronics: "LAPTOP", sports: "OTHER",
};

async function fetchCampusKarttListings() {
  try {
    const res = await fetch(
      `${CK_URL}/rest/v1/listings?select=*,users(full_name,university)&status=eq.active&order=created_at.desc&limit=20`,
      {
        headers: {
          apikey: CK_ANON,
          Authorization: `Bearer ${CK_ANON}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 0 }, // always fresh — no stale URL caching
      }
    );
    if (!res.ok) return [];
    const rows: any[] = await res.json();

    return rows.map((row) => {
      const condScore = CK_CONDITION_SCORE[row.condition] ?? 60;
      const trustScore = Math.max(
        30,
        Math.round(condScore * 0.5 + (row.reuse_count ?? 0) * 5)
      );

      return {
        id:           `ck-${row.id}`,
        askingPrice:  Number(row.price),
        description:  row.description ?? null,
        createdAt:    row.created_at,
        source:       "CAMPUSKARTT",
        externalId:   String(row.id),
        externalUrl:  `https://www.campuskartt.in/app/listing.html?id=${row.id}`,
        externalImage: row.photo_url ?? null,
        sellerLabel:  row.users?.full_name ?? "CampusKartt Seller",
        externalTrustScore: trustScore,
        product: {
          dppId:      `CK-${row.id}`,
          category:   CK_CATEGORY_MAP[row.category] ?? "OTHER",
          brand:      "CampusKartt",
          model:      row.title,
          conditionScore: condScore,
          trustScore,
          isVerified: false,
          ownershipHistory: Array.from({ length: Math.max(1, row.reuse_count ?? 0) }, (_, i) => ({ id: String(i) })),
          repairLogs: [],
        },
        seller: {
          name:       row.users?.full_name ?? "CampusKartt Seller",
          college:    row.users?.university ?? row.university ?? "Campus",
          trustScore,
        },
      };
    });
  } catch {
    return []; // non-fatal — marketplace still shows EcoXchange listings
  }
}

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

  const [listings, total, campusKarttListings] = await Promise.all([
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
    // Fetch live CampusKartt listings on every request (cached 60s)
    fetchCampusKarttListings(),
  ]);

  // Increment view count (fire-and-forget)
  Promise.all(
    listings.map((l) =>
      prisma.marketplaceListing.update({
        where: { id: l.id },
        data: { viewCount: { increment: 1 } },
      })
    )
  ).catch(() => {});

  // Normalise EcoXchange listings
  const normalizedEco = listings.map((l) => ({
    ...l,
    source: l.source ?? "ECOXCHANGE",
    seller: l.seller ?? {
      name: l.sellerLabel ?? "CampusKartt",
      college: "Campus Kartt",
      trustScore: l.externalTrustScore ?? 70,
    },
  }));

  // Filter CampusKartt listings by category if a filter is active
  const filteredCK = category && category !== "ALL"
    ? campusKarttListings.filter(
        (l) => l.product.category === category
      )
    : campusKarttListings;

  // Merge: EcoXchange first, then CampusKartt
  const allListings = [...normalizedEco, ...filteredCK];

  return NextResponse.json({
    listings: allListings,
    pagination: {
      page,
      limit,
      total: total + filteredCK.length,
      pages: Math.ceil((total + filteredCK.length) / limit),
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

