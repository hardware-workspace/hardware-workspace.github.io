import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  ['account access', ['src/accountAccess.test.js']],
  ['CSV security', ['src/security.test.js']],
  ['email worker', ['supabase/functions/send-task-emails/handler.test.js']],
  ['task scheduling', ['src/taskSchedule.test.js']],
];
for (const [name, args] of checks) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`FAIL: ${name}`);
    process.exit(result.status || 1);
  }
  console.log(`PASS: ${name}`);
}
console.log('PASS: all focused checks');
