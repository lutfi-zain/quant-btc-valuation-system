import { spawnSync, execSync } from 'child_process';

const args = process.argv.slice(2);
const isDev = args.includes('dev');

let hasBun = false;
try {
  execSync('bun --version', { stdio: 'ignore' });
  hasBun = true;
} catch (e) {}

if (hasBun) {
  const bunArgs = ['run'];
  if (isDev) bunArgs.push('--watch');
  bunArgs.push('index.ts');
  spawnSync('bun', bunArgs, { stdio: 'inherit' });
} else {
  const nodeArgs = ['tsx'];
  if (isDev) nodeArgs.push('watch');
  nodeArgs.push('src/index.node.ts');
  spawnSync('npx', nodeArgs, { stdio: 'inherit' });
}
