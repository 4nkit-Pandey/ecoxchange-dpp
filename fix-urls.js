const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.cjinnwjtxlxyhrbbkutz',
  password: 'Ankitech@999',
  ssl: { rejectUnauthorized: false }
});
async function main() {
  await client.connect();

  // First, check what columns exist in marketplace_listings
  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'marketplace_listings' AND table_schema = 'public'
    ORDER BY column_name
  `);
  console.log('Columns:', cols.rows.map(r => r.column_name).join(', '));

  // Check current externalUrl values
  const rows = await client.query(`SELECT id, "externalUrl" FROM marketplace_listings WHERE "externalUrl" LIKE '%netlify%' LIMIT 5`);
  console.log('\nRows with netlify URL:', rows.rows.length);
  rows.rows.forEach(r => console.log(' -', r.id, r.externalUrl));

  // Fix them
  if (rows.rows.length > 0) {
    const fix = await client.query(`
      UPDATE marketplace_listings 
      SET "externalUrl" = REPLACE("externalUrl", 'campuskartt1.netlify.app', 'campuskartt-newacc.vercel.app')
      WHERE "externalUrl" LIKE '%campuskartt1.netlify.app%'
    `);
    console.log('\nFixed', fix.rowCount, 'rows');
  }

  await client.end();
}
main().catch(e => console.error('ERROR:', e.message));
