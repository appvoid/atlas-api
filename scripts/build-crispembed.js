const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const raizProyecto = path.resolve(__dirname, '..');
const directorioCrispEmbed = path.join(raizProyecto, 'CrispEmbed');
const directorioCompilado = path.join(directorioCrispEmbed, 'build');

function ejecutar(comando, argumentos) {
  const resultado = spawnSync(comando, argumentos, {
    cwd: raizProyecto,
    stdio: 'inherit',
  });

  if (resultado.status !== 0) {
    process.exit(resultado.status ?? 1);
  }
}

if (!fs.existsSync(directorioCrispEmbed)) {
  ejecutar('git', [
    'clone',
    '--recursive',
    'https://github.com/CrispStrobe/CrispEmbed.git',
    directorioCrispEmbed,
  ]);
}

ejecutar('cmake', ['-S', directorioCrispEmbed, '-B', directorioCompilado, '-DCRISPEMBED_BUILD_SHARED=ON']);
ejecutar('cmake', ['--build', directorioCompilado, '-j']);
