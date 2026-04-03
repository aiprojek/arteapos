import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const copyTargets = [
  {
    from: 'node_modules/tesseract.js/dist/worker.min.js',
    to: 'public/vendor/tesseract/worker.min.js',
  },
  {
    from: 'node_modules/tesseract.js-core/tesseract-core.wasm.js',
    to: 'public/vendor/tesseract-core/tesseract-core.wasm.js',
  },
  {
    from: 'node_modules/tesseract.js-core/tesseract-core.wasm',
    to: 'public/vendor/tesseract-core/tesseract-core.wasm',
  },
  {
    from: 'node_modules/tesseract.js-core/tesseract-core-simd.wasm.js',
    to: 'public/vendor/tesseract-core/tesseract-core-simd.wasm.js',
  },
  {
    from: 'node_modules/tesseract.js-core/tesseract-core-simd.wasm',
    to: 'public/vendor/tesseract-core/tesseract-core-simd.wasm',
  },
  {
    from: 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
    to: 'public/vendor/tesseract-core/tesseract-core-lstm.wasm.js',
  },
  {
    from: 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm',
    to: 'public/vendor/tesseract-core/tesseract-core-lstm.wasm',
  },
  {
    from: 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
    to: 'public/vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js',
  },
  {
    from: 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm',
    to: 'public/vendor/tesseract-core/tesseract-core-simd-lstm.wasm',
  },
  {
    from: 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
    to: 'public/vendor/tesseract-lang/eng/eng.traineddata.gz',
  },
];

for (const target of copyTargets) {
  const sourcePath = path.join(rootDir, target.from);
  const destinationPath = path.join(rootDir, target.to);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Offline asset source not found: ${target.from}`);
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

console.log('Offline assets prepared successfully.');
