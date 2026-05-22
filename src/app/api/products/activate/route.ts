import { NextResponse } from "next/server";
import { auth } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { generateQrPng, generateQrSvg, generateQrSticker, generateDppId } from "@/lib/qr";

// GET /api/products/activate?dppId=... — Get product for activation page
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dppId = searchParams.get("dppId");

  if (!dppId) {
    return NextResponse.json({ error: "DPP ID required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { dppId },
    include: { currentOwner: { select: { name: true } } },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

// POST /api/products/activate — Activate a product
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { dppId, purchaseDate, invoiceUrl } = body;

  if (!dppId) {
    return NextResponse.json({ error: "DPP ID required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { dppId } });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.status !== "UNCLAIMED") {
    return NextResponse.json(
      { error: "This product has already been activated" },
      { status: 409 }
    );
  }

  // Activate product and create ownership record atomically
  const [updatedProduct] = await prisma.$transaction([
    prisma.product.update({
      where: { dppId },
      data: {
        status: "ACTIVE",
        currentOwnerId: session.user.id,
        activatedAt: new Date(),
        yearOfPurchase: purchaseDate
          ? new Date(purchaseDate).getFullYear()
          : undefined,
        trustScore: invoiceUrl ? 50 : 30, // Higher trust with invoice
      },
    }),
    prisma.ownershipHistory.create({
      data: {
        productId: product.id,
        previousOwnerId: null,
        newOwnerId: session.user.id,
        transferType: "ACTIVATION",
        notes: "Initial product activation",
      },
    }),
  ]);

  // Upload invoice document if provided
  if (invoiceUrl) {
    await prisma.productDocument.create({
      data: {
        productId: product.id,
        documentType: "INVOICE",
        documentUrl: invoiceUrl,
        isVerified: false,
      },
    });
  }

  return NextResponse.json({
    success: true,
    product: updatedProduct,
    message: "Product activated successfully",
  });
}

// POST /api/products/generate — Admin: generate new DPP + QR
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { category, brand, model, serialNumber, color } = body;

  if (!category) {
    return NextResponse.json({ error: "Category required" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dppId = generateDppId(category);

  const [qrPng, qrSvg, qrSticker] = await Promise.all([
    generateQrPng(dppId, baseUrl),
    generateQrSvg(dppId, baseUrl),
    generateQrSticker(dppId, baseUrl),
  ]);

  const product = await prisma.product.create({
    data: {
      dppId,
      qrCodeUrl: qrPng,
      qrCodeSvg: qrSticker,
      category,
      brand,
      model,
      serialNumber,
      color,
      status: "UNCLAIMED",
    },
  });

  // Log admin action
  await prisma.adminAction.create({
    data: {
      adminId: session.user.id,
      productId: product.id,
      actionType: "QR_ISSUED",
      notes: `QR generated for ${category} - ${brand} ${model}`,
    },
  });

  return NextResponse.json({
    success: true,
    product,
    qrPng,
    qrSvg,
    qrSticker,
  });
}

