import type { OnChangeAction, OnChangeEvent, PlayerId, Players, RuneClient } from "rune-games-sdk/multiplayer"
import { PhysicsWorld, physics } from "togl";

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

function createLevel(state: GameState): void {
  physics.createRectangle(state.world, physics.Vec2(200, 400), 400, 20, 0, 1, 0);
  physics.createRectangle(state.world, physics.Vec2(10, 350), 20, 80, 0, 1, 0);
  physics.createRectangle(state.world, physics.Vec2(380, 350), 20, 80, 0, 1, 0);
  physics.rotateShape(physics.createRectangle(state.world, physics.Vec2(150, 150), 100, 20, 0, 1, 0.3), (Math.PI/8));
  physics.rotateShape(physics.createRectangle(state.world, physics.Vec2(250, 200), 100, 20, 0, 1, 0.3), -(Math.PI/8));
  physics.rotateShape(physics.createRectangle(state.world, physics.Vec2(150, 250), 100, 20, 0, 1, 0.3), (Math.PI/8));
  physics.rotateShape(physics.createRectangle(state.world, physics.Vec2(250, 300), 100, 20, 0, 1, 0.3), -(Math.PI/8));
  physics.createCircle(state.world,  physics.Vec2(150, 100), 10, 1, 1, 1);
}

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 4,
  setup: (): GameState => {
    const initialState: GameState = {
      world: physics.createWorld(),
      frameTime: 0,
      frameCount: 0,
      fps: 0,
      lastFrameCount: 0,
      averageFrameTime: 0
    }

    createLevel(initialState);
    
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
    if (Date.now() - context.game.lastFrameCount > 1000) {
      context.game.lastFrameCount = Date.now();
      context.game.fps = context.game.frameCount;
      context.game.averageFrameTime = context.game.frameTime / context.game.frameCount;
      context.game.frameCount = 0;
      context.game.frameTime = 0;
    }

    const start = Date.now();
    physics.worldStep(15, context.game.world);
    context.game.frameTime += Date.now() - start;
    context.game.frameCount++;
  },
  actions: {
    increment: ({ amount }, { game }) => {
    },
  },
})

