const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.cjinnwjtxlxyhrbbkutz:Ankitech%40999@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query(`SELECT * FROM marketplace_listings LIMIT 1`);
  if (res.rows.length > 0) {
    console.log('Row keys:', Object.keys(res.rows[0]));
    
    // Dynamically build the update query using the EXACT key name!
    const keys = Object.keys(res.rows[0]);
    const extUrlKey = keys.find(k => k.toLowerCase() === 'externalurl');
    
    if (extUrlKey) {
      console.log('Found column:', extUrlKey);
      const updateRes = await client.query(`
        UPDATE marketplace_listings 
        SET "${extUrlKey}" = REPLACE("${extUrlKey}", 'campuskartt1.netlify.app', 'campuskartt-newacc.vercel.app')
        WHERE "${extUrlKey}" LIKE '%campuskartt1.netlify.app%'
      `);
      console.log('Updated rows:', updateRes.rowCount);
    }
  }
  await client.end();
}
main().catch(console.error);
