import {neon} from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local','utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);
const sql = neon(env.DATABASE_URL);
sql`SELECT id, role FROM users`.then(r => console.log(JSON.stringify(r))).catch(e => console.error(e.message));
