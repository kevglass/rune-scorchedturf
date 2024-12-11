import type { GameOverResult, PlayerId, RuneClient } from "rune-sdk"
import { xml } from "toglib/logic"
import { physics } from "propel-js"
import { ASSETS } from "./lib/rawassets"
import { MANIA_MODE } from "./gamemode"

export const ballSize = 18
export const maxPower = 200
export const goalSize = 30

export const courses = [
  "course1.svg",
  "course2.svg",
  "course3.svg",
  "course4.svg",
  "course5.svg",
  "course6.svg",
  "course7.svg",
  "course8.svg",
  "course9.svg",
  "course10.svg",
  "course11.svg",
  "course12.svg",
  "course13.svg",
  "course14.svg",
  "course15.svg",
  "course16.svg",
]

export type SelectCourse = {
  name: string
  id: string
  holes: number[]
}

export const selectCourses: SelectCourse[] = [
  {
    name: "The Good Place",
    id: "begin",
    holes: [0, 1, 2, 3],
  },
  {
    name: "Fair to Middlin'",
    id: "fair",
    holes: [4, 5, 6, 7],
  },
  {
    name: "Tough Luck",
    id: "tough",
    holes: [8, 9, 10, 11],
  },
  {
    name: "Crazy Hard",
    id: "crazy",
    holes: [12, 13, 14, 15],
  },
]

export type PersistedState = {
  scores: number[]
  pars: number[]
}

type GameEvent =
  | ShootEvent
  | GameOverEvent
  | NewCourseEvent
  | SinkEvent
  | CollisionEvent

export interface CommonEvent {
  id: number
}

export interface ShootEvent extends CommonEvent {
  type: "shoot"
  playerId: string
  dx: number
  dy: number
  power: number
}

export interface NewCourseEvent extends CommonEvent {
  type: "newCourse"
  courseNumber: number
}

export interface GameOverEvent extends CommonEvent {
  type: "gameOver"
}

export interface SinkEvent extends CommonEvent {
  type: "sink"
  playerId: string
}

export interface CollisionEvent extends CommonEvent {
  type: "collision"
  maxDepth: number
}

export interface Course {
  start: physics.Vector2
  goal: physics.Vector2
  world: physics.World
  name: string
  par: number
}

export interface PlayerDetails {
  playerId: PlayerId
  playerType: number
  shots: number
  totalShots: number
}

export enum MaterialType {
  GRASS = 1,
  STONE0 = 2,
  STONE1 = 3,
  STONE2 = 4,
  STONE3 = 5,
  WATER = 6,
  BOUNCER = 7,
  BLOCK = 8,
  PEG = 10,
  WOOD = 11,
  REDGRASS = 12,
  SAND = 13,
}

const SVG_COLOR_MAP: Record<string, MaterialType> = {
  "#a5e306": MaterialType.GRASS,
  "#ff7f00": MaterialType.REDGRASS,
  "#a8cbcc": MaterialType.STONE0,
  "#8bb8be": MaterialType.STONE1,
  "#5b8b95": MaterialType.STONE2,
  "#487d8f": MaterialType.STONE3,
  "#ffff00": MaterialType.BOUNCER,
  "#0000ff": MaterialType.BLOCK,
  "#00ffff": MaterialType.PEG,
  "#ff00ff": MaterialType.WOOD,
  "#f7ba3e": MaterialType.SAND,
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSVGTransform(a: any) {
  if (!a) {
    return {}
  }

  a = a.replaceAll(" ", ",")
  const b: Record<string, number[]> = {}
  for (const i in (a = a.match(/(\w+\((-?\d+\.?\d*e?-?\d*,?)+\))+/g))) {
    const c = a[i].match(/[\w.-]+/g)
    b[c.shift()] = c.map((i: string) => Number.parseFloat(i))
  }
  return b
}

function applyBodyLogic(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: any,
  world: physics.World,
  body: physics.Body
): void {
  if (body.data.type === MaterialType.BOUNCER) {
    body.data.originalBounds = body.shapes[0].bounds
  }
  if (element.class === "spin") {
    const pin = physics.createCircle(
      world,
      physics.newVec2(body.center.x, body.center.y),
      0,
      0,
      1,
      0.5
    )
    physics.addBody(world, pin)
    pin.data = {}
    body.data.pinned = true
    physics.disableBody(world, pin)
    physics.createJoint(world, pin, body, 1, 0)
  }
}

export function loadCourse(name: string): Course {
  const content = ASSETS[name]
  const document = xml.parseXml(content)

  const world = physics.createWorld(physics.newVec2(0, 200))
  // global friction
  world.damp = world.angularDamp = 0.94
  world.jointRestriction = 5

  const root = document.svg.g
  const start: physics.Vector2 = physics.newVec2(0, 0)
  const goal: physics.Vector2 = physics.newVec2(0, 0)

  const text = root.title.__text
  const parts = text.split(",")
  const courseName = parts[0]
  const par = Number.parseInt(parts[1])

  if (!Array.isArray(root.ellipse)) {
    root.ellipse = [root.ellipse]
  }
  for (const circle of root.ellipse) {
    // any setting of opacity removes it from the scene
    if (circle.opacity) {
      continue
    }

    const cx = Math.floor(Number.parseFloat(circle.cx ?? "0"))
    const cy = Math.floor(Number.parseFloat(circle.cy ?? "0"))
    const rx = Math.floor(Number.parseFloat(circle.rx ?? "0"))
    const fill = circle.fill

    if (fill === "#00ff00") {
      // green is the start point
      start.x = cx
      start.y = cy
      continue
    }
    if (fill === "#ff0000") {
      // red is the goal point
      goal.x = cx
      goal.y = cy
      continue
    }

    const body = physics.createCircle(
      world,
      physics.newVec2(cx, cy),
      rx,
      circle.class === "spin" || circle.class === "dynamic" ? 1 : 0,
      1,
      0.5
    )
    const type = SVG_COLOR_MAP[circle.fill] ?? MaterialType.GRASS
    body.data = { type, svgId: circle.id }

    const transform = parseSVGTransform(circle.transform)
    if (transform.rotate) {
      physics.rotateBody(body, (transform.rotate[0] * Math.PI) / 180)
    }

    physics.addBody(world, body)

    if (circle.class && fill === "#000000") {
      body.data.sprite = circle.class
      physics.disableBody(world, body)
    }

    applyBodyLogic(circle, world, body)
  }

  if (!Array.isArray(root.rect)) {
    root.rect = [root.rect]
  }
  for (const rect of root.rect) {
    // any setting of opacity removes it from the scene
    if (rect.opacity) {
      continue
    }

    const height = Math.floor(Number.parseFloat(rect.height ?? "0"))
    const width = Math.floor(Number.parseFloat(rect.width ?? "0"))
    const cx = Math.floor(Number.parseFloat(rect.x ?? "0") + width / 2)
    const cy = Math.floor(Number.parseFloat(rect.y ?? "0") + height / 2)

    const transform = parseSVGTransform(rect.transform)
    const body = physics.createRectangle(
      world,
      physics.newVec2(cx, cy),
      width,
      height,
      rect.class === "spin" || rect.class === "dynamic" ? 1 : 0,
      1,
      0.5
    )
    const type = SVG_COLOR_MAP[rect.fill] ?? MaterialType.GRASS
    body.data = { type, svgId: rect.id }

    if (transform.rotate) {
      physics.rotateBody(body, (transform.rotate[0] * Math.PI) / 180)
    }
    if (rect.class === "water") {
      body.permeability = 0.05
      body.data.type = MaterialType.WATER
    }

    physics.addBody(world, body)

    applyBodyLogic(rect, world, body)
  }

  if (root.polyline) {
    if (!Array.isArray(root.polyline)) {
      root.polyline = [root.polyline]
    }
    for (const line of root.polyline) {
      const parts = line["se:connector"].split(" ")
      const bodyA = physics
        .allBodies(world)
        .find((b) => b.data.svgId === parts[0])
      const bodyB = physics
        .allBodies(world)
        .find((b) => b.data.svgId === parts[1])

      if (bodyA && bodyB) {
        physics.createJoint(world, bodyA, bodyB, 1, 0)
      }
    }
  }

  return {
    world,
    start,
    goal,
    name: courseName,
    par,
  }
}

export const courseInstances: Course[] = []
for (const name of courses) {
  courseInstances.push(loadCourse(name))
}

export interface ActionListener {
  shot(): void

  hole(): void

  collision(maxDepth: number): void
}

export interface GameState {
  gameTime: number
  players: PlayerDetails[]
  joinedPlayers: string[]
  whoseTurn?: PlayerId
  nextTurnAt: number
  nextCourseAt: number
  events: GameEvent[]
  executed: number
  nextId: number
  courseNumber: number
  completed: string[]
  gameOver: boolean
  startGame: boolean
  frameCount: number
  totalPar: number
  shotsThisCourse: number

  world: physics.World
  start: physics.Vector2
  goal: physics.Vector2
  par: number
  courseComplete: boolean

  powerDragging: boolean
  px: number
  py: number
  power: number

  selectedCourse: number
  selectedHole: number
  // course: Course;
  persisted?: Record<string, PersistedState>
}

export type GameActions = {
  shoot: (params: { dx: number; dy: number; power: number }) => void
  dragUpdate: (params: {
    powerDragging: boolean
    px: number
    py: number
    power: number
  }) => void
  endTurn: () => void
  selectLevel: (params: { course: number; hole: number }) => void
}

declare global {
  const Rune: RuneClient<GameState, GameActions, PersistedState>
}

function applyShoot(
  world: physics.World,
  bodyId: number,
  dx: number,
  dy: number,
  power: number
): void {
  const body = world.dynamicBodies.find((b) => b.id === bodyId)
  if (body) {
    body.velocity.x += dx * power
    body.velocity.y += dy * power
    body.data.initialX = body.center.x
    body.data.initialY = body.center.y
  }
}

function nextTurn(state: GameState): void {
  if (state.players.length === 0) {
    return
  }
  if (state.nextCourseAt !== 0) {
    return
  }
  const possible = state.players.filter(
    (p) => !state.completed.includes(p.playerId)
  )

  if (possible.length === 0) {
    const limit = state.selectedHole === -1 ? 4 : 1
    if (state.courseNumber >= limit - 1) {
      state.events.push({
        id: state.nextId++,
        type: "gameOver",
      })
      state.gameOver = true
      const winner = state.players.sort(
        (a, b) => a.totalShots - b.totalShots
      )[0]
      const result: Record<PlayerId, GameOverResult> = {}
      state.players.forEach(
        (p) => (result[p.playerId] = p === winner ? "WON" : "LOST")
      )
      Rune.gameOver({ minimizePopUp: true, players: result })
    } else {
      state.nextCourseAt = Rune.gameTime() + 4000
    }
    return
  }

  let current = state.whoseTurn
    ? state.players.findIndex((p) => p.playerId === state.whoseTurn)
    : -1
  do {
    current++
    if (current >= state.players.length) {
      current = 0
    }
  } while (state.completed.includes(state.players[current].playerId))

  state.whoseTurn = state.players[current].playerId
}

function addPlayer(state: GameState, id: PlayerId): void {
  let playerType = 0
  for (playerType = 0; playerType < 6; playerType++) {
    if (!state.players.find((p) => p.playerType === playerType)) {
      break
    }
  }
  if (playerType > 5) {
    playerType = 0
  }

  state.players.push({
    playerId: id,
    playerType,
    shots: 0,
    totalShots: Math.max(...state.players.map((p) => p.totalShots), 0),
  })
}

function removePlayer(state: GameState, id: PlayerId): void {
  state.players = state.players.filter((p) => p.playerId !== id)
  state.joinedPlayers = state.joinedPlayers.filter((p) => p !== id)
}

function loadNextCourse(game: GameState): void {
  game.courseNumber++
  const hole = selectCourses[game.selectedCourse].holes[game.courseNumber]
  startCourse(game, courseInstances[hole])
}

// let totalTime = 0;

function startCourse(game: GameState, course: Course): void {
  game.totalPar += course.par
  game.shotsThisCourse = 0

  game.events.push({
    id: game.nextId++,
    type: "newCourse",
    gameTime: Rune.gameTime(),
    courseNumber: selectCourses[game.selectedCourse].holes[game.courseNumber],
  } as NewCourseEvent)
  game.completed = []
  game.world = JSON.parse(JSON.stringify(course.world))
  game.goal = course.goal
  game.start = course.start
  game.par = course.par
  game.courseComplete = false

  for (const player of game.joinedPlayers) {
    if (!game.players.find((p) => p.playerId === player)) {
      addPlayer(game, player)
    }
  }

  for (const player of game.players) {
    player.shots = 0
  }

  game.whoseTurn = game.players[0].playerId
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 6,
  persistPlayerData: true,
  reactive: false,
  setup: (allPlayerIds: PlayerId[]): GameState => {
    const course = loadCourse(courses[0])
    const initialState: GameState = {
      gameTime: 0,
      players: [],
      joinedPlayers: [],
      events: [],
      executed: 0,
      nextId: 1,
      courseNumber: 0,
      completed: [],
      nextTurnAt: 0,
      nextCourseAt: 0,
      gameOver: false,
      startGame: true,
      frameCount: 0,
      totalPar: 0,
      powerDragging: false,
      px: 0,
      py: 0,
      power: 0,
      shotsThisCourse: 0,
      world: course.world,
      goal: course.goal,
      start: course.start,
      par: course.par,
      courseComplete: false,
      selectedCourse: -1,
      selectedHole: -1,
    }

    for (const player of allPlayerIds) {
      addPlayer(initialState, player)
    }

    return initialState
  },
  events: {
    playerJoined: (playerId: PlayerId, context) => {
      if (playerId) {
        context.game.joinedPlayers.push(playerId)
      }
    },
    playerLeft: (playerId: PlayerId, context) => {
      // do nothing
      if (context.game.whoseTurn === playerId) {
        nextTurn(context.game)
      }
      removePlayer(context.game, playerId)
    },
  },
  updatesPerSecond: 30,
  landscape: true,
  update: (context) => {
    context.game.startGame = false
    context.game.frameCount++
    context.game.gameTime = Rune.gameTime()

    if (
      context.game.whoseTurn &&
      !context.game.gameOver &&
      !context.game.completed.includes(context.game.whoseTurn)
    ) {
      for (const player of context.game.players) {
        if (player.playerId !== context.game.whoseTurn && !MANIA_MODE) {
          continue
        }
        if (
          player &&
          !context.game.world.dynamicBodies.find(
            (b) => b.data?.playerId === player.playerId
          ) &&
          !context.game.completed.includes(player.playerId)
        ) {
          const ball = physics.createCircle(
            context.game.world,
            physics.newVec2(
              context.game.start.x + context.game.players.indexOf(player) * 1,
              context.game.start.y
            ),
            ballSize,
            10,
            1,
            1
          )
          ball.data = { playerId: player.playerId }
          physics.addBody(context.game.world, ball)
        }

        if (player) {
          const ball = context.game.world.dynamicBodies.find(
            (b) => b.data?.playerId === player.playerId
          )
          if (ball) {
            ball.data.outOfBounds = false
          }
        }
      }
    }

    // fake update to make it feel right
    const firstSet = physics.worldStep(30, context.game.world)
    const secondSet = physics.worldStep(30, context.game.world)

    for (const collision of [...firstSet, ...secondSet]) {
      const bodyA = physics
        .enabledBodies(context.game.world)
        .find((b) => b.id === collision.bodyAId)
      const bodyB = physics
        .enabledBodies(context.game.world)
        .find((b) => b.id === collision.bodyBId)
      for (const body of [bodyA, bodyB]) {
        if (body?.data?.originalBounds) {
          body.shapes[0].bounds = body.data.originalBounds * 1.25
          if (!body.data?.deflate) {
            const other = body === bodyA ? bodyB : bodyA
            if (other && !other.static) {
              const vec = physics.subtractVec2(other.center, body.center)
              other.velocity = physics.addVec2(
                other.velocity,
                physics.scaleVec2(physics.normalize(vec), 300)
              )
            }
          }
          body.data.deflate = Rune.gameTime() + 1000
        }
      }
    }
    if (firstSet.length > 0 || secondSet.length > 0) {
      const maxDepth = Math.max(
        ...firstSet.map((c) => c.depth),
        ...secondSet.map((c) => c.depth)
      )

      const event: CollisionEvent = {
        id: context.game.nextId++,
        maxDepth,
        type: "collision",
      }
      context.game.events.push(event)
    }

    let ballMoving = false
    for (const body of physics.enabledBodies(context.game.world)) {
      if (body.data) {
        if (body.data.deflate && body.data.deflate < Rune.gameTime()) {
          delete body.data.deflate
          body.shapes[0].bounds = body.data.originalBounds
        }
      }

      // theres a ball still moving
      if (body.data.playerId && !body.static && body.restingTime < 1) {
        ballMoving = true
      }
    }

    if (!ballMoving) {
      for (let i = 0; i < 5; i++) {
        physics.worldStep(30, context.game.world)
      }
    }

    for (const body of [...context.game.world.dynamicBodies]) {
      const distanceToGoal = physics.lengthVec2(
        physics.subtractVec2(context.game.goal, body.center)
      )
      if (distanceToGoal < body.shapes[0].bounds + goalSize) {
        context.game.completed.push(body.data.playerId)
        physics.removeBody(context.game.world, body)
        const event: SinkEvent = {
          id: context.game.nextId++,
          playerId: body.data.playerId,
          type: "sink",
        }
        context.game.events.push(event)

        if (
          !context.game.persisted[body.data.playerId] ||
          !context.game.persisted[body.data.playerId].pars
        ) {
          context.game.persisted[body.data.playerId] = {
            pars: [],
            scores: [],
          }
        }

        const player = context.game.players?.find(
          (p) => p.playerId === body.data.playerId
        )
        if (player) {
          const hole =
            selectCourses[context.game.selectedCourse].holes[
              context.game.courseNumber
            ]
          const par = courseInstances[hole].par
          const score = player.shots
          context.game.persisted[body.data.playerId].pars[hole] = par
          const currentScore =
            context.game.persisted[body.data.playerId].scores[hole]
          if (!currentScore || score < currentScore) {
            context.game.persisted[body.data.playerId].scores[hole] = score
          }
        }
      }
    }
    for (const body of context.game.world.dynamicBodies) {
      if (
        body.center.y >
        physics.getWorldBounds(context.game.world, true).max.y + 100
      ) {
        body.velocity.x = 0
        body.velocity.y = 0
        body.shapes[0].center.x =
          body.center.x =
          body.averageCenter.x =
          body.centerOfPhysics.x =
            body.data.initialX
        body.shapes[0].center.y =
          body.center.y =
          body.averageCenter.y =
          body.centerOfPhysics.y =
            body.data.initialY
        body.data.outOfBounds = true
      }
    }

    // if the world is at rest remove any bodies that should be
    // there because players left
    for (const body of context.game.world.dynamicBodies.filter(
      (b) => b.data.playerId
    )) {
      const expectedId = body.data.playerId
      if (!context.game.players.find((p) => p.playerId === expectedId)) {
        // player has left the game
        physics.removeBody(context.game.world, body)
      }
    }
    context.game.courseComplete =
      context.game.completed.length == context.game.players.length

    if (MANIA_MODE) {
      nextTurn(context.game)
    }
    if (
      context.game.nextTurnAt !== 0 &&
      Rune.gameTime() > context.game.nextTurnAt
    ) {
      nextTurn(context.game)
      context.game.nextTurnAt = 0
    } else if (
      context.game.whoseTurn &&
      !context.allPlayerIds.includes(context.game.whoseTurn)
    ) {
      nextTurn(context.game)
    }

    if (
      context.game.nextCourseAt !== 0 &&
      Rune.gameTime() > context.game.nextCourseAt
    ) {
      context.game.nextCourseAt = 0
      loadNextCourse(context.game)
    }
  },
  actions: {
    dragUpdate: (
      params: { powerDragging: boolean; px: number; py: number; power: number },
      context
    ) => {
      context.game.powerDragging = params.powerDragging
      context.game.px = params.px
      context.game.py = params.py
      context.game.power = params.power
    },
    shoot: (params: { dx: number; dy: number; power: number }, context) => {
      const player = context.game.players?.find(
        (p) => p.playerId === context.playerId
      )
      if (player) {
        player.shots++
        player.totalShots++
        context.game.shotsThisCourse++

        const body = context.game.world.dynamicBodies.find(
          (b) => b.data?.playerId === context.playerId
        )
        if (body) {
          applyShoot(
            context.game.world,
            body.id,
            params.dx,
            params.dy,
            params.power
          )
        }
        const event: ShootEvent = {
          id: context.game.nextId++,
          playerId: context.playerId,
          type: "shoot",
          dx: params.dx,
          dy: params.dy,
          power: params.power,
        }

        context.game.events.push(event)
      }
    },
    endTurn: (params, context) => {
      if (context.game.whoseTurn === context.playerId) {
        context.game.nextTurnAt = Rune.gameTime() + 1000
      }
    },
    selectLevel: (params: { course: number; hole: number }, context) => {
      // do nothing so far
      let hole = params.hole
      if (hole === -1) {
        hole = selectCourses[params.course].holes[0]
      }

      context.game.selectedCourse = params.course
      context.game.selectedHole = params.hole
      nextTurn(context.game)
      context.game.courseNumber =
        selectCourses[params.course].holes.indexOf(hole) - 1
      loadNextCourse(context.game)
    },
  },
})
