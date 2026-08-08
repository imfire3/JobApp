import sharp from 'sharp';
import { readFileSync } from 'fs';

const svgBuffer = readFileSync('./chrome-extension/icon.svg');

const sizes = [
  { size: 128, name: 'icon128.png' },
  { size: 48, name: 'icon48.png' },
  { size: 16, name: 'icon16.png' }
];

for (const { size, name } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(`./chrome-extension/${name}`);
  console.log(`Created ${name}`);
}

console.log('All icons created successfully!');
