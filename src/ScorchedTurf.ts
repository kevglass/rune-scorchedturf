import { Game, PhysicsWorld, graphics, physics } from "togl";
import { GameState, GameUpdate } from "./logic";

export class ScorchedTurf implements Game {
    game?: GameState;
    world: PhysicsWorld;

    constructor() { 
        this.world = physics.createWorld();
        physics.createRectangle(this.world, physics.Vec2(200, 400), 400, 20, 0, 1, 0.3);
        physics.createRectangle(this.world, physics.Vec2(10, 350), 20, 80, 0, 1, 0.3);
        physics.createRectangle(this.world, physics.Vec2(380, 350), 20, 80, 0, 1, 0.3);
        physics.rotateShape(physics.createRectangle(this.world, physics.Vec2(150, 150), 100, 20, 0, 1, 0.3), (Math.PI/8));
        physics.rotateShape(physics.createRectangle(this.world, physics.Vec2(250, 200), 100, 20, 0, 1, 0.3), -(Math.PI/8));
        physics.rotateShape(physics.createRectangle(this.world, physics.Vec2(150, 250), 100, 20, 0, 1, 0.3), (Math.PI/8));
        physics.rotateShape(physics.createRectangle(this.world, physics.Vec2(250, 300), 100, 20, 0, 1, 0.3), -(Math.PI/8));
        physics.createCircle(this.world,  physics.Vec2(150, 100), 10, 1, 1, 1);
    }

    start(): void {
        // tell rune to let us know when a game
        // update happens
        Rune.initClient({
            onChange: (update) => {
                this.gameUpdate(update);
            },
        });

        // register ourselves as the input listener so
        // we get nofified of mouse presses
        console.log("Start rendering");

        graphics.startRendering(this);
        console.log("Start rendering done");
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

    render(): void {
        if (this.game) {
            physics.worldStep(60, this.world);
            graphics.fillRect(0, 0, graphics.width(), graphics.height(), "black");
            const objects = this.world.objects;
            for (let i = objects.length; i--;) {
                // Draw
                // ----
                graphics.push();

                graphics.translate(objects[i].center.x, objects[i].center.y);
                graphics.rotate(objects[i].angle);

                // Circle
                if (!objects[i].type) {
                    graphics.fillCircle(0, 0, objects[i].bounds, "white");
                }

                // Rectangle
                else {
                    graphics.fillRect(-objects[i].width / 2, -objects[i].height / 2, objects[i].width, objects[i].height, "green");
                }

                graphics.pop();
            }

            graphics.drawText(0, 12, "FPS: " + this.game.fps, 12, "white");
            graphics.drawText(0, 24, "AFT: " + Math.ceil(this.game.averageFrameTime), 12, "white");
        }
    }
}