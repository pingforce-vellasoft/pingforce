const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT code FROM "Tenant"');
  console.log('Tenants in DB:', res.rows);
  await client.end();
}
main().catch(console.error);
