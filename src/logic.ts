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

export function createTestScene(): physics.PhysicsWorld {
  const world = physics.createWorld();

  physics.createCircle(world, physics.Vec2(140, 100), 10, 1, 1, 1);
  physics.createRectangle(world, physics.Vec2(180, 100), 10, 10, 1, 1, 1);
  
  return world;
}

export function loadCourse(name: string): physics.PhysicsWorld {
  const content = ASSETS[name];
  const document = xml.parseXml(content);

  console.log(document);
  const world = physics.createWorld();
  const root = document.svg.g;

  const ball = physics.createCircle(world, physics.Vec2(140, 100), 10, 1, 1, 1);
  physics.createCircle(world, physics.Vec2(200, 100), 10, 1, 1, 1);

  const test1 = physics.createCircle(world, physics.Vec2(170, 50), 10, 1, 1, 1);
  const test2 = physics.createCircle(world, physics.Vec2(200, 50), 10, 1, 1, 1);
  physics.createJoint(world, test1, test2, 1);

  let index = 0;
  let anchor: physics.Body = ball;
  for (const rect of root.rect) {
    const height = Math.floor(Number.parseFloat(rect.height ?? "0"));
    const width = Math.floor(Number.parseFloat(rect.width ?? "0"));
    const cx = Math.floor(Number.parseFloat(rect.x ?? "0") + (width / 2));
    const cy = Math.floor(Number.parseFloat(rect.y ?? "0") + (height / 2));

    const transform = parseSVGTransform(rect.transform);
    const body = physics.createRectangle(world, physics.Vec2(cx, cy), width, height, 0, 1, 0.5);
    if (transform.rotate) {
      physics.rotateShape(body, transform.rotate[0] *  Math.PI / 180);
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
  world: physics.PhysicsWorld;
  totalFrames: number
}

// interface Stats {
//   maxArrayLength: number;
//   maxKeysInObject: number;
//   nestingDepth: number;
// }

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// function getStats(object: any, stats: Stats, depth: number) {
//   stats.nestingDepth = Math.max(depth, stats.nestingDepth);

//   if (Array.isArray(object)) {
//     stats.maxArrayLength = Math.max(stats.maxArrayLength, object.length);
//     for (const obj of object) {
//       getStats(obj, stats, depth);
//     }
//   } else if (typeof object === 'object' && object !== null) {
//     stats.maxKeysInObject = Object.keys(object).length;
//     for (const key in object) {
//       getStats(object[key], stats, depth+1);
//     }
//   }
// }

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// function mutativeRelatedStats(object: any) {
//   const stats: Stats = {
//     maxArrayLength: 0,
//     maxKeysInObject: 0,
//     nestingDepth: 0
//   }

//   getStats(object, stats, 0);

//   return JSON.stringify(stats);
// }

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
  jump: () => void
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 4,
  setup: (): GameState => {
    // const world = createDemoScene(30, true); 
    const world = createTestScene(); //loadCourse("course1.svg");
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

    // // Dump out some debug to see if theres something 
    // // hard for mutative to deal with
    // if (context.game.totalFrames === 300) {
    //   console.log(JSON.stringify(context.game.world));
    //   console.log(mutativeRelatedStats(context.game.world));
    // }

    // this runs really slow - cause the proxies have been remove 12-20ms
    // worldStep(15, context.game.world); 
    // this runs really quick - cause the proxies have been removed 0-1ms
    const world = JSON.parse(JSON.stringify(context.game.world));
    physics.worldStep(15, world);
    context.game.world = world;

  },
  actions: {
    jump: (params, { game }) => {
      const ball = game.world.bodies.find(b => b.id === 1);
      if (ball) {
        ball.velocity.y = -100;
      }
    },
  },
})