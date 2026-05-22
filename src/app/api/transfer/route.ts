import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

// POST /api/transfer/initiate — Seller or buyer initiates transfer request
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { dppId, listingId, offeredPrice } = body;

  if (!dppId) {
    return NextResponse.json({ error: "DPP ID required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { dppId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Check if buyer is trying to buy their own product
  if (product.currentOwnerId === session.user.id) {
    return NextResponse.json({ error: "You cannot buy your own product" }, { status: 400 });
  }

  // Check existing pending transfers
  const existingTransfer = await prisma.transferRequest.findFirst({
    where: { productId: product.id, status: "PENDING" },
  });

  if (existingTransfer) {
    return NextResponse.json({ error: "A transfer is already in progress" }, { status: 409 });
  }

  const transfer = await prisma.transferRequest.create({
    data: {
      productId: product.id,
      listingId,
      sellerId: product.currentOwnerId!,
      buyerId: session.user.id,
      offeredPrice: offeredPrice ? parseFloat(offeredPrice) : undefined,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    },
  });

  return NextResponse.json({ success: true, transfer });
}

// PATCH /api/transfer/initiate — Seller confirms or cancels transfer
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { transferId, action } = body; // action: "confirm" | "cancel"

  if (!transferId || !action) {
    return NextResponse.json({ error: "Transfer ID and action required" }, { status: 400 });
  }

  const transfer = await prisma.transferRequest.findUnique({
    where: { id: transferId },
    include: { product: true },
  });

  if (!transfer) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  if (transfer.sellerId !== session.user.id) {
    return NextResponse.json({ error: "Only the seller can confirm this transfer" }, { status: 403 });
  }

  if (transfer.status !== "PENDING") {
    return NextResponse.json({ error: "Transfer is no longer pending" }, { status: 409 });
  }

  if (action === "cancel") {
    await prisma.transferRequest.update({
      where: { id: transferId },
      data: { status: "CANCELLED" },
    });
    // Revert product status if it was LISTED
    if (transfer.product.status === "LISTED") {
      await prisma.product.update({
        where: { id: transfer.productId },
        data: { status: "ACTIVE" },
      });
    }
    return NextResponse.json({ success: true, message: "Transfer cancelled" });
  }

  if (action === "confirm") {
    // Execute the full ownership transfer atomically
    const now = new Date();
    await prisma.$transaction([
      // Update transfer status
      prisma.transferRequest.update({
        where: { id: transferId },
        data: { status: "CONFIRMED", sellerConfirmedAt: now, buyerConfirmedAt: now },
      }),
      // Update product ownership
      prisma.product.update({
        where: { id: transfer.productId },
        data: {
          currentOwnerId: transfer.buyerId,
          status: "ACTIVE",
        },
      }),
      // Append to ownership history
      prisma.ownershipHistory.create({
        data: {
          productId: transfer.productId,
          previousOwnerId: transfer.sellerId,
          newOwnerId: transfer.buyerId,
          transferType: transfer.listingId ? "SALE" : "GIFT",
          notes: "Ownership transferred via EcoXchange",
          transactionRef: transfer.listingId ?? undefined,
        },
      }),
      // Mark listing as sold if applicable
      ...(transfer.listingId
        ? [
            prisma.marketplaceListing.update({
              where: { id: transfer.listingId },
              data: { listingStatus: "SOLD", soldAt: now },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      success: true,
      message: "Ownership transferred successfully",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

