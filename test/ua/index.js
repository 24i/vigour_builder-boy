import { device, platform, browser, version } from 'vigour-ua/navigator'

if (device === 'phone' || device === 'tablet' || device === 'tv') {
  console.log('phone or tablet')
} else if (platform === 'windows' && browser === 'firefox') {
  console.log('firefox on windows non phone or tablet or tv')
  console.log(version > 20 ? '20+' : '20-')
} else {
  console.log('other')
  console.log(version < 30 ? '30-' : '30+')
}

if (device === 'tablet') {
  console.log('any tablet')
  if (browser === 'chrome' && version >= 40) {
    console.log('chrome 40+ on any tablet')
  }
}

console.log('all')

// == step 1

// 1. device===phone||device===tablet||device===tv
// 2. (device[$nin=phone,tablet,tv])&&(platform===windows&&browser===firefox)&&version>20
// 3. (device[$nin=phone,tablet,tv])&&(platform===windows&&browser===firefox)&&version<=20
// 4. (device[$nin=phone,tablet,tv])&&(platform!==windows||browser!==firefox)&&version<30
// 5. (device[$nin=phone,tablet,tv])&&(platform!==windows||browser!==firefox)&&version>=30

// 1. (device===tablet)&&(browser===chrome&&version>=40)
// 2. (device===tablet)&&(browser!==chrome||version<40)
// 3. (device!==tablet)

// == step 2

// 1. (device===tablet)&&(browser===chrome&&version>=40)
// 2. (device===tablet)&&(browser!==chrome||version<40)
// 3. (device===phone||device===tv)
// 4. (device[$nin=phone,tablet,tv])&&(platform===windows&&browser===firefox)&&version>20
// 5. (device[$nin=phone,tablet,tv])&&(platform===windows&&browser===firefox)&&version<=20
// 6. (device[$nin=phone,tablet,tv])&&(platform!==windows||browser!==firefox)&&version<30
// 7. (device[$nin=phone,tablet,tv])&&(platform!==windows||browser!==firefox)&&version>=30

// browser, version, prefix, platform, device, webview
