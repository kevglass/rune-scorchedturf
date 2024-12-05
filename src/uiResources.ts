import { graphics } from "toglib"
import { ASSETS } from "./lib/assets"

export class UIResources {
  bottomBarLeft: graphics.GameImage
  bottomBarMid: graphics.GameImage
  bottomBarRight: graphics.GameImage
  levelStart: graphics.GameImage
  dialog: graphics.GameImage
  pill: graphics.GameImage

  constructor() {
    this.bottomBarLeft = graphics.loadImage(
      ASSETS["ui/bottombar-left.png"],
      true
    )
    this.bottomBarMid = graphics.loadImage(ASSETS["ui/bottombar-mid.png"], true)
    this.levelStart = graphics.loadImage(ASSETS["ui/levelstart.png"], true)
    this.bottomBarRight = graphics.loadImage(
      ASSETS["ui/bottombar-right.png"],
      true
    )
    this.dialog = graphics.loadImage(ASSETS["ui/dialog.png"], true)
    this.pill = graphics.loadImage(ASSETS["ui/pill.png"], true)
  }
}
