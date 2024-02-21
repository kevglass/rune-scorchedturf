import { graphics, physics } from "togl";
import { GameState, GameUpdate } from "./logic";
import { ASSETS } from "./lib/assets";

export class ScorchedTurf implements graphics.Game {
    game?: GameState;

    font12white!: graphics.GameFont;
    ball!: graphics.GameImage;
    background!: graphics.GameImage;
    wood!: graphics.TileSet;
    assetsLoaded = false;
    localWorld?: physics.PhysicsWorld;
    localPhysics = false;
    constructor() {
        graphics.init(graphics.RendererType.WEBGL, false);

        this.font12white = graphics.generateFont(12, "black");

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

    mouseDown(): void {
        // do nothing
        Rune.actions.jump();
    }

    mouseDrag(): void {
        // do nothing
    }

    mouseUp(): void {
        // do nothing

    }
    keyDown(): void {
        // do nothing
    }

    keyUp(): void {
        // do nothing
    }

    resourcesLoaded(): void {
        // do nothing
        this.assetsLoaded = true;
    }

    ninePatch(tiles: graphics.TileSet, x: number, y: number, width: number, height: number) {
        graphics.drawTile(tiles, x, y, 4, width, height);
        graphics.drawTile(tiles, x, y, 1, width, tiles.tileHeight);
        graphics.drawTile(tiles, x, y + height - tiles.tileHeight, 7, width, tiles.tileHeight);
        graphics.drawTile(tiles, x, y, 3, tiles.tileWidth, height);
        graphics.drawTile(tiles, x + width - tiles.tileWidth, y, 5, tiles.tileWidth, height);

        graphics.drawTile(tiles, x, y, 0);
        graphics.drawTile(tiles, x + width - tiles.tileWidth, y, 2);
        graphics.drawTile(tiles, x, y + height - tiles.tileHeight, 6);
        graphics.drawTile(tiles, x + width - tiles.tileWidth, y + height - tiles.tileHeight, 8);
    }

    render(): void {
        if (!this.assetsLoaded) {
            return;
        }
        if (!this.game) {
            return;
        }
        graphics.drawImage(this.background, 0, 0, (graphics.height() / this.background.height) * this.background.width, graphics.height());

        // run the world from the server
        if (this.game) {
            this.drawWorld(this.game.world);
        }

        // run the local world
        if (this.localPhysics) {
            if (!this.localWorld) {
                this.localWorld = JSON.parse(JSON.stringify(this.game.world));
            }
            if (this.localWorld) {
                const before = Date.now();
                physics.worldStep(15, this.localWorld);
                const after = Date.now();
                console.log(after-before);
                this.drawWorld(this.localWorld);
            }
        }
    }

    drawWorld(world: physics.PhysicsWorld) {
        if (world) {
            for (const body of world.bodies) {
                // Draw
                // ----
                graphics.push();

                graphics.translate(body.averageCenter.x, body.averageCenter.y);
                graphics.rotate(Math.floor(body.averageAngle * 10) / 10);

                if (body.type === physics.ShapeType.CIRCLE) {

                    const size = body.bounds + 1;
                    graphics.drawImage(this.ball, -size, -size, size * 2, size * 2);
                } else {
                    const width = body.width + 2;
                    const height = body.height + 2;
                    this.ninePatch(this.wood, -width / 2, -height / 2, width, height);
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