import { ScorchedTurf } from "./ScorchedTurf"

window.addEventListener("load", () => {
  ;(async () => {
    // Simple game bootstrap
    const game = new ScorchedTurf()
    game.start()
  })()
})
