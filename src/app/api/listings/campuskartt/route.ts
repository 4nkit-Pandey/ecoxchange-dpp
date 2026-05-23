import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.CAMPUSKARTT_WEBHOOK_SECRET || "ck-eco-webhook-secret-2024";

// Trust score based on condition
function conditionToTrustScore(condition: string): number {
  switch (condition) {
    case "like_new": return 85;
    case "good":     return 70;
    case "fair":     return 55;
    case "old":      return 40;
    default:         return 65;
  }
}

// Map CampusKartt category to EcoXchange ProductCategory
function mapCategory(ckCategory: string): string {
  const map: Record<string, string> = {
    textbooks:    "ACADEMIC_EQUIPMENT",
    drafter:      "ACADEMIC_EQUIPMENT",
    lab:          "ACADEMIC_EQUIPMENT",
    electronics:  "ACADEMIC_EQUIPMENT",
    hostel:       "OTHER",
    bicycle:      "CYCLE",
    sports:       "OTHER",
  };
  return map[ckCategory] || "OTHER";
}

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.headers.get("x-ecoxchange-secret");
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      externalId,
      externalUrl,
      title,
      description,
      category,
      price,
      condition,
      imageUrl,
    } = body;

    if (!externalId || !title || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check for duplicate (idempotency)
    const prismaClient = prisma;
    const existing = await prismaClient.marketplaceListing.findFirst({
      where: { externalId: String(externalId) },
    });
    if (existing) {
      return NextResponse.json({ listingId: existing.id, duplicate: true });
    }

    const trustScore = conditionToTrustScore(condition || "good");
    const ecoCategory = mapCategory(category || "electronics");

    // Create a dummy Product record for this CampusKartt listing
    const dummyProduct = await prismaClient.product.create({
      data: {
        dppId:         `CK-${externalId}`,
        category:      ecoCategory as any,
        brand:         "CampusKartt",
        model:         title,
        status:        "LISTED",
        conditionScore: trustScore,
        trustScore:    trustScore,
        isVerified:    false,
        activatedAt:   new Date(),
      },
    });

    // Create the marketplace listing
    const listing = await prismaClient.marketplaceListing.create({
      data: {
        productId:          dummyProduct.id,
        askingPrice:        Number(price),
        description:        description || title,
        condition:          condition || "good",
        source:             "CAMPUSKARTT",
        externalId:         String(externalId),
        externalUrl:        externalUrl || `https://www.campuskartt.in/app/listing.html?id=${externalId}`,
        externalImage:      imageUrl || null,
        sellerLabel:        "CampusKartt",
        externalTrustScore: trustScore,
        expiresAt:          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ listingId: listing.id, success: true }, { status: 201 });
  } catch (error) {
    console.error("[CampusKartt Webhook Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
