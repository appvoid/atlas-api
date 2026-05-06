const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const crispEmbedDir = path.join(projectRoot, 'CrispEmbed');
const buildDir = path.join(crispEmbedDir, 'build');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('cmake', ['-S', crispEmbedDir, '-B', buildDir, '-DCRISPEMBED_BUILD_SHARED=ON']);
run('cmake', ['--build', buildDir, '-j']);
