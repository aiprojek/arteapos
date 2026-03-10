import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;

const candidates = [];

const pushFiles = (dir) => {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isFile()) candidates.push(full);
  }
};

pushFiles(path.join(root, 'release'));
pushFiles(path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release'));
pushFiles(path.join(root, 'android', 'app', 'build', 'outputs', 'bundle', 'release'));

const ghCheck = spawnSync('gh', ['--version'], { stdio: 'ignore' });
if (ghCheck.status !== 0) {
  console.log('gh CLI tidak ditemukan. Draft release tidak dibuat.');
  process.exit(0);
}

const args = ['release', 'create', tag, '--draft', '--title', tag, '--notes', `Release ${tag}`];
for (const file of candidates) {
  args.push(file);
}

const res = spawnSync('gh', args, { stdio: 'inherit' });
process.exit(res.status || 0);
