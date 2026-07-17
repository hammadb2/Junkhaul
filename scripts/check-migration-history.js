import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const manifestPath = join(process.cwd(), 'supabase/migrations/MANIFEST.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

let failed = false;

for (const [file, expectedHash] of Object.entries(manifest.files || {})) {
  const path = join(process.cwd(), 'supabase/migrations', file);
  const actualHash = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (actualHash !== expectedHash) {
    failed = true;
    console.error(`${file}: hash mismatch`);
    console.error(`  expected ${expectedHash}`);
    console.error(`  actual   ${actualHash}`);
  }
}

const manifestFiles = new Set(Object.keys(manifest.files || {}));
const migrationFiles = execFileSync('git', ['ls-files', 'supabase/migrations/*.sql'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((file) => file.replace(/^supabase\/migrations\//, ''))
  .sort();
for (const file of migrationFiles) {
  if (!manifestFiles.has(file)) {
    failed = true;
    console.error(`${file}: missing from migration manifest`);
  }
}

if (failed) {
  console.error('Migration history check failed. Applied migrations are immutable; add a forward migration instead.');
  process.exit(1);
}

console.log(`Migration history check passed for ${Object.keys(manifest.files || {}).length} files.`);
