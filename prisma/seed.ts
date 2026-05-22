import { PrismaClient } from "@prisma/client";
import type { ProductCategory as PrismaProductCategory } from "@prisma/client";
const ProductCategory = {
  LAPTOP: 'LAPTOP',
  PHONE: 'PHONE',
  GAMING_CONSOLE: 'GAMING_CONSOLE',
  CYCLE: 'CYCLE',
  APPLIANCE: 'APPLIANCE',
  ACADEMIC_EQUIPMENT: 'ACADEMIC_EQUIPMENT',
  OTHER: 'OTHER',
} as const;
type ProductCategoryType = keyof typeof ProductCategory;

const ProductStatus = {
  UNCLAIMED: 'UNCLAIMED',
  ACTIVE: 'ACTIVE',
  LISTED: 'LISTED',
  TRANSFERRED: 'TRANSFERRED',
  RETIRED: 'RETIRED',
} as const;
type ProductStatusType = keyof typeof ProductStatus;

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import QRCode from "qrcode";

const adapter = new PrismaPg({
  connectionString: "postgresql://postgres.cjinnwjtxlxyhrbbkutz:Ankitech%40999@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
});
const prisma = new PrismaClient({ adapter });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function generateQrPng(dppId: string): Promise<string> {
  const url = `${BASE_URL}/activate/${dppId}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

async function main() {
  console.log("🌱 Seeding EcoXchange database...\n");

  // ─────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────
  const passwordHash = await hash("password123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@ecoxchange.in" },
    update: {},
    create: {
      name: "EcoXchange Admin",
      email: "admin@ecoxchange.in",
      college: "EcoXchange HQ",
      isAdmin: true,
      trustScore: 100,
    },
  });

  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: "credentials", providerAccountId: adminUser.id } },
    update: {},
    create: {
      userId: adminUser.id,
      type: "credentials",
      provider: "credentials",
      providerAccountId: adminUser.id,
      access_token: passwordHash,
    },
  });

  const users = await Promise.all([
    { name: "Rahul Kumar", email: "rahul@dtu.ac.in", college: "Delhi Technological University (DTU)", trustScore: 87 },
    { name: "Priya Sharma", email: "priya@nsut.ac.in", college: "NSUT (Netaji Subhas University of Technology)", trustScore: 91 },
    { name: "Arjun Mehta", email: "arjun@dtu.ac.in", college: "Delhi Technological University (DTU)", trustScore: 73 },
    { name: "Neha Singh", email: "neha@nsut.ac.in", college: "NSUT (Netaji Subhas University of Technology)", trustScore: 82 },
    { name: "Dev Patel", email: "dev@bits.ac.in", college: "BITS Pilani", trustScore: 94 },
  ].map(async (userData) => {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: { ...userData },
    });
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "credentials", providerAccountId: user.id } },
      update: {},
      create: {
        userId: user.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: user.id,
        access_token: passwordHash,
      },
    });
    return user;
  }));

  const [rahul, priya, arjun, neha, dev] = users;
  console.log("✅ Created 6 users (including admin)");

  // ─────────────────────────────────────────────
  // PRODUCTS
  // ─────────────────────────────────────────────
  const productSeeds = [
    {
      dppId: "ECO-LPT-2024-A8X3K9PQ",
      category: ProductCategory.LAPTOP,
      brand: "Apple",
      model: "MacBook Pro 14\"",
      color: "Space Gray",
      yearOfPurchase: 2023,
      status: ProductStatus.ACTIVE,
      conditionScore: 87,
      trustScore: 94,
      isVerified: true,
      currentOwner: priya,
      activatedAt: new Date("2023-03-15"),
      previousOwner: rahul,
      previousDate: new Date("2023-03-15"),
      transferDate: new Date("2024-01-10"),
    },
    {
      dppId: "ECO-PHN-2024-B2Y7M1NR",
      category: ProductCategory.PHONE,
      brand: "Samsung",
      model: "Galaxy S23 Ultra",
      color: "Phantom Black",
      yearOfPurchase: 2023,
      status: ProductStatus.LISTED,
      conditionScore: 72,
      trustScore: 78,
      isVerified: false,
      currentOwner: arjun,
      activatedAt: new Date("2023-06-20"),
    },
    {
      dppId: "ECO-GCN-2023-C5W4L8TS",
      category: ProductCategory.GAMING_CONSOLE,
      brand: "Sony",
      model: "PlayStation 5",
      color: "White",
      yearOfPurchase: 2022,
      status: ProductStatus.ACTIVE,
      conditionScore: 91,
      trustScore: 86,
      isVerified: true,
      currentOwner: dev,
      activatedAt: new Date("2022-12-01"),
    },
    {
      dppId: "ECO-LPT-2023-D1Z6P3UV",
      category: ProductCategory.LAPTOP,
      brand: "Dell",
      model: "XPS 15",
      color: "Silver",
      yearOfPurchase: 2022,
      status: ProductStatus.LISTED,
      conditionScore: 68,
      trustScore: 71,
      isVerified: false,
      currentOwner: neha,
      activatedAt: new Date("2022-08-10"),
    },
    {
      dppId: "ECO-CYC-2024-E9V2J7WX",
      category: ProductCategory.CYCLE,
      brand: "Trek",
      model: "FX 3 Disc",
      color: "Matte Black",
      yearOfPurchase: 2024,
      status: ProductStatus.ACTIVE,
      conditionScore: 96,
      trustScore: 85,
      isVerified: true,
      currentOwner: rahul,
      activatedAt: new Date("2024-02-14"),
    },
    {
      dppId: "ECO-PHN-2023-F4R8H0YZ",
      category: ProductCategory.PHONE,
      brand: "Apple",
      model: "iPhone 14 Pro",
      color: "Deep Purple",
      yearOfPurchase: 2022,
      status: ProductStatus.UNCLAIMED,
      conditionScore: 100,
      trustScore: 0,
      isVerified: false,
      currentOwner: null,
    },
    {
      dppId: "ECO-ACE-2024-G7Q1K5AB",
      category: ProductCategory.ACADEMIC_EQUIPMENT,
      brand: "Canon",
      model: "EOS R50",
      color: "Black",
      yearOfPurchase: 2023,
      status: ProductStatus.ACTIVE,
      conditionScore: 89,
      trustScore: 82,
      isVerified: true,
      currentOwner: priya,
      activatedAt: new Date("2023-07-20"),
    },
    {
      dppId: "ECO-LPT-2024-H6S3M2CD",
      category: ProductCategory.LAPTOP,
      brand: "Lenovo",
      model: "ThinkPad X1 Carbon",
      color: "Black",
      yearOfPurchase: 2023,
      status: ProductStatus.LISTED,
      conditionScore: 79,
      trustScore: 76,
      isVerified: false,
      currentOwner: dev,
      activatedAt: new Date("2023-04-05"),
    },
  ];

  for (const seed of productSeeds) {
    const qrPng = await generateQrPng(seed.dppId).catch(() => "");

    const product = await prisma.product.upsert({
      where: { dppId: seed.dppId },
      update: {},
      create: {
        dppId: seed.dppId,
        qrCodeUrl: qrPng,
        category: seed.category,
        brand: seed.brand,
        model: seed.model,
        color: seed.color,
        yearOfPurchase: seed.yearOfPurchase,
        status: seed.status,
        conditionScore: seed.conditionScore,
        trustScore: seed.trustScore,
        isVerified: seed.isVerified,
        currentOwnerId: seed.currentOwner?.id,
        activatedAt: seed.activatedAt,
      },
    });

    // Create initial ownership history (activation)
    if (seed.currentOwner && seed.activatedAt) {
      const firstOwner = (seed as { previousOwner?: typeof rahul }).previousOwner ?? seed.currentOwner;
      const existing = await prisma.ownershipHistory.findFirst({ where: { productId: product.id, transferType: "ACTIVATION" } });
      if (!existing) {
        await prisma.ownershipHistory.create({
          data: {
            productId: product.id,
            previousOwnerId: null,
            newOwnerId: firstOwner.id,
            transferType: "ACTIVATION",
            transferDate: seed.activatedAt,
            notes: "Initial product activation",
          },
        });
      }

      // Add a transfer if applicable
      if ((seed as { previousOwner?: typeof rahul }).previousOwner && seed.currentOwner.id !== (seed as { previousOwner?: typeof rahul }).previousOwner?.id) {
        const transferExists = await prisma.ownershipHistory.findFirst({ where: { productId: product.id, transferType: "SALE" } });
        if (!transferExists) {
          await prisma.ownershipHistory.create({
            data: {
              productId: product.id,
              previousOwnerId: (seed as { previousOwner?: typeof rahul }).previousOwner?.id,
              newOwnerId: seed.currentOwner.id,
              transferType: "SALE",
              transferDate: (seed as { transferDate?: Date }).transferDate ?? new Date(),
              notes: "Sold via EcoXchange marketplace",
            },
          });
        }
      }
    }

    // Add repair logs for active products
    if (seed.status !== ProductStatus.UNCLAIMED && seed.currentOwner) {
      const repairExists = await prisma.repairLog.findFirst({ where: { productId: product.id } });
      if (!repairExists && seed.conditionScore < 90) {
        await prisma.repairLog.create({
          data: {
            productId: product.id,
            loggedById: seed.currentOwner.id,
            repairType: "BATTERY",
            repairShop: "TechFix Delhi",
            repairNotes: "Battery replaced, performance restored",
            repairCost: 2400,
          },
        });
      }
    }

    // Add invoice document
    if (seed.isVerified && seed.currentOwner) {
      const docExists = await prisma.productDocument.findFirst({ where: { productId: product.id } });
      if (!docExists) {
        await prisma.productDocument.create({
          data: {
            productId: product.id,
            documentType: "INVOICE",
            documentUrl: `https://example.com/invoices/${seed.dppId}.pdf`,
            fileName: `invoice_${seed.dppId}.pdf`,
            isVerified: true,
          },
        });
      }
    }

    // Create marketplace listing for LISTED products
    if (seed.status === ProductStatus.LISTED && seed.currentOwner) {
      const listingExists = await prisma.marketplaceListing.findFirst({ where: { productId: product.id, listingStatus: "ACTIVE" } });
      if (!listingExists) {
        const prices: Record<string, number> = {
          "ECO-PHN-2024-B2Y7M1NR": 45000,
          "ECO-LPT-2023-D1Z6P3UV": 72000,
          "ECO-LPT-2024-H6S3M2CD": 89000,
        };
        await prisma.marketplaceListing.create({
          data: {
            productId: product.id,
            sellerId: seed.currentOwner.id,
            askingPrice: prices[seed.dppId] ?? 30000,
            description: `${seed.brand} ${seed.model} in good condition. Complete DPP history available.`,
            condition: seed.conditionScore >= 80 ? "Good" : "Fair",
          },
        });
      }
    }

    // Admin verification action
    if (seed.isVerified) {
      const actionExists = await prisma.adminAction.findFirst({ where: { productId: product.id, actionType: "PRODUCT_VERIFIED" } });
      if (!actionExists) {
        await prisma.adminAction.create({
          data: {
            adminId: adminUser.id,
            productId: product.id,
            actionType: "PRODUCT_VERIFIED",
            notes: "Invoice verified, product authenticated",
          },
        });
      }
    }

    console.log(`✅ Product: ${seed.dppId} (${seed.brand} ${seed.model})`);
  }

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin: admin@ecoxchange.in / password123");
  console.log("   User:  rahul@dtu.ac.in / password123");
  console.log("   User:  priya@nsut.ac.in / password123");
  console.log("\n🔗 Test passport URLs:");
  productSeeds.slice(0, 3).forEach((p) => {
    console.log(`   ${BASE_URL}/passport/${p.dppId}`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
