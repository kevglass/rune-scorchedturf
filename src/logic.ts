import type { OnChangeAction, OnChangeEvent, PlayerId, Players, RuneClient } from "rune-games-sdk/multiplayer"
import { physics, xml } from "togl/logic";
import { ASSETS } from "./lib/rawassets";

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

export interface Course {
  start: physics.Vector2;
  goal: physics.Vector2;
  world: physics.PhysicsWorld;
}

export interface PlayerBall {
  bodyId?: number;
  playerId: PlayerId;
  inPlay: boolean;
}

export enum MaterialType {
  EARTH = 1,
  GRASS = 2,
  STONE1 = 3,
  STONE2 = 4,
  STONE3 = 5,
}

const SVG_COLOR_MAP: Record<string, MaterialType> = {
  "#a5e306": MaterialType.GRASS,
  "#8bb8be": MaterialType.STONE1,
  "#5b8b95": MaterialType.STONE2,
  "#487d8f": MaterialType.STONE3,
}

export function loadCourse(name: string): Course {
  const content = ASSETS[name];
  const document = xml.parseXml(content);

  console.log(document);
  const world = physics.createWorld();
  const root = document.svg.g;
  const start: physics.Vector2 = physics.newVec2(0, 0);
  const goal: physics.Vector2 = physics.newVec2(0, 0);

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
    const type = SVG_COLOR_MAP[circle.fill] ?? MaterialType.EARTH;
    body.data = { type };
  }

  for (const rect of root.rect) {
    const height = Math.floor(Number.parseFloat(rect.height ?? "0"));
    const width = Math.floor(Number.parseFloat(rect.width ?? "0"));
    const cx = Math.floor(Number.parseFloat(rect.x ?? "0") + (width / 2));
    const cy = Math.floor(Number.parseFloat(rect.y ?? "0") + (height / 2));

    const transform = parseSVGTransform(rect.transform);
    const body = physics.createRectangle(world, physics.newVec2(cx, cy), width, height, 0, 1, 0.5);
    const type = SVG_COLOR_MAP[rect.fill] ?? MaterialType.EARTH;
    body.data = { type };

    if (transform.rotate) {
      physics.rotateShape(body, transform.rotate[0] *  Math.PI / 180);
    }
  }

  return { 
    world, start, goal
  };
}

export interface GameState {
  course: Course;
  players: PlayerBall[];
  whoseTurn?: PlayerId;
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
  // todo
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

function addPlayerBall(state: GameState, id: PlayerId): void {
  const player = state.players.find(p => p.playerId === id);
  if (player) {
    if (!player.bodyId) {
      const ball = physics.createCircle(state.course.world, physics.newVec2(state.course.start.x, state.course.start.y), 18, 1, 1, 1);
      ball.data = { playerId: id };
      player.bodyId = ball.id;
    }
  }
}

function removePlayerBall(state: GameState, id: PlayerId): void {
  const player = state.players.find(p => p.playerId === id);
  if (player) {
    if (player.bodyId) {
      const index = state.course.world.bodies.findIndex(b => b.id === player.bodyId);
      if (index >= 0) {
        state.course.world.bodies.splice(index, 1);
      }
    }
  }
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

function addPlayer(state: GameState, id: PlayerId): void {
  state.players.push({
    playerId: id,
    inPlay: false
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
      players: []
    }

    for (const player of allPlayerIds) {
      addPlayer(initialState, player);
    }

    nextTurn(initialState);

    return initialState;
  },
  events: {
    playerJoined: (playerId: PlayerId, context) => {
      // do nothing
      addPlayer(context.game, playerId);
    },
    playerLeft: (playerId: PlayerId, context) => {
      // do nothing
      if (context.game.whoseTurn === playerId) {
        nextTurn(context.game);
      }
      removePlayerBall(context.game, playerId);
      removePlayer(context.game, playerId);
    },
  },
  updatesPerSecond: 30,
  update: (context) => {
    if (context.game.whoseTurn) {
      const player = context.game.players.find(p => p.playerId === context.game.whoseTurn);
      if (player) {
        if (!player.bodyId) {
          addPlayerBall(context.game, player.playerId);
        }
      }
    }
    // this runs really slow - because the proxies have been remove 12-20ms
    // worldStep(15, context.game.world); 

    // this runs really quick - because the proxies have been removed 0-1ms
    const world = JSON.parse(JSON.stringify(context.game.course.world));
    physics.worldStep(15, world);
    context.game.course.world = world;
  },
  actions: {
  },
})