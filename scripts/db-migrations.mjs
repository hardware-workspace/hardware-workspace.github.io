import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRef = 'xqhxjolkaqqxqblqvrwg';
const mode = process.argv[2];
if (!['status', 'plan', 'deploy'].includes(mode) || process.argv.length !== 3) {
  console.error('Usage: npm run db:status | db:plan | db:deploy');
  process.exit(2);
}
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('FAIL: Set SUPABASE_ACCESS_TOKEN privately in your shell or GitHub Actions secrets.');
  process.exit(2);
}
const cli = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase');
function run(args) {
  const result = spawnSync(cli, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || `Supabase CLI exited ${result.status}`);
  }
}
try {
  const target = `--remote=${projectRef}`;
  console.log(`Target: Supabase project ${projectRef}`);
  if (mode === 'status') run(['migration', 'list', target]);
  if (mode === 'plan') run(['db', 'push', target, '--dry-run', '--skip-vault']);
  if (mode === 'deploy') {
    if (process.env.HARDWARE_DB_DEPLOY !== projectRef) {
      throw new Error(`Set HARDWARE_DB_DEPLOY=${projectRef} for an explicit production migration run.`);
    }
    run(['migration', 'list', target]);
    run(['db', 'push', target, '--dry-run', '--skip-vault']);
    run(['db', 'push', target, '--skip-vault', '--yes']);
    run(['migration', 'list', target]);
  }
  console.log(`PASS: database ${mode} completed for ${projectRef}.`);
} catch (error) {
  console.error(`FAIL: database ${mode}: ${error.message}`);
  process.exitCode = 1;
}
