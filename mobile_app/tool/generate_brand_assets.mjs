import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(toolDirectory, '..');
const iconDirectory = path.join(
  appRoot,
  'ios/Runner/Assets.xcassets/AppIcon.appiconset',
);
const launchDirectory = path.join(
  appRoot,
  'ios/Runner/Assets.xcassets/LaunchImage.imageset',
);

const iconSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="brand" x1="96" y1="64" x2="928" y2="960" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2F438F"/>
      <stop offset="1" stop-color="#5267F7"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#brand)"/>
  <path d="M716 258H332l180 253-180 255h392v-92H510l126-163-126-161h206v-92Z" fill="#FFFFFF"/>
</svg>
`);

const launchSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="504" height="555" viewBox="0 0 168 185">
  <defs>
    <linearGradient id="brand" x1="36" y1="14" x2="132" y2="110" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2F438F"/>
      <stop offset="1" stop-color="#5267F7"/>
    </linearGradient>
  </defs>
  <rect x="36" y="14" width="96" height="96" rx="27" fill="url(#brand)"/>
  <path d="M104 37H68l17 24-17 24h37v-9H85l12-15-12-15h19v-9Z" fill="#FFFFFF"/>
  <text x="84" y="143" text-anchor="middle" fill="#172033" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">MathSolver</text>
  <text x="84" y="160" text-anchor="middle" fill="#73798A" font-family="Arial, Helvetica, sans-serif" font-size="5.3" font-weight="700" letter-spacing="0.8">LEARN MATH STEP BY STEP</text>
</svg>
`);

const contents = JSON.parse(
  await readFile(path.join(iconDirectory, 'Contents.json'), 'utf8'),
);

for (const item of contents.images) {
  if (!item.filename) continue;
  const points = Number.parseFloat(item.size.split('x')[0]);
  const scale = Number.parseInt(item.scale, 10);
  const pixels = Math.round(points * scale);
  await sharp(iconSvg)
    .resize(pixels, pixels)
    .flatten({ background: '#5267F7' })
    .removeAlpha()
    .png()
    .toFile(path.join(iconDirectory, item.filename));
}

for (const [filename, width, height] of [
  ['LaunchImage.png', 168, 185],
  ['LaunchImage@2x.png', 336, 370],
  ['LaunchImage@3x.png', 504, 555],
]) {
  await sharp(launchSvg)
    .resize(width, height)
    .png()
    .toFile(path.join(launchDirectory, filename));
}
