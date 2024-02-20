import type { OnChangeAction, OnChangeEvent, PlayerId, Players, RuneClient } from "rune-games-sdk/multiplayer"
import { PhysicsWorld, physics, resources } from "togl";
import { ASSETS } from "./lib/util";

const TO_RADIANS = Math.PI / 180;

function parseSVGTransform(a: any) {
  if (!a) {
    return {};
  }

  a = a.replaceAll(" ", ",");
  const b: Record<string, number[]> = {};
  for (var i in a = a.match(/(\w+\((\-?\d+\.?\d*e?\-?\d*,?)+\))+/g)) {
    var c = a[i].match(/[\w\.\-]+/g);
    b[c.shift()] = c.map((i: string) => Number.parseFloat(i));
  }
  return b;
}

export function loadCourse(name: string): PhysicsWorld {
  const xml = resources.loadTextSync(ASSETS[name]);
  const parser = new DOMParser();
  const document = parser.parseFromString(xml, "text/xml");

  const world = physics.createWorld();
  const root = document.getElementsByTagName("g")[0];

  const ball = physics.createCircle(world, physics.Vec2(140, 100), 10, 1, 1, 1);
  physics.createCircle(world, physics.Vec2(200, 100), 10, 1, 1, 1);
  
  const test1 = physics.createCircle(world, physics.Vec2(170, 50), 10, 1, 1, 1);
  const test2 = physics.createCircle(world, physics.Vec2(200, 50), 10, 1, 1, 1);
  physics.createJoint(world, test1, test2, 1);

  let index = 0;
  let anchor = undefined;
  for (const rect of root.getElementsByTagName("rect")) {
    const height = Math.floor(Number.parseFloat(rect.getAttribute("height")!));
    const width = Math.floor(Number.parseFloat(rect.getAttribute("width")!));
    const cx = Math.floor(Number.parseFloat(rect.getAttribute("x")!) + (width / 2));
    const cy = Math.floor(Number.parseFloat(rect.getAttribute("y")!) + (height / 2));

    const transform = parseSVGTransform(rect.getAttribute("transform"));
    const body = physics.createRectangle(world, physics.Vec2(cx, cy), width, height, index === 1 ? 1 : 0, 1, 0.5);
    if (transform.rotate) {
      physics.rotateShape(body, transform.rotate[0] * TO_RADIANS);
    }
    if (index === 0) {
      anchor = body;
    }

    index++;
  }
  if (anchor) {
    const test3 = physics.createCircle(world, physics.Vec2(165, 220), 10, 1, 1, 1);
    physics.createJoint(world, anchor, test3, 1);
  }

  return world;
}

export interface GameState {
  world: PhysicsWorld;
  totalFrames: number
}

interface Stats {
  maxArrayLength: number;
  maxKeysInObject: number;
  nestingDepth: number;
}

function getStats(object: any, stats: Stats, depth: number) {
  stats.nestingDepth = Math.max(depth, stats.nestingDepth);

  if (Array.isArray(object)) {
    stats.maxArrayLength = Math.max(stats.maxArrayLength, object.length);
    for (const obj of object) {
      getStats(obj, stats, depth);
    }
  } else if (typeof object === 'object' && object !== null) {
    stats.maxKeysInObject = Object.keys(object).length;
    for (const key in object) {
      getStats(object[key], stats, depth+1);
    }
  }
}

function mutativeRelatedStats(object: any) {
  const stats: Stats = {
    maxArrayLength: 0,
    maxKeysInObject: 0,
    nestingDepth: 0
  }
  
  getStats(object, stats, 0);

  return JSON.stringify(stats);
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
  jump: (params: {}) => void
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 4,
  setup: (): GameState => {
    const world = physics.createDemoScene(10, true); //loadCourse("course1.svg");
    const initialState: GameState = {
      world: world,
      totalFrames: 0
    }

    return initialState;
  },
  events: {
    playerJoined: () => {
      // do nothing
    },
    playerLeft: () => {
      // do nothing
    },
  },
  updatesPerSecond: 30,
  update: (context) => {
    context.game.totalFrames++;

    if (context.game.totalFrames === 300) {
      console.log(JSON.stringify(context.game.world));
      console.log(mutativeRelatedStats(context.game.world));
    }

    // this runs really slow - cause the proxies have been remove 12-20ms
    // physics.worldStep(15, context.game.world); 
    // this runs really quick - cause the proxies have been removed 0-1ms
    const world = JSON.parse(JSON.stringify(context.game.world));
    physics.worldStep(15, world); 
    context.game.world = world;

  },
  actions: {
    jump: ({}, { game }) => {
      const ball = game.world.bodies.find(b => b.id === 1);
      if (ball) {
        ball.velocity.y = -100;
      }
    },
  },
})