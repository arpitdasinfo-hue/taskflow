import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dir, '..', 'public', 'icons')

await mkdir(publicDir, { recursive: true })

// SVG icon — Zap bolt in a rounded-square, matching the app's dark glass theme
const makeSvg = (size) => {
  const r = Math.round(size * 0.22)   // corner radius
  const pad = Math.round(size * 0.15) // padding around bolt
  const inner = size - pad * 2

  // Lightning bolt path scaled to inner box
  const bx = pad, by = pad, bw = inner, bh = inner
  // Bolt: top-right → mid-left → mid-right → bottom-left, traced as a polygon
  const pts = [
    [bx + bw * 0.62, by],
    [bx + bw * 0.25, by + bh * 0.50],
    [bx + bw * 0.55, by + bh * 0.50],
    [bx + bw * 0.38, by + bh],
    [bx + bw * 0.75, by + bh * 0.50],
    [bx + bw * 0.45, by + bh * 0.50],
  ].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0035"/>
      <stop offset="100%" style="stop-color:#0a0015"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c084fc"/>
      <stop offset="100%" style="stop-color:#a855f7"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.025}" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Background rounded square -->
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>
  <!-- Subtle inner border -->
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}"
    fill="none" stroke="rgba(168,85,247,0.3)" stroke-width="${size * 0.012}"/>
  <!-- Lightning bolt -->
  <polygon points="${pts}" fill="url(#bolt)" filter="url(#glow)"/>
</svg>`
}

for (const size of [192, 512]) {
  const svg = Buffer.from(makeSvg(size))
  await sharp(svg).png().toFile(join(publicDir, `icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)
}

// Also generate a 180×180 apple-touch-icon
const svg180 = Buffer.from(makeSvg(180))
await sharp(svg180).png().toFile(join(publicDir, 'apple-touch-icon.png'))
console.log('✓ apple-touch-icon.png (180×180)')
