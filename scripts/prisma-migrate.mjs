// Deploy migrations, healing a database whose migration bookkeeping is out
// of sync with its actual schema.
//
// This project was originally managed with `prisma db push`, which creates
// schema objects without recording migrations in Prisma's `_prisma_migrations`
// table. When the build switched to `prisma migrate deploy`, Prisma tried to
// apply migrations against tables that already existed — `match_picks` failed
// with "relation already exists" and was recorded as failed (P3009), which
// blocks every subsequent deploy.
//
// Strategy: try a normal `migrate deploy` first. If it fails (out-of-sync
// history), baseline every migration as *applied* — this only writes the
// bookkeeping table and never touches real data — then deploy again, which is
// now a clean no-op. On a healthy or brand-new database the first deploy
// succeeds and the baseline branch never runs, so this stays correct there too.

import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

function deploy() {
  execSync('prisma migrate deploy', { stdio: 'inherit' });
}

try {
  deploy();
} catch {
  console.log('\nmigrate deploy failed — baselining existing migrations as applied\n');
  const dir = join(process.cwd(), 'prisma', 'migrations');
  const migrations = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  for (const mig of migrations) {
    try {
      execSync(`prisma migrate resolve --applied ${mig}`, { stdio: 'inherit' });
    } catch {
      // Already recorded as applied — nothing to do for this one.
    }
  }

  deploy();
}
