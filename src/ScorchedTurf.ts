import { graphics, sound, translate } from "toglib"
import { physics } from "propel-js"
import {
  ballSize,
  GameState,
  MaterialType,
  maxPower,
  goalSize,
  ActionListener,
  Course,
  courseInstances,
  GameActions,
} from "./logic"
import { ASSETS } from "./lib/assets"
import { OnChangeParams, PlayerId, Players } from "rune-sdk"
import { translations } from "./translates"
import { MANIA_MODE } from "./gamemode"

const nthStrings = ["th", "st", "nd", "rd", "th"]

const PARTICLE_LIFE = 10 // frames
const PARTICLE_SIZE = 15

interface TrailPoint {
  life: number
  x: number
  y: number
}

interface Sink {
  playerId: string
  time: number
}

translate.init(translations)

export class ScorchedTurf implements graphics.Game, ActionListener {
  game?: GameState

  gradient = [
    { r: 153, g: 193, b: 64 },
    { r: 231, g: 180, b: 22 },
    { r: 219, g: 123, b: 43 },
    { r: 204, g: 50, b: 50 },
  ]
  fontSmall!: graphics.GameFont
  fontBig!: graphics.GameFont
  fontBigger!: graphics.GameFont
  playerBalls: graphics.GameImage[] = []
  background!: graphics.GameImage
  arrow!: graphics.GameImage
  chain!: graphics.GameImage
  logo!: graphics.GameImage
  whiteCircle!: graphics.GameImage
  spinRing!: graphics.GameImage
  hand!: graphics.GameImage
  flag!: graphics.TileSet
  assetsLoaded = false
  cam: physics.Vector2 = physics.newVec2(0, 0)

  localPlayerId?: PlayerId
  players?: Players

  materials: Record<
    MaterialType,
    { rect: graphics.TileSet; circle: graphics.GameImage }
  >
  frame = 0
  widthInUnits = 0
  heightInUnits = 0
  scale = 0
  vx = 0
  vy = 0

  cameraX = 0
  cameraY = 0

  world?: physics.World
  powerDragging = false
  px = 0
  py = 0
  power = 0
  changeTurnAt = 0

  sx = 0
  sy = 0

  dragOffsetX = 0
  dragOffsetY = 0
  dragging = false

  atStart = true
  showTitle = false
  showTitleTimer = 0

  trail: TrailPoint[] = []
  courseNumber = -1
  completed: string[] = []

  currentBody?: physics.Body

  lastSink?: Sink
  gameOver = false

  outOfBoundsTimer = 0

  frameCount = 0

  elements: Record<string, graphics.GameImage> = {}

  sfxSwish: sound.Sound
  sfxHit: sound.Sound
  sfxHole: sound.Sound
  lastHitSound = 0

  showSpinner = false
  whoseTurn = ""
  course?: Course
  executionCounter = -1
  startPhysics = 0

  zoom = 1
  lastDragUpdate = 0
  hasCourseMessage = false
  firstDrag = true
  lastMovingSim = 0
  lastShot = 0

  courseComplete = false
  myBodyAtRest = false

  constructor() {
    graphics.init(graphics.RendererType.WEBGL, true, 2048, 10)

    this.sfxSwish = sound.loadSound(ASSETS["swing.mp3"])
    this.sfxHit = sound.loadSound(ASSETS["hit.mp3"])
    this.sfxHole = sound.loadSound(ASSETS["hole.mp3"])

    this.fontSmall = graphics.generateFont(16, "white")
    this.fontBig = graphics.generateFont(20, "white")
    this.fontBigger = graphics.generateFont(28, "white")
    this.arrow = graphics.loadImage(ASSETS["arrow.png"], true, "arrow", true)
    this.logo = graphics.loadImage(ASSETS["logo.png"])
    this.whiteCircle = graphics.loadImage(ASSETS["whitecircle.png"])
    this.spinRing = graphics.loadImage(ASSETS["spinring.png"])
    this.hand = graphics.loadImage(ASSETS["tap.png"])
    this.chain = graphics.loadImage(ASSETS["chain.png"])

    this.elements.tree1 = graphics.loadImage(
      ASSETS["elements/tree1.png"],
      true,
      "tree1",
      true
    )
    this.elements.tree2 = graphics.loadImage(
      ASSETS["elements/tree2.png"],
      true,
      "tree2",
      true
    )
    this.elements.tree3 = graphics.loadImage(
      ASSETS["elements/tree3.png"],
      true,
      "tree3",
      true
    )
    this.elements.tree4 = graphics.loadImage(
      ASSETS["elements/tree4.png"],
      true,
      "tree4",
      true
    )
    this.elements.grass1 = graphics.loadImage(
      ASSETS["elements/grass1.png"],
      true,
      "grass1",
      true
    )
    this.elements.grass2 = graphics.loadImage(
      ASSETS["elements/grass2.png"],
      true,
      "grass2",
      true
    )

    this.playerBalls = [
      graphics.loadImage(ASSETS["parrot.png"], true, "parrot", true),
      graphics.loadImage(ASSETS["monkey.png"], true, "monkey", true),
      graphics.loadImage(ASSETS["penguin.png"], true, "penguin", true),
      graphics.loadImage(ASSETS["pig.png"], true, "pig", true),
      graphics.loadImage(ASSETS["rabbit.png"], true, "rabbit", true),
      graphics.loadImage(ASSETS["snake.png"], true, "snake", true),
    ]

    this.background = graphics.loadImage(ASSETS["background.png"])
    this.flag = graphics.loadTileSet(ASSETS["flag.png"], 128, 256)

    this.materials = {
      [MaterialType.GRASS]: {
        rect: graphics.loadTileSet(ASSETS["grass.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["grass-round.png"]),
      },
      [MaterialType.STONE0]: {
        rect: graphics.loadTileSet(ASSETS["stone0.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["stone0-round.png"]),
      },
      [MaterialType.STONE1]: {
        rect: graphics.loadTileSet(ASSETS["stone1.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["stone1-round.png"]),
      },
      [MaterialType.STONE2]: {
        rect: graphics.loadTileSet(ASSETS["stone2.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["stone2-round.png"]),
      },
      [MaterialType.STONE3]: {
        rect: graphics.loadTileSet(ASSETS["stone3.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["stone3-round.png"]),
      },
      [MaterialType.WATER]: {
        rect: graphics.loadTileSet(ASSETS["water.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["stone3-round.png"]),
      },
      [MaterialType.BOUNCER]: {
        rect: graphics.loadTileSet(ASSETS["bouncer.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["bouncer-round.png"]),
      },
      [MaterialType.BLOCK]: {
        rect: graphics.loadTileSet(ASSETS["block.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["block-round.png"]),
      },
      [MaterialType.WOOD]: {
        rect: graphics.loadTileSet(ASSETS["block.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["wood.png"]),
      },
      [MaterialType.PEG]: {
        rect: graphics.loadTileSet(ASSETS["block.png"], 45, 15),
        circle: graphics.loadImage(ASSETS["peg.png"]),
      },
    }
  }

  zoomChanged(delta: number): void {
    this.zoom += delta * 0.01
    this.zoom = Math.min(1, Math.max(0.5, this.zoom))
  }

  shot(): void {
    sound.playSound(this.sfxSwish)
  }

  hole(): void {
    sound.playSound(this.sfxHole)
  }

  collision(maxDepth: number): void {
    if (Date.now() - this.lastHitSound > 250) {
      const depth = Math.min(maxDepth, 3)
      if (depth > 0.3) {
        sound.playSound(this.sfxHit, depth / 6)
        this.lastHitSound = Date.now()
      }
    }
  }

  start(): void {
    graphics.startRendering(this)
  }

  runUpdate(game: GameState): void {
    this.world = game.world
    this.courseComplete = game.courseComplete

    for (const event of game.events.filter(
      (e) => e.id > this.executionCounter
    )) {
      this.executionCounter = event.id
      if (event.type === "collision") {
        this.collision(event.maxDepth)
      }
      if (event.type === "sink") {
        sound.playSound(this.sfxHole)
        this.lastSink = {
          playerId: event.playerId,
          time: Date.now(),
        }
        this.showSpinner = false
      }
      if (
        event.type === "shoot" &&
        event.dx &&
        event.dy &&
        event.power &&
        this.course
      ) {
        this.shot()
        this.startPhysics = Date.now()
      }
      if (event.type === "newCourse") {
        this.course = JSON.parse(
          JSON.stringify(courseInstances[event.courseNumber])
        )
        if (this.course) {
          this.showTitle = true
          this.showTitleTimer = Date.now()
          this.completed = []
          this.gameOver = false
          this.courseNumber = event.courseNumber
          this.showSpinner = true
        }
      }
      if (event.type === "gameOver") {
        this.gameOver = true
      }
    }
  }

  sendDragUpdate(): void {
    if (Date.now() - this.lastDragUpdate > 250) {
      this.lastDragUpdate = Date.now()
      setTimeout(() => {
        Rune.actions.dragUpdate({
          powerDragging: this.powerDragging,
          px: this.px,
          py: this.py,
          power: this.power,
        })
      }, 1)
    }
  }

  // notification of a new game state from the Rune SDK
  gameUpdate(update: OnChangeParams<GameState, GameActions, false>): void {
    this.game = update.game
    this.localPlayerId = update.yourPlayerId
    this.players = update.players
    this.world = update.game.world

    for (const body of [...this.world.dynamicBodies]) {
      if (
        body == this.currentBody &&
        this.outOfBoundsTimer < Date.now() &&
        physics.lengthVec2(body.velocity) > 10
      ) {
        if (this.frameCount % 2 === 0) {
          this.trail.splice(0, 0, {
            life: PARTICLE_LIFE,
            x: body.center.x,
            y: body.center.y,
          })
        }
      }
    }
    if (this.game.startGame) {
      this.gameOver = false
      this.executionCounter = 0
      this.hasCourseMessage = true
    }
    if (this.game.shotsThisCourse === 0) {
      this.hasCourseMessage = true
      this.atStart = false
    }

    if (update.game.whoseTurn && update.game.whoseTurn !== this.whoseTurn) {
      this.whoseTurn = update.game.whoseTurn
      this.showSpinner = true
    }

    if (update.game.whoseTurn === this.localPlayerId || MANIA_MODE) {
      this.sendDragUpdate()
    } else {
      this.powerDragging = update.game.powerDragging
      this.px = update.game.px
      this.py = update.game.py
      this.power = update.game.power
    }
    // if theres only one player left, always show the the spinner
    if (
      this.course &&
      this.world.dynamicBodies
        .filter((b) => b.data.playerId)
        .map((b) => b.data.playerId)
        .filter((id) => !this.game?.completed.includes(id)).length === 1
    ) {
      if (!this.game.completed.includes(this.whoseTurn) || MANIA_MODE) {
        this.showSpinner = true
      }
    }

    this.runUpdate(update.game)

    if (this.course) {
      if (!physics.atRest(this.world)) {
        this.dragOffsetX = 0
        this.dragOffsetY = 0
      }
      if (
        physics.atRest(this.world) &&
        Rune.gameTime() > this.changeTurnAt &&
        this.changeTurnAt !== 0
      ) {
        if (update.game.whoseTurn === this.localPlayerId && !MANIA_MODE) {
          this.changeTurnAt = 0
          setTimeout(() => {
            if (this.world) {
              Rune.actions.endTurn()
            }
          }, 1)
        }
      }

      for (const currentBody of this.world.dynamicBodies) {
        if (!currentBody.data.playerId) {
          continue
        }
        if (currentBody.data.playerId !== this.game?.whoseTurn && !MANIA_MODE) {
          continue
        }
        if (currentBody?.data.outOfBounds) {
          this.outOfBoundsTimer = Date.now() + 2000
          this.trail = []
        }

        for (const p of [...this.trail]) {
          p.life--
          if (p.life <= 0) {
            this.trail.splice(this.trail.indexOf(p))
          }
        }
      }

      this.frameCount++
    }
  }

  mouseDown(x: number, y: number): void {
    if (this.gameOver) {
      return
    }
    if (this.atStart) {
      if (this.hasCourseMessage) {
        this.atStart = false
        this.showTitleTimer = Date.now()
      }
      return
    }
    if (this.showTitle) {
      this.showTitle = false
      return
    }

    // tapped at the bottom - reset view
    if (y > graphics.height() - 60) {
      this.dragOffsetX = 0
      this.dragOffsetY = 0
      return
    }

    if (this.outOfBoundsTimer !== 0 && this.outOfBoundsTimer > Date.now()) {
      return
    }

    x -= Math.floor(graphics.width() / 2)
    y -= Math.floor(graphics.height() / 2)
    x /= this.scale
    y /= this.scale
    x += Math.floor(this.cameraX)
    y += Math.floor(this.cameraY)

    this.sx = x
    this.sy = y

    if (
      this.world &&
      (physics.atRest(this.world) || (this.myBodyAtRest && MANIA_MODE))
    ) {
      this.dragging = true
      if (this.game && this.myTurn()) {
        const body = this.world.dynamicBodies.find(
          (b) => b.data?.playerId === this.localPlayerId
        )
        if (body) {
          if (
            (body.data.playerId === this.game.whoseTurn &&
              this.game.whoseTurn === this.localPlayerId) ||
            (body.data.playerId === this.localPlayerId &&
              MANIA_MODE &&
              this.myBodyAtRest)
          ) {
            const dx = x - body.center.x
            const dy = y - body.center.y
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len < ballSize * 2) {
              // start drag on ball
              this.powerDragging = true
              this.px = dx
              this.py = dy
              this.power = Math.min(maxPower, len)
              this.dragging = false
            }
          }
        }
      }
    }
  }

  physicsAtRestTime(): number {
    return Date.now() - this.lastMovingSim
  }

  myTurn(): boolean {
    if (MANIA_MODE) {
      return true
    }
    return (
      this.whoseTurn == this.localPlayerId &&
      this.game?.nextTurnAt == 0 &&
      this.physicsAtRestTime() > 500
    )
  }

  mouseDrag(x: number, y: number): void {
    x -= Math.floor(graphics.width() / 2)
    y -= Math.floor(graphics.height() / 2)
    x /= this.scale
    y /= this.scale
    x += Math.floor(this.cameraX)
    y += Math.floor(this.cameraY)

    if (
      this.game &&
      this.world &&
      (physics.atRest(this.world) || (this.myBodyAtRest && MANIA_MODE))
    ) {
      if (this.powerDragging) {
        const body = this.world.dynamicBodies.find(
          (b) => b.data?.playerId === this.localPlayerId
        )
        if (body) {
          if (
            (body.data.playerId === this.game.whoseTurn &&
              this.game.whoseTurn === this.localPlayerId) ||
            (body.data.playerId === this.localPlayerId &&
              MANIA_MODE &&
              this.myBodyAtRest)
          ) {
            const dx = x - body.center.x
            const dy = y - body.center.y
            const len = Math.sqrt(dx * dx + dy * dy)
            this.px = dx
            this.py = dy
            this.power = Math.min(maxPower, len)
          }
        }
      } else if (this.dragging) {
        this.dragOffsetX -= x - this.sx
        this.dragOffsetY -= y - this.sy
      }
    }

    this.sx = x
    this.sy = y
  }

  mouseUp(): void {
    this.dragging = false

    if (this.powerDragging && !this.game?.gameOver) {
      if (this.power > 30 && Date.now() - this.lastShot > 1000) {
        this.lastShot = Date.now()
        this.showSpinner = false
        this.firstDrag = false
        Rune.actions.shoot({
          dx: -this.px / this.power,
          dy: -this.py / this.power,
          power: 150 + this.power * 2,
        })
        this.changeTurnAt = Rune.gameTime() + 1000
      }
    }
    this.powerDragging = false
  }

  keyDown(): void {
    // do nothing
  }

  keyUp(): void {
    // do nothing
  }

  resourcesLoaded(): void {
    // do nothing
    this.assetsLoaded = true

    // tell rune to let us know when a game
    // update happens
    Rune.initClient({
      onChange: (update) => {
        this.gameUpdate(update)
      },
    })
  }

  threePatch(
    tiles: graphics.TileSet,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    graphics.drawTile(tiles, x, y, 0, width, tiles.tileHeight)
    graphics.drawTile(
      tiles,
      x,
      y + tiles.tileHeight - 1,
      1,
      width,
      height - tiles.tileHeight * 2 + 2
    )
    graphics.drawTile(
      tiles,
      x,
      y + height - tiles.tileHeight,
      2,
      width,
      tiles.tileHeight
    )
  }

  render(): void {
    this.frame++

    if (this.frame % 2 !== 0) {
      return
    }
    if (!this.assetsLoaded) {
      return
    }
    if (!this.game) {
      return
    }
    if (!this.course) {
      return
    }
    if (!this.world) {
      return
    }

    if (graphics.width() > graphics.height()) {
      graphics.drawImage(
        this.background,
        0,
        0,
        graphics.width(),
        (graphics.width() / this.background.width) * this.background.height
      )
    } else {
      graphics.drawImage(
        this.background,
        0,
        0,
        (graphics.height() / this.background.height) * this.background.width,
        graphics.height()
      )
    }

    if (this.atStart) {
      graphics.drawImage(
        this.logo,
        Math.floor((graphics.width() - 1.05 * this.logo.width) / 2),
        50
      )
      graphics.fillRect(
        0,
        graphics.height() - 65,
        graphics.width(),
        40,
        "rgba(0,0,0,0.5)"
      )

      if (this.hasCourseMessage) {
        graphics.centerText(
          "Tap to Start",
          graphics.height() - 36,
          this.fontBig
        )
      } else {
        graphics.centerText(
          "Waiting for Next Course",
          graphics.height() - 36,
          this.fontBig
        )
      }
    }
    // run the world from the server
    if (this.game && this.course) {
      if (graphics.width() > graphics.height()) {
        this.heightInUnits = 500
        this.widthInUnits =
          (graphics.height() / graphics.width()) * this.heightInUnits
        this.scale = (1 / this.heightInUnits) * graphics.height() * this.zoom
      } else {
        this.widthInUnits = 500
        this.heightInUnits =
          (graphics.height() / graphics.width()) * this.widthInUnits
        this.scale = (1 / this.widthInUnits) * graphics.width() * this.zoom
      }

      graphics.push()
      this.vx = this.course.start.x
      this.vy = this.course.start.y
      const body = MANIA_MODE
        ? this.world.dynamicBodies.find(
            (b) => b.data.playerId === this.localPlayerId
          )
        : this.world.dynamicBodies.find(
            (b) => b.data.playerId === this.game?.whoseTurn
          )
      if (!this.currentBody || (this.currentBody !== body && body)) {
        this.currentBody = body
      }

      if (this.currentBody && !this.currentBody.static) {
        this.vx = this.currentBody.averageCenter.x
        this.vy = this.currentBody.averageCenter.y
      }

      const atRest = physics.atRest(this.world)
      if (atRest) {
        this.cameraX = this.cameraX * 0.7 + this.vx * 0.3
        this.cameraY = this.cameraY * 0.7 + this.vy * 0.3
      } else {
        this.cameraX = this.vx
        this.cameraY = this.vy
      }
      this.cameraX += this.dragOffsetX
      this.cameraY += this.dragOffsetY

      if (this.atStart) {
        return
      }

      graphics.translate(
        Math.floor(graphics.width() / 2),
        Math.floor(graphics.height() / 2)
      )
      graphics.scale(this.scale, this.scale)
      graphics.translate(Math.floor(-this.cameraX), Math.floor(-this.cameraY))

      // draw goal area
      graphics.alpha(0.2)
      graphics.drawImage(
        this.whiteCircle,
        this.course.goal.x - Math.floor(goalSize / 2),
        this.course.goal.y - goalSize / 2,
        goalSize,
        goalSize
      )
      graphics.alpha(1)

      this.drawBackground(this.game, this.world)
      if (this.currentBody && !this.currentBody.static) {
        let tx = this.currentBody.averageCenter.x
        let ty = this.currentBody.averageCenter.y
        for (let i = 0; i < this.trail.length; i++) {
          const pt = this.trail[i]

          const dx = tx - pt.x
          const dy = ty - pt.y
          const len = Math.sqrt(dx * dx + dy * dy)

          const a = pt.life / PARTICLE_LIFE
          const size = PARTICLE_SIZE - 10 * (1 - a)
          graphics.alpha(a)
          graphics.push()
          graphics.translate(pt.x, pt.y)
          graphics.rotate(Math.atan2(dy, dx))
          graphics.fillRect(0, -size, len + 4, size * 2, "white")
          graphics.pop()

          tx = pt.x
          ty = pt.y
        }
      }

      if (this.world && !physics.atRest(this.world)) {
        this.lastMovingSim = Date.now()
      }

      graphics.alpha(1)
      this.drawWorld(this.game, this.world)
      const flagWidth = 40
      const flagHeight = 80
      graphics.drawTile(
        this.flag,
        this.course.goal.x - 6,
        this.course.goal.y - flagHeight,
        0,
        flagWidth,
        flagHeight
      )

      this.myBodyAtRest = false
      const myBody = this.world.dynamicBodies.find((p) => {
        return p.data.playerId === this.localPlayerId
      })
      if (MANIA_MODE) {
        this.myBodyAtRest = (myBody && myBody.restingTime > 1) === true
        if (this.myBodyAtRest) {
          this.showSpinner = true
        }
        if (!myBody) {
          this.showSpinner = false
        }
      }

      if (this.powerDragging && this.power > 30 && (MANIA_MODE || atRest)) {
        const body = this.world.dynamicBodies.find(
          (b) =>
            b.data.playerId ===
            (MANIA_MODE ? this.localPlayerId : this.game?.whoseTurn)
        )
        if (body) {
          if (body.data.playerId !== this.localPlayerId) {
            graphics.alpha(0.5)
          } else {
            // draw trajectory
            if (this.power > 50) {
              const len = Math.sqrt(this.px * this.px + this.py * this.py)
              graphics.push()
              graphics.translate(body.center.x, body.center.y)
              let x = 0
              let y = 0
              let vy = (-this.py / len) * this.power
              const step = 0.5

              for (let i = 0; i < 15; i++) {
                x += (-this.px / len) * this.power * step
                y += vy * step
                vy += (200 / 10) * step
                graphics.alpha(0.2)
                graphics.drawImage(
                  this.whiteCircle,
                  x - 6,
                  y - 6,
                  12,
                  12,
                  "rgba(0,0,0,0.2)"
                )
                graphics.alpha(1)
                graphics.drawImage(this.whiteCircle, x - 4, y - 4, 8, 8)
              }
              graphics.pop()
            }
          }
          graphics.push()
          graphics.translate(body.center.x, body.center.y)
          graphics.rotate(Math.atan2(-this.py, -this.px))
          const scale = 0.5 + (0.5 * this.power) / maxPower
          graphics.scale(scale, scale)
          const n = (this.power / (maxPower + 1)) * 3
          const p = Math.floor(n)
          const diff = n - p
          const col = {
            r: Math.floor(
              this.gradient[p].r * (1 - diff) + this.gradient[p + 1].r * diff
            ),
            g: Math.floor(
              this.gradient[p].g * (1 - diff) + this.gradient[p + 1].g * diff
            ),
            b: Math.floor(
              this.gradient[p].b * (1 - diff) + this.gradient[p + 1].b * diff
            ),
          }
          graphics.drawImage(
            this.arrow,
            20 * (1 / scale),
            -this.arrow.height / 2,
            this.arrow.width,
            this.arrow.height,
            "rgba(" + col.r + "," + col.g + "," + col.b + ", 0)"
          )
          graphics.pop()
          graphics.alpha(1)
        }
      } else {
        if (
          this.showSpinner &&
          ((this.game.nextTurnAt === 0 && this.physicsAtRestTime() > 500) ||
            (MANIA_MODE && this.myBodyAtRest)) &&
          this.currentBody &&
          this.currentBody.data.playerId === this.localPlayerId
        ) {
          const size = 30
          graphics.push()
          graphics.translate(
            this.currentBody.center.x,
            this.currentBody.center.y
          )
          graphics.push()
          graphics.rotate(this.frame * 0.1)
          graphics.drawImage(this.spinRing, -size, -size, size * 2, size * 2)

          graphics.pop()
          if (this.firstDrag) {
            graphics.drawImage(
              this.hand,
              (1 - Math.sin((this.frame * 0.02) % Math.PI)) * -50,
              (1 - Math.sin((this.frame * 0.02) % Math.PI)) * 30
            )
          }
          graphics.pop()
        }
      }

      graphics.pop()
    }

    if (this.atStart) {
      return
    }

    // draw the mini-map, same drawing routines just scaled
    graphics.push()
    graphics.translate(Math.floor(graphics.width() / 2), 0)
    graphics.scale(0.07, 0.07)
    const bounds = physics.getWorldBounds(this.world, true)
    const boundsWidth = bounds.max.x - bounds.min.x
    const boundsHeight = bounds.max.y - bounds.min.y
    graphics.translate(-boundsWidth / 2, 40)
    graphics.fillRect(
      -40,
      0,
      boundsWidth + 80,
      boundsHeight + 80,
      "rgba(0,0,0,0.1)"
    )
    graphics.translate(-bounds.min.x, -bounds.min.y)
    this.drawBackground(this.game, this.world)
    this.drawWorld(this.game, this.world, true)
    const flagWidth = 80
    const flagHeight = 160
    graphics.drawTile(
      this.flag,
      this.course.goal.x - 6,
      this.course.goal.y - flagHeight,
      0,
      flagWidth,
      flagHeight
    )
    graphics.pop()

    if (this.players && this.game.whoseTurn && !MANIA_MODE) {
      graphics.fillRect(
        0,
        graphics.height() - 60,
        graphics.width(),
        60,
        "rgba(0,0,0,0.5)"
      )
      let message = this.players[this.game.whoseTurn].displayName
      if (this.game.whoseTurn === this.localPlayerId) {
        message = "Your Turn"
      }
      const player = this.game.players.find(
        (p) => p.playerId === this.game?.whoseTurn
      )
      graphics.drawText(67, graphics.height() - 32, message, this.fontBig)
      if (
        player &&
        this.game?.nextTurnAt == 0 &&
        this.physicsAtRestTime() > 500
      ) {
        message =
          player.shots + 1 + nthStrings[Math.min(4, player.shots + 1)] + " shot"
        graphics.drawText(69, graphics.height() - 14, message, this.fontSmall)
      }
      let type = 5
      const size = 20
      if (player) {
        type = player.playerType
      }
      graphics.drawImage(
        this.playerBalls[type],
        20,
        graphics.height() - 33 - size,
        size * 2,
        size * 2
      )
    }

    if (this.showTitle && this.game) {
      const sinceShown = Date.now() - this.showTitleTimer
      let a = 1
      if (sinceShown > 2000) {
        this.showTitle = false
      } else if (sinceShown > 1500) {
        a = 1 - (sinceShown - 1500) / 500
      }
      if (this.showTitle) {
        graphics.push()
        graphics.translate(0, -100)
        graphics.alpha(a)
        graphics.fillRect(
          0,
          graphics.height() / 2 - 70,
          graphics.width(),
          120,
          "rgba(0,0,0,0.5)"
        )
        graphics.centerText(
          "Hole " + (this.courseNumber + 1),
          graphics.height() / 2 - 40,
          this.fontBig,
          "#ddd"
        )
        graphics.centerText(
          this.course.name,
          graphics.height() / 2,
          this.fontBigger
        )
        graphics.centerText(
          "Par " + this.course.par,
          graphics.height() / 2 + 35,
          this.fontBig,
          "#ddd"
        )
        graphics.alpha(1)
        graphics.pop()
      }
    }

    if (
      this.players &&
      this.lastSink &&
      Date.now() - this.lastSink.time < 3000
    ) {
      const playerData = this.game.players.find(
        (p) => p.playerId === this.lastSink?.playerId
      )
      if (playerData) {
        const sinceShown = Date.now() - this.lastSink.time
        let a = 1
        if (sinceShown > 2500) {
          a = 1 - (sinceShown - 2500) / 500
        }
        graphics.alpha(a)
        graphics.fillRect(0, 10, graphics.width(), 45, "rgba(0,0,0,0.5)")
        const message =
          this.players[this.lastSink.playerId].displayName +
          " gets a hole in " +
          playerData.shots +
          "!"
        graphics.centerText(message, 28, this.fontSmall)
        graphics.centerText(
          "(" + this.toParName(this.course.par, playerData.shots) + ")",
          48,
          this.fontSmall,
          "#ddd"
        )
        graphics.alpha(1)
      }
    }

    if (this.outOfBoundsTimer > Date.now() && !MANIA_MODE) {
      graphics.fillRect(0, 60, graphics.width(), 50, "rgba(0,0,0,0.5)")
      graphics.centerText("Out of Bounds!", 100, this.fontBigger)
    }
    if ((this.gameOver || this.courseComplete) && this.game && this.players) {
      let y = 100
      graphics.fillRect(0, y - 40, graphics.width(), 50, "rgba(0,0,0,0.5)")
      graphics.centerText(
        this.gameOver ? "Game Over!" : "All Done!",
        y,
        this.fontBigger
      )
      y += 50

      for (const player of [...this.game.players].sort(
        (a, b) => a.totalShots - b.totalShots
      )) {
        const name = this.players[player.playerId]?.displayName ?? ""
        const score = player.totalShots

        let type = 5
        const size = 12
        if (player) {
          type = player.playerType
        }

        graphics.fillRect(0, y - 25, graphics.width(), 30, "rgba(0,0,0,0.5)")
        graphics.drawImage(
          this.playerBalls[type],
          4,
          2 + y - size * 2,
          size * 2,
          size * 2
        )
        graphics.drawText(35, y, name, this.fontBig)
        graphics.drawText(
          graphics.width() - 55 - graphics.textWidth("" + score, this.fontBig),
          y,
          "" + score,
          this.fontBig
        )
        const difference = score - this.game.totalPar
        const diffString = "(" + (difference >= 0 ? "+" : "") + difference + ")"
        let col = "#aaaaaa"
        if (difference > 0) {
          col = "#bb2905"
        }
        if (difference < 0) {
          col = "#7da004"
        }

        graphics.fillRect(graphics.width() - 45, y - 22, 42, 25, col)
        graphics.drawText(
          graphics.width() -
            44 +
            Math.floor(
              (42 - graphics.textWidth(diffString, this.fontSmall)) / 2
            ),
          y - 4,
          diffString,
          this.fontSmall
        )
        y += 35
      }
    }
  }

  toParName(par: number, shots: number): string {
    const diff = shots - par
    switch (diff) {
      case -1:
        return "Birdie!"
      case -2:
        return "Eagle!"
      case -3:
        return "Albatross!"
      case -4:
        return "Condor!"
      case 1:
        return "Bogey"
      case 2:
        return "Double Bogey"
      case 3:
        return "Triple Bogey"
    }

    if (par < shots) {
      return shots - par + " over par"
    }
    if (par > shots) {
      return par - shots + " under par"
    }
    return "Par"
  }

  drawBackground(game: GameState, world: physics.World) {
    if (world) {
      const all = physics.allBodies(world)
      for (const body of all) {
        // Draw
        // ----
        graphics.push()

        graphics.translate(body.center.x, body.center.y)
        graphics.rotate(Math.floor(body.angle * 10) / 10)

        if (body.shapes[0].type === physics.ShapeType.CIRCLE) {
          if (body.data.sprite) {
            const image = this.elements[body.data.sprite]
            if (image) {
              graphics.drawImage(
                image,
                Math.floor(-image.width / 2),
                -image.height
              )
            }
          }
        }
        graphics.pop()
      }
      for (const body of all) {
        // Draw
        // ----
        graphics.push()

        graphics.translate(body.center.x, body.center.y)
        graphics.rotate(Math.floor(body.angle * 10) / 10)

        if (body.shapes[0].type === physics.ShapeType.RECTANGLE) {
          if (body.data.type === MaterialType.WATER) {
            const width = body.shapes[0].width + 2
            const height = body.shapes[0].height + 2
            const tileset = this.materials[body.data.type as MaterialType].rect
            this.threePatch(
              tileset,
              -width / 2,
              -height / 2,
              width,
              height + 10
            ) // account for shadow
          }
        }
        graphics.pop()
      }
    }
  }

  drawWorld(game: GameState, world: physics.World, bigPlayers = false) {
    if (world) {
      const all = physics.allBodies(world)
      for (const body of all) {
        // Draw
        // ----
        graphics.push()

        graphics.translate(body.center.x, body.center.y)
        graphics.rotate(Math.floor(body.angle * 10) / 10)

        if (body.shapes[0].type === physics.ShapeType.CIRCLE) {
          if (body.data.sprite) {
            // drawn on the background layer
          } else {
            const size = bigPlayers
              ? body.shapes[0].bounds * 2
              : body.shapes[0].bounds + 1
            if (body.data && body.data.playerId) {
              const player = game.players.find(
                (p) => p.playerId === body.data.playerId
              )
              let type = 5
              if (player) {
                type = player.playerType
              }
              graphics.drawImage(
                this.playerBalls[type],
                -size,
                -size,
                size * 2,
                size * 2
              )
            } else {
              if (size > 1) {
                const image =
                  this.materials[body.data?.type as MaterialType]?.circle
                if (image) {
                  graphics.drawImage(image, -size, -size, size * 2, size * 2)
                }
              }
            }
          }
        } else {
          if (body.data.type === MaterialType.WATER) {
            graphics.alpha(0.5)
          }

          const width = body.shapes[0].width + 2
          const height = body.shapes[0].height + 2
          const tileset = this.materials[body.data.type as MaterialType].rect
          this.threePatch(tileset, -width / 2, -height / 2, width, height + 3) // account for shadow

          if (body.data.pinned) {
            const size = 4
            graphics.drawImage(
              this.whiteCircle,
              -size,
              -size,
              size * 2,
              size * 2,
              "black"
            )
          }
        }

        graphics.pop()
      }

      // draw bounds
      // for (const body of world.bodies) {
      //     graphics.fillRect(body.averageCenter.x - body.boundingBox.x, body.averageCenter.y - body.boundingBox.y, body.boundingBox.x * 2, body.boundingBox.y * 2, "rgba(255,0,0,0.5)");
      // }

      for (const joint of world.joints) {
        graphics.push()
        const bodyA = all.find((b) => b.id === joint.bodyA)
        const bodyB = all.find((b) => b.id === joint.bodyB)
        if (bodyA && bodyB) {
          const length = physics.lengthVec2(
            physics.subtractVec2(bodyA.center, bodyB.center)
          )
          graphics.translate(bodyA.center.x, bodyA.center.y)
          graphics.rotate(
            Math.atan2(
              bodyB.center.y - bodyA.center.y,
              bodyB.center.x - bodyA.center.x
            )
          )
          graphics.drawImage(this.chain, 0, -6, length, 12)
        }

        graphics.pop()
      }
    }
  }
}
