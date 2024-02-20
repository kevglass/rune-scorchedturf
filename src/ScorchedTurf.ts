import { Game, GameFont, GameImage, PhysicsWorld, RendererType, TileSet, graphics, physics, resources } from "togl";
import { GameState, GameUpdate, loadCourse } from "./logic";
import { ASSETS } from "./lib/util";

export class ScorchedTurf implements Game {
    game?: GameState;

    font12white!: GameFont;
    ball!: GameImage;
    background!: GameImage;
    wood!: TileSet;
    assetsLoaded = false;

    constructor() {
        graphics.init(RendererType.WEBGL, false);

        this.font12white = graphics.generateFont(12, "white");

        this.ball = graphics.loadImage(ASSETS["ball.png"]);
        this.background = graphics.loadImage(ASSETS["background.png"]);
        this.wood = graphics.loadTileSet(ASSETS["wood.png"], 15, 15);
    }

    start(): void {
        // tell rune to let us know when a game
        // update happens
        Rune.initClient({
            onChange: (update) => {
                this.gameUpdate(update);
            },
        });

        graphics.startRendering(this);
    }


    // notification of a new game state from the Rune SDK
    gameUpdate(update: GameUpdate): void {
        this.game = update.game;
    }

    mouseDown(x: number, y: number, index: number): void {
        // do nothing
        Rune.actions.jump({});
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
        this.assetsLoaded = true;
    }

    ninePatch(tiles: TileSet, x: number, y: number, width: number, height: number) {
        graphics.drawTile(tiles, x, y, 4, width, height);
        graphics.drawTile(tiles, x, y, 1, width, tiles.tileHeight);
        graphics.drawTile(tiles, x, y + height - tiles.tileHeight, 7, width, tiles.tileHeight);
        graphics.drawTile(tiles, x, y, 3, tiles.tileWidth, height);
        graphics.drawTile(tiles, x + width - tiles.tileWidth, y, 5, tiles.tileWidth, height);

        graphics.drawTile(tiles, x, y, 0);
        graphics.drawTile(tiles, x + width - tiles.tileWidth, y, 2);
        graphics.drawTile(tiles, x, y + height - tiles.tileHeight, 6);
        graphics.drawTile(tiles, x + width - tiles.tileWidth, y+ height - tiles.tileHeight, 8);
    }

    render(): void {
        if (!this.assetsLoaded) {
            return;
        }
        if (!this.game) {
            return;
        }
        let world: PhysicsWorld | undefined;

        // run the world from the server
        if (this.game) {
            world = this.game.world;
        }
        // run the local world
        // world = this.localWorld;
        // physics.worldStep(60, world!);

        if (world) {
            graphics.drawImage(this.background, 0, 0, (graphics.height() / this.background.height) * this.background.width, graphics.height());
            for (const body of world.bodies) {
                // Draw
                // ----
                graphics.push();

                graphics.translate(body.center.x, body.center.y);
                graphics.rotate(body.angle);

                // Circle
                if (!body.type) {

                    // TODO - use sprite
                    let size = body.bounds + 1;

                    graphics.drawImage(this.ball, -size, -size, size * 2, size * 2);
                    //graphics.fillCircle(0, 0, body.bounds, "white");
                }

                // Rectangle
                else {
                    this.ninePatch(this.wood, -body.width / 2, -body.height / 2, body.width, body.height);
                    // graphics.fillRect(-body.width / 2, -body.height / 2, body.width, body.height, "green");
                }

                graphics.pop();
            }

            for (const joint of world.joints) {
                graphics.push();
                const bodyA = world.bodies.find(b => b.id === joint.bodyA);
                const bodyB = world.bodies.find(b => b.id === joint.bodyB);
                if (bodyA && bodyB) {
                    const length = physics.lengthVec2(physics.subtractVec2(bodyA.center, bodyB.center));
                    graphics.translate(bodyA.center.x, bodyA.center.y);
                    graphics.rotate(Math.atan2(bodyB.center.y - bodyA.center.y, bodyB.center.x - bodyA.center.x));
                    graphics.fillRect(0, -2, length, 4, "black");
                }

                graphics.pop();
            }
        }
    }
}