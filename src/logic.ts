import type { OnChangeAction, OnChangeEvent, PlayerId, Players, RuneClient } from "rune-games-sdk/multiplayer"
import { PhysicsWorld, physics, resources } from "togl";
import { ASSETS, resolveAllAssetImports } from "./lib/util";

const TO_RADIANS = Math.PI / 180;

function parseSVGTransform(a: any) {
  if (!a) {
    return {};
  }

  a = a.replaceAll(" ", ",");
  console.log(a);
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

  let index = 0;
  for (const rect of root.getElementsByTagName("rect")) {
    const height = Math.floor(Number.parseFloat(rect.getAttribute("height")!));
    const width = Math.floor(Number.parseFloat(rect.getAttribute("width")!));
    const cx = Math.floor(Number.parseFloat(rect.getAttribute("x")!) + (width / 2));
    const cy = Math.floor(Number.parseFloat(rect.getAttribute("y")!) + (height / 2));

    const transform = parseSVGTransform(rect.getAttribute("transform"));
    const shape = physics.createRectangle(world, physics.Vec2(cx, cy), width, height, 0, 1, 0.5, false);
    if (transform.rotate) {
      physics.rotateShape(shape, transform.rotate[0] * TO_RADIANS);
    }

    index++;
  }
  physics.createCircle(world, physics.Vec2(130, 100), 10, 1, 1, 1);

  return world;
}

export interface GameState {
  world: PhysicsWorld;
  fps: number;
  frameCount: number;
  lastFrameCount: number;
  frameTime: number;
  averageFrameTime: number;
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
  increment: (params: { amount: number }) => void
}

declare global {
  const Rune: RuneClient<GameState, GameActions>
}

async function start(): Promise<void> {
  await resolveAllAssetImports();
  startRune();
}

function startRune() {
  Rune.initLogic({
    minPlayers: 1,
    maxPlayers: 4,
    setup: (): GameState => {
      const world = loadCourse("course1.svg");
      const initialState: GameState = {
        world: world,
        frameTime: 0,
        frameCount: 0,
        fps: 0,
        lastFrameCount: 0,
        averageFrameTime: 0
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
      // if (Date.now() - context.game.lastFrameCount > 1000) {
      //   context.game.lastFrameCount = Date.now();
      //   context.game.fps = context.game.frameCount;
      //   context.game.averageFrameTime = context.game.frameTime / context.game.frameCount;
      //   context.game.frameCount = 0;
      //   context.game.frameTime = 0;
      // }

      // const start = Date.now();
      physics.worldStep(15, context.game.world);
      // context.game.frameTime += Date.now() - start;
      // context.game.frameCount++;
    },
    actions: {
      increment: ({ amount }, { game }) => {
      },
    },
  })
}

start();