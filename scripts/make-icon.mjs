// Renders the app-icon source images (foreground barbell + solid background) to
// assets/. @capacitor/assets consumes these to generate all Android densities +
// adaptive icons. Run: node scripts/make-icon.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('assets', { recursive: true })

const BG = '#0f1720'
const BAR = '#e8f0ff'
const PLATE = '#4ea1ff'
const PLATE2 = '#7cc0ff'

// Barbell, centred within the adaptive-icon safe zone (~inner 66%).
const foreground = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g>
    <rect x="292" y="484" width="440" height="56" rx="28" fill="${BAR}"/>
    <rect x="316" y="388" width="64" height="248" rx="24" fill="${PLATE}"/>
    <rect x="644" y="388" width="64" height="248" rx="24" fill="${PLATE}"/>
    <rect x="252" y="424" width="54" height="176" rx="22" fill="${PLATE2}"/>
    <rect x="718" y="424" width="54" height="176" rx="22" fill="${PLATE2}"/>
    <rect x="226" y="468" width="28" height="88" rx="14" fill="${BAR}"/>
    <rect x="770" y="468" width="28" height="88" rx="14" fill="${BAR}"/>
  </g>
</svg>`

await sharp(Buffer.from(foreground)).png().toFile('assets/icon-foreground.png')
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } }).png().toFile('assets/icon-background.png')
// Full legacy/square icon = barbell composited on the dark background.
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } })
  .composite([{ input: 'assets/icon-foreground.png' }])
  .png().toFile('assets/icon.png')

console.log('wrote assets/icon.png, icon-foreground.png, icon-background.png')
