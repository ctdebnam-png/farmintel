import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://farmintel:farmintel@localhost:5432/farmintel',
});

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create default org
    const orgResult = await client.query(`
      INSERT INTO organizations (name, slug)
      VALUES ('TD Realty Ohio', 'td-realty-ohio')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const orgId = orgResult.rows[0].id;

    // Create demo user
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword('demo1234', salt);

    const userResult = await client.query(`
      INSERT INTO users (email, name, password_hash, password_salt)
      VALUES ('demo@tdrealty.com', 'Demo User', $1, $2)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [hash, salt]);
    const userId = userResult.rows[0].id;

    // Create membership
    await client.query(`
      INSERT INTO memberships (user_id, org_id, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT (user_id, org_id) DO UPDATE SET role = EXCLUDED.role
    `, [userId, orgId]);

    await client.query('COMMIT');
    console.log('Seed complete.');
    console.log('  Demo login: demo@tdrealty.com / demo1234');
    console.log(`  Org: TD Realty Ohio (${orgId})`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
