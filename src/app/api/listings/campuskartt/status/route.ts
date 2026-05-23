import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.CAMPUSKARTT_WEBHOOK_SECRET || "ck-eco-webhook-secret-2024";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-ecoxchange-secret");
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { externalId, status } = body;

    if (!externalId || !status) {
      return NextResponse.json({ error: "Missing externalId or status" }, { status: 400 });
    }

    const listing = await prisma.marketplaceListing.findFirst({
      where: { externalId: String(externalId), source: "CAMPUSKARTT" },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const newStatus = status === "sold" ? "SOLD" : "CANCELLED";

    await prisma.$transaction([
      prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: {
          listingStatus: newStatus,
          soldAt: newStatus === "SOLD" ? new Date() : undefined,
        },
      }),
      // Also update dummy product status
      prisma.product.update({
        where: { id: listing.productId },
        data: { status: newStatus === "SOLD" ? "TRANSFERRED" : "RETIRED" },
      }),
    ]);

    return NextResponse.json({ success: true, listingId: listing.id, newStatus });
  } catch (error) {
    console.error("[CampusKartt Status Webhook Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
