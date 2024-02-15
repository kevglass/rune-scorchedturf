import type { OnChangeAction, OnChangeEvent, PlayerId, Players, RuneClient } from "rune-games-sdk/multiplayer"
import { PhysicsWorld, physics } from "togl";

export interface GameState {
  world: PhysicsWorld;
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

Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 4,
  setup: (): GameState => {
    const initialState: GameState = {
      world: physics.createWorld()
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
  actions: {
    increment: ({ amount }, { game }) => {
    },
  },
})
