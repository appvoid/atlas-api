import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '..');
const crispEmbedDir = path.join(projectRoot, 'CrispEmbed');
const buildDir = path.join(crispEmbedDir, 'build');

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!fs.existsSync(crispEmbedDir)) {
  run('git', ['clone', '--recursive', 'https://github.com/CrispStrobe/CrispEmbed.git', crispEmbedDir]);
}

run('cmake', ['-S', crispEmbedDir, '-B', buildDir, '-DCRISPEMBED_BUILD_SHARED=ON']);
run('cmake', ['--build', buildDir, '-j']);
