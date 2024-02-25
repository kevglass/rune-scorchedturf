import type { OnChangeAction, OnChangeEvent, PlayerId, Players, RuneClient } from "rune-games-sdk/multiplayer"
import { physics, xml } from "togl/logic";
import { ASSETS } from "./lib/rawassets";

export const localPhysics = true;
export const ballSize = 18;
export const maxPower = 200;

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

export interface GameEvent {
  id: number;
  type: "shoot" | "addPlayer" | "removePlayer";
  playerId: string;
  dx?: number;
  dy?: number;
  power?: number;
}

export interface Course {
  start: physics.Vector2;
  goal: physics.Vector2;
  world: physics.World;
}

export interface PlayerBall {
  playerId: PlayerId;
  playerType: number;
}

export enum MaterialType {
  GRASS = 1,
  STONE0 = 2,
  STONE1 = 3,
  STONE2 = 4,
  STONE3 = 5,
}

const SVG_COLOR_MAP: Record<string, MaterialType> = {
  "#a5e306": MaterialType.GRASS,
  "#a8cbcc": MaterialType.STONE0,
  "#8bb8be": MaterialType.STONE1,
  "#5b8b95": MaterialType.STONE2,
  "#487d8f": MaterialType.STONE3,
}

export function loadCourse(name: string): Course {
  const content = ASSETS[name];
  const document = xml.parseXml(content);

  const world = physics.createWorld(physics.newVec2(0, 200));
  // global friction 
  world.damp = world.angularDamp = 0.94;

  const root = document.svg.g;
  const start: physics.Vector2 = physics.newVec2(0, 0);
  const goal: physics.Vector2 = physics.newVec2(0, 0);

  if (!Array.isArray(root.ellipse)) {
    root.ellipse = [root.ellipse];
  }
  for (const circle of root.ellipse) {
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

    const body = physics.createCircle(world, physics.newVec2(cx, cy), rx, 0, 1, 0.5);
    const type = SVG_COLOR_MAP[circle.fill] ?? MaterialType.GRASS;
    body.data = { type };

    physics.addBody(world, body);
  }

  if (!Array.isArray(root.rect)) {
    root.rect = [root.rect];
  }
  for (const rect of root.rect) {
    const height = Math.floor(Number.parseFloat(rect.height ?? "0"));
    const width = Math.floor(Number.parseFloat(rect.width ?? "0"));
    const cx = Math.floor(Number.parseFloat(rect.x ?? "0") + (width / 2));
    const cy = Math.floor(Number.parseFloat(rect.y ?? "0") + (height / 2));

    const transform = parseSVGTransform(rect.transform);
    const body = physics.createRectangle(world, physics.newVec2(cx, cy), width, height, 0, 1, 0.5);
    const type = SVG_COLOR_MAP[rect.fill] ?? MaterialType.GRASS;
    body.data = { type };

    if (transform.rotate) {
      physics.rotateShape(body, transform.rotate[0] * Math.PI / 180);
    }

    physics.addBody(world, body);
  }

  return {
    world, start, goal
  };
}

export interface GameState {
  course: Course;
  players: PlayerBall[];
  whoseTurn?: PlayerId;
  startPhysicsTime: number;
  events: GameEvent[];
  executed: number;
  nextId: number;
  nextTurnAtRest: boolean;
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
  endTurn: () => void;
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

function applyShoot(world: physics.World, bodyId: number, dx: number, dy: number, power: number): void {
  const body = world.dynamicBodies.find(b => b.id === bodyId);
  if (body) {
    body.velocity.x += (dx * power);
    body.velocity.y += (dy * power)
  }
}

export function processUpdates(game: GameState, world: physics.World, executed: number): number {
  for (const event of game.events) {
    if (event.id > executed) {
      if (event.type === "shoot" && event.dx && event.dy && event.power) {
        const body = world.dynamicBodies.find(b => b.data?.playerId === event.playerId);
        if (body) {
          applyShoot(world, body.id, event.dx, event.dy, event.power);
        }
      }

      executed = event.id;
    }
  }

  return executed;
}

export function runUpdate(game: GameState, world: physics.World, executed: number): number {
  executed = processUpdates(game, world, executed);

  if (game.whoseTurn) {
    const player = game.players.find(p => p.playerId === game.whoseTurn);
    if (player && !world.dynamicBodies.find(b => b.data?.playerId === player.playerId)) {
      const ball = physics.createCircle(world, physics.newVec2(game.course.start.x, game.course.start.y), ballSize, 10, 1, 1);
      ball.data = { playerId: player.playerId };
      physics.addBody(world, ball);
    }
  }

  // this runs really slow - because the proxies have been remove 12-20ms
  // worldStep(15, context.game.world); 

  if (Rune.gameTime() - game.startPhysicsTime < 2000 ||
    !physics.atRest(world)) {
    physics.worldStep(30, world);
    physics.worldStep(30, world);
  }

  return executed;
}

function nextTurn(state: GameState): void {
  if (state.players.length === 0) {
    return;
  }

  let index = state.players.findIndex(p => p.playerId === state.whoseTurn);
  if (index >= 0) {
    index++;
    if (index > state.players.length - 1) {
      index = 0;
    }
  } else {
    index = 0;
  }

  state.whoseTurn = state.players[index].playerId;
}

function addPlayer(world: physics.World, state: GameState, id: PlayerId): void {
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
    playerType
  });
}

function removePlayer(state: GameState, id: PlayerId): void {
  state.players = state.players.filter(p => p.playerId !== id);
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 4,
  setup: (allPlayerIds: PlayerId[]): GameState => {
    const course = loadCourse("course1.svg");
    const initialState: GameState = {
      course: course,
      players: [],
      startPhysicsTime: Rune.gameTime(),
      events: [],
      executed: 0,
      nextId: 1,
      nextTurnAtRest: false
    }

    for (const player of allPlayerIds) {
      addPlayer(course.world, initialState, player);
    }

    nextTurn(initialState);
    return initialState;
  },
  events: {
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
    if (!localPhysics) {
      context.game.executed = runUpdate(context.game, context.game.course.world, context.game.executed,);
    } else {
      context.game.executed = processUpdates(context.game, context.game.course.world, context.game.executed);
    }

    if (context.game.whoseTurn && !context.allPlayerIds.includes(context.game.whoseTurn)) {
      nextTurn(context.game);
    }
  },
  actions: {
    shoot: (params: { dx: number, dy: number, power: number }, context) => {
      const player = context.game.players?.find(p => p.playerId === context.playerId);
      if (player) {
        context.game.events.push({
          id: context.game.nextId++,
          playerId: context.playerId,
          type: "shoot",
          dx: params.dx,
          dy: params.dy,
          power: params.power
        })
        context.game.startPhysicsTime = Rune.gameTime() + 500;
      }
    },
    endTurn: (params, context) => {
      if (context.game.whoseTurn === context.playerId) {
        nextTurn(context.game);
      }
    }
  },
})