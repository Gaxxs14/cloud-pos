const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pkgPath = path.join(__dirname, 'package.json');

function buildVariant(mode) {
  const isCaja = mode === 'CAJA';
  const pkg = {
    name: isCaja ? 'cloud-pos-caja' : 'cloud-pos-admin',
    version: '1.0.0',
    appMode: mode,
    description: isCaja
      ? 'Cloud POS - Terminal de Caja (Punto de Venta)'
      : 'Cloud POS - Panel de Administración',
    main: 'main.js',
    scripts: {
      start: 'electron .',
      'dist:portable': 'electron-builder --win portable --x64',
    },
    author: 'Cloud POS Team',
    license: 'MIT',
    dependencies: {},
    devDependencies: {
      electron: '^33.2.1',
      'electron-builder': '^25.1.8',
    },
    build: {
      appId: isCaja ? 'com.cloudpos.desktop.caja' : 'com.cloudpos.desktop.admin',
      productName: isCaja ? 'Cloud POS - Caja' : 'Cloud POS - Admin',
      copyright: 'Copyright © 2026 Cloud POS',
      directories: {
        output: isCaja ? 'dist-caja' : 'dist-admin',
      },
      win: {
        target: ['portable'],
        icon: isCaja ? 'assets/icon-caja.ico' : 'assets/icon.ico',
      },
      portable: {
        artifactName: isCaja ? 'Cloud POS - Caja.exe' : 'Cloud POS - Admin.exe',
      },
    },
  };

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log(`\n=== Building ${pkg.build.productName}... ===`);
  execSync('npx electron-builder --win portable --x64', { stdio: 'inherit', cwd: __dirname });
}

buildVariant('ADMIN');
buildVariant('CAJA');
console.log('\n=== BOTH DESKTOP EXECUTABLES BUILT SUCCESSFULLY! ===');
