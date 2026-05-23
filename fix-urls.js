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

  const rows = await client.query(`SELECT id, externalurl FROM marketplace_listings WHERE externalurl LIKE '%netlify%' LIMIT 10`);
  console.log('Rows with netlify URL:', rows.rows.length);
  rows.rows.forEach(r => console.log(' -', r.id, r.externalurl));

  if (rows.rows.length > 0) {
    const fix = await client.query(`
      UPDATE marketplace_listings 
      SET externalurl = REPLACE(externalurl, 'campuskartt1.netlify.app', 'campuskartt-newacc.vercel.app')
      WHERE externalurl LIKE '%campuskartt1.netlify.app%'
    `);
    console.log('Fixed', fix.rowCount, 'rows');
  }

  await client.end();
}
main().catch(e => console.error('ERROR:', e.message));
