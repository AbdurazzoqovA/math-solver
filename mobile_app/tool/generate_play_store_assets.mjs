import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(toolDirectory, '..');
const outputRoot = path.join(mobileRoot, 'store/google-play');
const phoneOutput = path.join(outputRoot, 'phone-screenshots');
const sourceIconPath = path.join(
  toolDirectory,
  'assets/mathsolver-calculator-icon.png',
);
const screenshotRoot = path.join(mobileRoot, 'screenshots/final');
const screenshotNames = [
  '01-solve-any-math-problem.png',
  '02-learn-with-ai-checked-steps.png',
  '03-check-handwritten-work.png',
  '04-create-your-ai-video-tutorial.png',
  '05-practice-until-it-sticks.png',
];

await mkdir(phoneOutput, { recursive: true });

const sourceIcon = await readFile(sourceIconPath);
await sharp(sourceIcon)
  .resize(512, 512)
  .png()
  .toFile(path.join(outputRoot, 'app-icon-512.png'));

for (const screenshotName of screenshotNames) {
  const sourcePath = path.join(screenshotRoot, screenshotName);
  const metadata = await sharp(sourcePath).metadata();
  if (metadata.width !== 1290 || metadata.height !== 2796) {
    throw new Error(
      `${screenshotName} must remain the approved 1290x2796 final export`,
    );
  }

  await sharp(sourcePath)
    .extend({
      left: 54,
      right: 54,
      extendWith: 'copy',
    })
    .removeAlpha()
    .png()
    .toFile(path.join(phoneOutput, screenshotName));
}

const featureScreenshot = await sharp(
  path.join(screenshotRoot, screenshotNames[0]),
)
  .resize({ height: 620 })
  .png()
  .toBuffer();

const iconData = sourceIcon.toString('base64');
const screenshotData = featureScreenshot.toString('base64');
const featureSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1024" y2="500" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F8F6F1"/>
      <stop offset="1" stop-color="#EEEFFD"/>
    </linearGradient>
    <linearGradient id="accent" x1="80" y1="384" x2="525" y2="384" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5267F7"/>
      <stop offset="1" stop-color="#7390FF"/>
    </linearGradient>
    <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
      <path d="M34 0H0V34" fill="none" stroke="#5267F7" stroke-opacity=".055" stroke-width="1"/>
    </pattern>
    <clipPath id="icon-mask"><rect x="80" y="62" width="76" height="76" rx="18"/></clipPath>
    <clipPath id="screen-mask"><rect x="728" y="-34" width="238" height="568" rx="38"/></clipPath>
    <filter id="shadow" x="-30%" y="-20%" width="170%" height="150%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#26356E" flood-opacity=".18"/>
    </filter>
  </defs>
  <rect width="1024" height="500" fill="url(#background)"/>
  <rect width="1024" height="500" fill="url(#grid)"/>
  <circle cx="932" cy="90" r="245" fill="#5267F7" fill-opacity=".10"/>
  <image x="80" y="62" width="76" height="76" href="data:image/png;base64,${iconData}" clip-path="url(#icon-mask)"/>
  <text x="176" y="110" fill="#172033" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700">MathSolver</text>
  <text x="80" y="230" fill="#172033" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="800">Math made clear.</text>
  <text x="80" y="290" fill="#3F4659" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="500">Scan. Learn. Practice. Watch.</text>
  <rect x="80" y="346" width="438" height="70" rx="22" fill="url(#accent)"/>
  <text x="299" y="390" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">Free step-by-step math help</text>
  <g filter="url(#shadow)">
    <rect x="714" y="-48" width="266" height="596" rx="48" fill="#172033"/>
    <image x="728" y="-34" width="238" height="568" href="data:image/png;base64,${screenshotData}" preserveAspectRatio="xMidYMid slice" clip-path="url(#screen-mask)"/>
  </g>
</svg>
`);

await sharp(featureSvg)
  .flatten({ background: '#F8F6F1' })
  .removeAlpha()
  .png()
  .toFile(path.join(outputRoot, 'feature-graphic-1024x500.png'));

