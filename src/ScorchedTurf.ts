import { Game, graphics} from "./lib/graphics";
import { GameState, GameUpdate } from "./logic";

export class ScorchedTurf implements Game {
    game?: GameState;
    
    start(): void {
        // register ourselves as the input listener so
        // we get nofified of mouse presses
        graphics.registerGame(this);

        // tell rune to let us know when a game
        // update happens
        Rune.initClient({
            onChange: (update) => {
                this.gameUpdate(update);
            },
        });

        // start the rendering loop
        requestAnimationFrame(() => { this.loop() });
    }


    // notification of a new game state from the Rune SDK
    gameUpdate(update: GameUpdate): void {
        this.game = update.game;
    }
    
    mouseDown(x: number, y: number, index: number): void {
        // do nothing
    }

    mouseDrag(x: number, y: number, index: number): void {
        // do nothing
    }

    mouseUp(x: number, y: number, index: number): void {
        // do nothing

    }
    keyDown(key: string): void {
        // do nothing
    }

    keyUp(key: string): void {
        // do nothing
    }

    resourcesLoaded(): void {
        // do nothing
    }

    loop(): void {
        requestAnimationFrame(() => { this.loop() });
        
        // give the utility classes a chance to update based on 
        // screen size etc
        graphics.graphics();
    }
}