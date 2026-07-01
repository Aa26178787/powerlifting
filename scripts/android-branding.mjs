// Sets the Android launcher label + activity title to the Korean app name.
// Runs in CI AFTER `npx cap add android` (the native project is generated fresh,
// not committed). capacitor.config.json keeps an ASCII appName so settings.gradle
// rootProject.name stays ASCII; only the user-visible label (strings.xml) is Korean.
import { readFileSync, writeFileSync } from 'node:fs'

const LABEL = '파워리프팅 루틴'
const path = 'android/app/src/main/res/values/strings.xml'

let xml = readFileSync(path, 'utf8')
for (const key of ['app_name', 'title_activity_main']) {
  const re = new RegExp(`(<string name="${key}">)[^<]*(</string>)`)
  xml = xml.replace(re, `$1${LABEL}$2`)
}
writeFileSync(path, xml)
console.log(`set Android label → "${LABEL}"`)
