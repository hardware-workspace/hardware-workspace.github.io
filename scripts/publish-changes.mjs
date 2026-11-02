import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedOrigin = 'https://github.com/rohanrajdev77-alt/hw---tool-.git';
const args = process.argv.slice(2);
const checkOnly = args.length === 1 && args[0] === '--check';
if (args.some((arg) => arg.startsWith('--')) && !checkOnly) {
  console.error('Use npm run publish:check, or npm run publish:changes -- "Describe your changes".');
  process.exit(1);
}
const message = args.join(' ').trim() || 'Update hardware workspace';

function run(command, commandArgs, { capture = false, timeout = 120_000, allowFailure = false } = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    shell: false,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' },
  });
  if (result.error) {
    throw new Error(result.error.code === 'ETIMEDOUT'
      ? `${command} timed out. Check your connection and try again.`
      : `Could not run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0 && !allowFailure) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${command} failed. Publishing stopped; no reset, rebase, or force push was attempted.`);
  }
  return capture ? { ...result, output: result.stdout.trim() } : result;
}

const git = (commandArgs, options = {}) => run('git', commandArgs, { capture: true, ...options });

function verifyTarget() {
  const topLevel = git(['rev-parse', '--show-toplevel']).output;
  if (realpathSync(topLevel).toLowerCase() !== realpathSync(root).toLowerCase()) {
    throw new Error('Run this publisher from the hardware workspace checkout.');
  }
  if (git(['symbolic-ref', '--quiet', '--short', 'HEAD']).output !== 'main') {
    throw new Error('Publishing requires the main branch. Switch branches yourself before retrying.');
  }
  for (const direction of [[], ['--push']]) {
    const urls = git(['remote', 'get-url', ...direction, '--all', 'origin']).output.split(/\r?\n/);
    if (urls.length !== 1 || urls[0] !== expectedOrigin) {
      throw new Error('The origin fetch/push URL must point only to rohanrajdev77-alt/hw---tool-.');
    }
  }
}

function verifyUploadFiles() {
  // Cached paths include already-staged files even when .gitignore excludes them.
  const files = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).stdout.split('\0').filter(Boolean);
  const unsafe = files.filter((file) => file.replaceAll('\\', '/').toLowerCase().split('/').some((part) =>
    ['.netlify', '.vercel', 'node_modules', 'dist'].includes(part)
    || (part !== '.env.example' && (part === '.env' || part.startsWith('.env.')))));
  if (unsafe.length) {
    throw new Error(`Refusing to publish private/local files: ${[...new Set(unsafe)].join(', ')}. Remove them from Git tracking before retrying; this script will not alter your files to do so.`);
  }
}

try {
  verifyTarget();
  verifyUploadFiles();
  console.log('Checking the latest GitHub main branch…');
  run('git', ['fetch', '--no-tags', 'origin', 'refs/heads/main:refs/remotes/origin/main'], { timeout: 45_000 });
  const ancestor = git(['merge-base', '--is-ancestor', 'refs/remotes/origin/main', 'HEAD'], { allowFailure: true });
  if (ancestor.status !== 0) {
    throw new Error('GitHub main has changes that are not in this checkout. Integrate them yourself, then run the publisher again.');
  }

  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(npmCli)) {
    throw new Error('Start this script through npm run publish:changes or npm run publish:check.');
  }
  console.log('Building the app…');
  run(process.execPath, [npmCli, 'run', 'build']);
  console.log('Checking CSV export security…');
  run(process.execPath, [path.join(root, 'src', 'security.test.js')]);
  verifyTarget();
  verifyUploadFiles();

  if (checkOnly) {
    console.log('Publish checks passed. No files were staged, committed, or pushed.');
    process.exit(0);
  }

  run('git', ['add', '-A']);
  verifyUploadFiles();
  const staged = git(['diff', '--cached', '--quiet'], { allowFailure: true });
  if (staged.status === 1) {
    run('git', ['commit', '-m', message]);
  } else if (staged.status !== 0) {
    throw new Error('Could not inspect staged changes. Publishing stopped.');
  } else {
    console.log('No new file changes to commit. Checking for existing commits to publish.');
  }
  verifyTarget();
  run('git', ['push', 'origin', 'main'], { timeout: 45_000 });
  console.log('GitHub main is up to date. Your connected hosting provider builds new commits automatically; confirm the deploy succeeds before sharing the update.');
} catch (error) {
  console.error(`\n${error.message}`);
  console.error('Your local work is preserved. Fix the reported issue, then retry.');
  process.exitCode = 1;
}
