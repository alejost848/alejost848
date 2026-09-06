import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcHtml = path.join(rootDir, 'dist', 'index.html');
const destDir = path.join(rootDir, 'functions', 'hosting');
const destHtml = path.join(destDir, 'index.html');

if (!fs.existsSync(srcHtml)) {
  console.error(`[sync-hosting-template] Source file not found: ${srcHtml}`);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(srcHtml, destHtml);
console.log(`[sync-hosting-template] Copied ${srcHtml} -> ${destHtml}`);
