import { ASSETS } from "./lib/assets"
import { ScorchedTurf } from "./ScorchedTurf"

async function loadFont(name: string, url: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const fontFile = new FontFace(name, "url(" + ASSETS[url] + ")")
    fontFile
      .load()
      .then(() => {
        console.log("Loaded: " + url)
        resolve()
      })
      .catch((e) => {
        console.error("Failed to load: " + url + "(" + ASSETS[url] + ")")
        console.error(e)
        resolve()
      })
  })
}

window.addEventListener("load", () => {
    ;(async () => {
    // Simple game bootstrap
    const game = new ScorchedTurf()
    game.start()
    })()
})
