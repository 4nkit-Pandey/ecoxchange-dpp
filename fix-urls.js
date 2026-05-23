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

  // Update stored listing URLs in marketplace_listings table
  const r1 = await client.query(`
    UPDATE marketplace_listings 
    SET external_url = REPLACE(external_url, 'campuskartt1.netlify.app', 'campuskartt-newacc.vercel.app')
    WHERE external_url LIKE '%campuskartt1.netlify.app%'
    RETURNING id, external_url
  `);
  console.log(`Updated ${r1.rows.length} marketplace_listings rows`);
  r1.rows.forEach(r => console.log(' -', r.external_url));

  await client.end();
}
main().catch(e => console.error('ERROR:', e.message));
