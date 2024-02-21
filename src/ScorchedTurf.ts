import { Game, GameFont, GameImage, PhysicsWorld, RendererType, ShapeType, TileSet, drawImage, drawTile, fillRect, generateFont, height, init, lengthVec2, loadImage, loadTileSet, pop, push, rotate, startRendering, subtractVec2, translate, worldStep } from "togl";
import { GameState, GameUpdate } from "./logic";
import { ASSETS } from "./lib/assets";

export class ScorchedTurf implements Game {
    game?: GameState;

    font12white!: GameFont;
    ball!: GameImage;
    background!: GameImage;
    wood!: TileSet;
    assetsLoaded = false;
    localWorld?: PhysicsWorld;
    localPhysics = false;
    constructor() {
        init(RendererType.WEBGL, false);

        this.font12white = generateFont(12, "black");

        this.ball = loadImage(ASSETS["ball.png"]);
        this.background = loadImage(ASSETS["background.png"]);
        this.wood = loadTileSet(ASSETS["wood.png"], 15, 15);
    }

    start(): void {
        // tell rune to let us know when a game
        // update happens
        Rune.initClient({
            onChange: (update) => {
                this.gameUpdate(update);
            },
        });

        startRendering(this);
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

    ninePatch(tiles: TileSet, x: number, y: number, width: number, height: number) {
        drawTile(tiles, x, y, 4, width, height);
        drawTile(tiles, x, y, 1, width, tiles.tileHeight);
        drawTile(tiles, x, y + height - tiles.tileHeight, 7, width, tiles.tileHeight);
        drawTile(tiles, x, y, 3, tiles.tileWidth, height);
        drawTile(tiles, x + width - tiles.tileWidth, y, 5, tiles.tileWidth, height);

        drawTile(tiles, x, y, 0);
        drawTile(tiles, x + width - tiles.tileWidth, y, 2);
        drawTile(tiles, x, y + height - tiles.tileHeight, 6);
        drawTile(tiles, x + width - tiles.tileWidth, y + height - tiles.tileHeight, 8);
    }

    render(): void {
        if (!this.assetsLoaded) {
            return;
        }
        if (!this.game) {
            return;
        }
        drawImage(this.background, 0, 0, (height() / this.background.height) * this.background.width, height());

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
                worldStep(15, this.localWorld);
                const after = Date.now();
                console.log(after-before);
                this.drawWorld(this.localWorld);
            }
        }
    }

    drawWorld(world: PhysicsWorld) {
        if (world) {
            for (const body of world.bodies) {
                // Draw
                // ----
                push();

                translate(body.averageCenter.x, body.averageCenter.y);
                rotate(Math.floor(body.averageAngle * 10) / 10);

                if (body.type === ShapeType.CIRCLE) {

                    const size = body.bounds + 1;
                    drawImage(this.ball, -size, -size, size * 2, size * 2);
                } else {
                    const width = body.width + 2;
                    const height = body.height + 2;
                    this.ninePatch(this.wood, -width / 2, -height / 2, width, height);
                }

                pop();
            }

            for (const joint of world.joints) {
                push();
                const bodyA = world.bodies.find(b => b.id === joint.bodyA);
                const bodyB = world.bodies.find(b => b.id === joint.bodyB);
                if (bodyA && bodyB) {
                    const length = lengthVec2(subtractVec2(bodyA.center, bodyB.center));
                    translate(bodyA.center.x, bodyA.center.y);
                    rotate(Math.atan2(bodyB.center.y - bodyA.center.y, bodyB.center.x - bodyA.center.x));
                    fillRect(0, -2, length, 4, "black");
                }

                pop();
            }
        }
    }
}