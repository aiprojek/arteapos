import fs from 'fs';
import path from 'path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const current = String(pkg.version || '');

let build = 1;
const match = current.match(/^(\d{8})\.(\d+)\.0$/);
if (match && match[1] === dateStr) {
  build = Number(match[2]) + 1;
}

const newVersion = `${dateStr}.${build}.0`;
pkg.version = newVersion;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

if (fs.existsSync(gradlePath)) {
  const versionName = `${dateStr}.${build}`;
  const versionCode = Number(`${dateStr}${pad(build)}`);
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  fs.writeFileSync(gradlePath, gradle);
}

process.stdout.write(newVersion);
