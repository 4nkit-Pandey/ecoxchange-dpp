const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const listings = await prisma.marketplaceListing.findMany({
    where: {
      externalUrl: {
        contains: 'campuskartt1.netlify.app'
      }
    }
  });

  console.log(`Found ${listings.length} listings with old Netlify URL.`);

  for (const listing of listings) {
    const newUrl = listing.externalUrl.replace('campuskartt1.netlify.app', 'campuskartt-newacc.vercel.app');
    await prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: { externalUrl: newUrl }
    });
    console.log(`Updated ${listing.id}`);
  }

  console.log('Done!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
