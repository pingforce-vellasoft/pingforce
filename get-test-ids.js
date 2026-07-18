const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT
        'Super Admin'::text as role,
        email,
        id as account_id,
        'platform-level'::text as tenant_id
      FROM "SuperAdmin"
      WHERE email = 'superadmin@pingforce.in'
    `);

    const userRes = await pool.query(`
      SELECT
        r.code as role,
        u.email,
        u.id as account_id,
        u."tenantId"
      FROM "User" u
      JOIN "Role" r ON u."roleId" = r.id
      ORDER BY u.email
    `);

    const tenantRes = await pool.query(`
      SELECT
        'Tenant'::text as role,
        name as email,
        id as account_id,
        id as "tenantId"
      FROM "Tenant"
      LIMIT 1
    `);

    console.log('\n=== Test Account IDs ===\n');
    [...res.rows, ...userRes.rows, ...tenantRes.rows].forEach(row => {
      const tenantDisplay = row.tenant_id ? row.tenant_id.substring(0, 8) + '...' : 'N/A';
      const accountDisplay = row.account_id ? row.account_id.substring(0, 8) + '...' : 'N/A';
      console.log(`${row.role.padEnd(20)} | ${row.email.padEnd(35)} | Account ID: ${accountDisplay} | Workspace ID: ${tenantDisplay}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();