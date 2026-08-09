import { readFile, writeFile } from 'node:fs/promises';
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
const sourceIconPath = path.join(
  toolDirectory,
  'assets/mathsolver-calculator-icon.png',
);
const sourceIcon = await readFile(sourceIconPath);
const sourceIconData = sourceIcon.toString('base64');

const launchSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="504" height="555" viewBox="0 0 168 185">
  <defs>
    <clipPath id="app-icon-mask">
      <rect x="36" y="14" width="96" height="96" rx="23"/>
    </clipPath>
  </defs>
  <image x="36" y="14" width="96" height="96"
    href="data:image/png;base64,${sourceIconData}"
    clip-path="url(#app-icon-mask)"/>
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
  const outputPath = path.join(iconDirectory, item.filename);
  if (pixels === 1024) {
    await writeFile(outputPath, sourceIcon);
  } else {
    await sharp(sourceIcon)
      .resize(pixels, pixels)
      .removeAlpha()
      .png()
      .toFile(outputPath);
  }
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
