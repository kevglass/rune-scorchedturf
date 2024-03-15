import type { OnChangeAction, OnChangeEvent, PlayerId, Players, RuneClient } from "rune-games-sdk/multiplayer"
import { physics, xml } from "togl/logic";
import { ASSETS } from "./lib/rawassets";

export const ballSize = 18;
export const maxPower = 200;
export const goalSize = 30;

type GameEvent = ShootEvent | GameOverEvent | NewCourseEvent;

export interface CommonEvent {
  id: number;
}

export interface ShootEvent extends CommonEvent {
  type: "shoot",
  playerId: string;
  dx: number;
  dy: number;
  power: number;
}

export interface NewCourseEvent extends CommonEvent {
  type: "newCourse",
  courseNumber: number
}

export interface GameOverEvent extends CommonEvent {
  type: "gameOver"
}

export interface Course {
  start: physics.Vector2;
  goal: physics.Vector2;
  world: physics.World;
  name: string;
  par: number;
}

export interface PlayerDetails {
  playerId: PlayerId;
  playerType: number;
  shots: number;
  totalShots: number;
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
  WOOD = 11
}

const SVG_COLOR_MAP: Record<string, MaterialType> = {
  "#a5e306": MaterialType.GRASS,
  "#a8cbcc": MaterialType.STONE0,
  "#8bb8be": MaterialType.STONE1,
  "#5b8b95": MaterialType.STONE2,
  "#487d8f": MaterialType.STONE3,
  "#ffff00": MaterialType.BOUNCER,
  "#0000ff": MaterialType.BLOCK,
  "#00ffff": MaterialType.PEG,
  "#ff00ff": MaterialType.WOOD,
}

export const courses: string[] = [
  "course1.svg",
  "course2.svg",
  "course3.svg",
  "course5.svg",
  "course4.svg",
];

export const courseInstances: Course[] = [];
for (const name of courses) {
  courseInstances.push(loadCourse(name));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSVGTransform(a: any) {
  if (!a) {
    return {};
  }

  a = a.replaceAll(" ", ",");
  const b: Record<string, number[]> = {};
  for (const i in a = a.match(/(\w+\((-?\d+\.?\d*e?-?\d*,?)+\))+/g)) {
    const c = a[i].match(/[\w.-]+/g);
    b[c.shift()] = c.map((i: string) => Number.parseFloat(i));
  }
  return b;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBodyLogic(element: any, world: physics.World, body: physics.Body): void {
  if (body.data.type === MaterialType.BOUNCER) {
    body.data.originalBounds = body.bounds;
  }
  if (element.class === "spin") {
    const pin = physics.createCircle(world, physics.newVec2(body.center.x, body.center.y), 0, 0, 1, 0.5);
    physics.addBody(world, pin);
    pin.data = {};
    body.data.pinned = true;
    physics.disableBody(world, pin);
    physics.createJoint(world, pin, body, 1, 0);
  }
}

export function loadCourse(name: string): Course {
  const content = ASSETS[name];
  const document = xml.parseXml(content);

  const world = physics.createWorld(physics.newVec2(0, 200));
  // global friction 
  world.damp = world.angularDamp = 0.94;
  world.jointRestriction = 5;

  const root = document.svg.g;
  const start: physics.Vector2 = physics.newVec2(0, 0);
  const goal: physics.Vector2 = physics.newVec2(0, 0);

  const text = root.title.__text;
  const parts = text.split(",");
  const courseName = parts[0];
  const par = Number.parseInt(parts[1]);

  if (!Array.isArray(root.ellipse)) {
    root.ellipse = [root.ellipse];
  }
  for (const circle of root.ellipse) {
    // any setting of opacity removes it from the scene
    if (circle.opacity) {
      continue;
    }

    const cx = Math.floor(Number.parseFloat(circle.cx ?? "0"));
    const cy = Math.floor(Number.parseFloat(circle.cy ?? "0"));
    const rx = Math.floor(Number.parseFloat(circle.rx ?? "0"));
    const fill = circle.fill;

    if (fill === "#00ff00") {
      // green is the start point
      start.x = cx;
      start.y = cy;
      continue;
    }
    if (fill === "#ff0000") {
      // red is the goal point
      goal.x = cx;
      goal.y = cy;
      continue;
    }

    const body = physics.createCircle(world, physics.newVec2(cx, cy), rx, circle.class === "spin" || circle.class === "dynamic" ? 1 : 0, 1, 0.5);
    const type = SVG_COLOR_MAP[circle.fill] ?? MaterialType.GRASS;
    body.data = { type, svgId: circle.id }

    const transform = parseSVGTransform(circle.transform);
    if (transform.rotate) {
      physics.rotateBody(body, transform.rotate[0] * Math.PI / 180);
    }

    physics.addBody(world, body);

    if (circle.class && fill === "#000000") {
      body.data.sprite = circle.class;
      physics.disableBody(world, body);
    }

    applyBodyLogic(circle, world, body);
  }

  if (!Array.isArray(root.rect)) {
    root.rect = [root.rect];
  }
  for (const rect of root.rect) {
    // any setting of opacity removes it from the scene
    if (rect.opacity) {
      continue;
    }

    const height = Math.floor(Number.parseFloat(rect.height ?? "0"));
    const width = Math.floor(Number.parseFloat(rect.width ?? "0"));
    const cx = Math.floor(Number.parseFloat(rect.x ?? "0") + (width / 2));
    const cy = Math.floor(Number.parseFloat(rect.y ?? "0") + (height / 2));

    const transform = parseSVGTransform(rect.transform);
    const body = physics.createRectangle(world, physics.newVec2(cx, cy), width, height, rect.class === "spin" || rect.class === "dynamic" ? 1 : 0, 1, 0.5);
    const type = SVG_COLOR_MAP[rect.fill] ?? MaterialType.GRASS;
    body.data = { type, svgId: rect.id };

    if (transform.rotate) {
      physics.rotateBody(body, transform.rotate[0] * Math.PI / 180);
    }
    if (rect.class === "water") {
      body.permeability = 0.05;
      body.data.type = MaterialType.WATER;
    }

    physics.addBody(world, body);

    applyBodyLogic(rect, world, body);
  }

  if (root.polyline) {
    if (!Array.isArray(root.polyline)) {
      root.polyline = [root.polyline];
    }
    for (const line of root.polyline) {
      const parts = line["se:connector"].split(" ");
      const bodyA = physics.allBodies(world).find(b => b.data.svgId === parts[0]);
      const bodyB = physics.allBodies(world).find(b => b.data.svgId === parts[1]);

      if (bodyA && bodyB) {
        physics.createJoint(world, bodyA, bodyB, 1, 0);
      }
    }
  }

  return {
    world, start, goal, name: courseName, par
  };
}


export interface ActionListener {
  shot(): void;

  hole(): void;

  collision(maxDepth: number): void;
}

export interface GameState {
  gameTime: number;
  players: PlayerDetails[];
  joinedPlayers: string[];
  whoseTurn?: PlayerId;
  nextTurnAt: number;
  nextCourseAt: number;
  events: GameEvent[];
  executed: number;
  nextId: number;
  courseNumber: number;
  completed: string[];
  gameOver: boolean;
  startGame: boolean;
  frameCount: number;
  totalPar: number;
  shotsThisCourse: number;

  powerDragging: boolean;
  px: number;
  py: number;
  power: number;

  dynamics: physics.DynamicRigidBody[];
}

// Quick type so I can pass the complex object that is the 
// Rune onChange blob around without ugliness. 
export type GameUpdate = {
  game: GameState;
  action?: OnChangeAction<GameActions>;
  event?: OnChangeEvent;
  yourPlayerId: PlayerId | undefined;
  players: Players;
  rollbacks: OnChangeAction<GameActions>[];
  previousGame: GameState;
  futureGame?: GameState;
};

type GameActions = {
  shoot: (params: { dx: number, dy: number, power: number }) => void;
  reachedGoal: (params: { playerId: string, courseId: number }) => void;
  dragUpdate: (params: { powerDragging: boolean, px: number, py: number, power: number }) => void;
  endTurn: () => void;
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

function nextTurn(state: GameState): void {
  if (state.players.length === 0) {
    return;
  }
  if (state.nextCourseAt !== 0) {
    return;
  }
  const possible = state.players.filter(p => !state.completed.includes(p.playerId));
  if (possible.length === 0) {
    if (state.courseNumber >= courses.length - 1) {
      state.events.push({
        id: state.nextId++,
        type: "gameOver",
      });
      state.gameOver = true;
      Rune.gameOver();
    } else {
      state.nextCourseAt = Rune.gameTime() + 4000;
    }
    return;
  }

  let current = state.whoseTurn ? state.players.findIndex(p => p.playerId === state.whoseTurn) : -1;
  do {
    current++;
    if (current >= state.players.length) {
      current = 0;
    }
  } while (state.completed.includes(state.players[current].playerId));

  state.whoseTurn = state.players[current].playerId;
}

function addPlayer(state: GameState, id: PlayerId): void {
  let playerType = 0;
  for (playerType = 0; playerType < 6; playerType++) {
    if (!state.players.find(p => p.playerType === playerType)) {
      break;
    }
  }
  if (playerType > 5) {
    playerType = 0;
  }

  state.players.push({
    playerId: id,
    playerType,
    shots: 0,
    totalShots: Math.max(...state.players.map(p => p.totalShots), 0)
  });
}

function removePlayer(state: GameState, id: PlayerId): void {
  state.players = state.players.filter(p => p.playerId !== id);
  state.joinedPlayers = state.joinedPlayers.filter(p => p !== id);
}

function loadNextCourse(game: GameState): void {
  game.courseNumber++;
  startCourse(game, courseInstances[game.courseNumber]);
}

// let totalTime = 0;

function startCourse(game: GameState, course: Course): void {
  game.totalPar += course.par;
  game.shotsThisCourse = 0;

  game.events.push({
    id: game.nextId++,
    type: "newCourse",
    gameTime: Rune.gameTime(),
    courseNumber: game.courseNumber
  } as NewCourseEvent);
  game.completed = [];


  for (const player of game.joinedPlayers) {
    if (!game.players.find(p => p.playerId === player)) {
      addPlayer(game, player);
    }
  }

  for (const player of game.players) {
    player.shots = 0;
  }

  game.whoseTurn = game.players[0].playerId;
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 6,
  setup: (allPlayerIds: PlayerId[]): GameState => {
    const course = courseInstances[0];
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

      dynamics: course.world.dynamicBodies
    }

    for (const player of allPlayerIds) {
      addPlayer(initialState, player);
    }

    // for (const player of initialState.players) {
    //   const ball = physics.createCircle(course.world, physics.newVec2(course.start.x + (initialState.players.indexOf(player) * 1), course.start.y), ballSize, 10, 1, 1);
    //   ball.data = { playerId: player.playerId };
    //   physics.addBody(course.world, ball);
    //   ball.velocity.x = 500;
    //   ball.velocity.y = -300;
    // }

    nextTurn(initialState);
    startCourse(initialState, course);

    return initialState;
  },
  events: {
    playerJoined: (playerId: PlayerId, context) => {
      if (playerId) {
        context.game.joinedPlayers.push(playerId);
      }
    },
    playerLeft: (playerId: PlayerId, context) => {
      // do nothing
      if (context.game.whoseTurn === playerId) {
        nextTurn(context.game);
      }
      removePlayer(context.game, playerId);
    },
  },
  updatesPerSecond: 30,
  update: (context) => {
    context.game.startGame = false;
    context.game.frameCount++;
    context.game.gameTime = Rune.gameTime();

    // 1484.0000032782555 (per frame= 5.936000013113022)
    // if (context.game.frameCount < 250) {
    //   const before = performance.now();
    physics.worldStep(15, courseInstances[context.game.courseNumber].world, context.game.dynamics);
    //   // physics.worldStep(15, context.game.course.world);
    //   const after = performance.now();
    //   // eslint-disable-next-line rune/no-global-scope-mutation
    //   totalTime += (after - before);
    // }

    if (context.game.frameCount === 250) {
      // console.log(totalTime + " (per frame= " + (totalTime / context.game.frameCount) +")");
    }

    if (context.game.nextTurnAt !== 0 && Rune.gameTime() > context.game.nextTurnAt) {
      nextTurn(context.game);
      context.game.nextTurnAt = 0;
    } else if (context.game.whoseTurn && !context.allPlayerIds.includes(context.game.whoseTurn)) {
      nextTurn(context.game);
    }

    if (context.game.nextCourseAt !== 0 && Rune.gameTime() > context.game.nextCourseAt) {
      context.game.nextCourseAt = 0;
      loadNextCourse(context.game);
    }
  },
  actions: {
    dragUpdate: (params: { powerDragging: boolean, px: number, py: number, power: number }, context) => {
      context.game.powerDragging = params.powerDragging;
      context.game.px = params.px;
      context.game.py = params.py;
      context.game.power = params.power;
    },
    reachedGoal: (params: { playerId: string, courseId: number }, context) => {
      if (params.courseId === context.game.courseNumber) {
        context.game.completed.push(params.playerId);
      }
    },
    shoot: (params: { dx: number, dy: number, power: number }, context) => {
      const player = context.game.players?.find(p => p.playerId === context.playerId);
      if (player) {
        player.shots++;
        player.totalShots++;
        context.game.shotsThisCourse++;

        const event: ShootEvent = {
          id: context.game.nextId++,
          playerId: context.playerId,
          type: "shoot",
          dx: params.dx,
          dy: params.dy,
          power: params.power
        };

        context.game.events.push(event);
      }
    },
    endTurn: (params, context) => {
      if (context.game.whoseTurn === context.playerId) {
        context.game.nextTurnAt = Rune.gameTime() + 1000;
      }
    }
  },
})