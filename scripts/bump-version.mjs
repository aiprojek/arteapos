import fs from 'fs';
import path from 'path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');

const pad = (n) => String(n).padStart(2, '0');
const pad3 = (n) => String(n).padStart(3, '0');
const now = new Date();
const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
const yearShort = Number(String(now.getFullYear()).slice(-2));
const startOfYear = new Date(now.getFullYear(), 0, 0);
const diff = now.getTime() - startOfYear.getTime();
const oneDay = 1000 * 60 * 60 * 24;
const dayOfYear = Math.floor(diff / oneDay);
const dayToken = Number(`${yearShort}${pad3(dayOfYear)}`);

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const current = String(pkg.version || '');

const githubRunNumber = Number(process.env.GITHUB_RUN_NUMBER || 0);
const githubRunAttempt = Math.max(0, Number(process.env.GITHUB_RUN_ATTEMPT || 1) - 1);

let build;
let patch;

if (githubRunNumber > 0) {
  build = githubRunNumber;
  patch = githubRunAttempt;
} else {
  build = 1;
  patch = 0;
  const match = current.match(/^(\d{8})\.(\d+)\.(\d+)$/);
  if (match && match[1] === dateStr) {
    build = Number(match[2]) + 1;
  }
}

const newVersion = `${dateStr}.${build}.${patch}`;
pkg.version = newVersion;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

if (fs.existsSync(gradlePath)) {
  const versionName = `${dateStr}.${build}.${patch}`;
  const versionCode = dayToken * 10000 + (build % 1000) * 10 + Math.min(patch, 9);
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  fs.writeFileSync(gradlePath, gradle);
}

process.stdout.write(newVersion);
