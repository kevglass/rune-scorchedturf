import { Game, GameFont, GameImage, PhysicsWorld, RendererType, TileSet, graphics, physics, resources } from "togl";
import { GameState, GameUpdate, loadCourse } from "./logic";
import { ASSETS, resolveAllAssetImports } from "./lib/util";

export class ScorchedTurf implements Game {
    game?: GameState;
    localWorld?: PhysicsWorld;

    font12white!: GameFont;
    ball!: GameImage;
    background!: GameImage;
    wood!: TileSet;
    assetsLoaded = false;

    constructor() {
        graphics.init(RendererType.WEBGL, false);

        this.localWorld = physics.createWorld();
        physics.createRectangle(this.localWorld, physics.Vec2(200, 400), 400, 20, 0, 1, 0.3);
        physics.createRectangle(this.localWorld, physics.Vec2(10, 350), 20, 80, 0, 1, 0.3);
        physics.createRectangle(this.localWorld, physics.Vec2(380, 350), 20, 80, 0, 1, 0.3);
        // physics.rotateShape(physics.createRectangle(this.localWorld, physics.Vec2(150, 150), 100, 20, 0, 1, 0.3), (Math.PI / 8));
        // physics.rotateShape(physics.createRectangle(this.localWorld, physics.Vec2(250, 200), 100, 20, 0, 1, 0.3), -(Math.PI / 8));
        // physics.rotateShape(physics.createRectangle(this.localWorld, physics.Vec2(150, 250), 100, 20, 0, 1, 0.3), (Math.PI / 8));
        // physics.rotateShape(physics.createRectangle(this.localWorld, physics.Vec2(250, 300), 100, 20, 0, 1, 0.3), -(Math.PI / 8));
        physics.createCircle(this.localWorld, physics.Vec2(150, 100), 10, 1, 1, 1);

        resolveAllAssetImports().then(() => {
            this.font12white = graphics.generateFont(12, "white");

            this.ball = graphics.loadImage(ASSETS["ball.png"]);
            this.background = graphics.loadImage(ASSETS["background.png"]);
            this.wood = graphics.loadTileSet(ASSETS["wood.png"], 15, 15);

            loadCourse("course1.svg").then((world) => {
                this.localWorld = world;
            });
        });
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
        console.log("ASSETS LOADED");
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
        let world: PhysicsWorld | undefined;

        // run the world from the server
        if (this.game) {
            // world = this.game.world;
        }
        // run the local world
        world = this.localWorld;
        physics.worldStep(60, world!);

        if (world) {
            graphics.drawImage(this.background, 0, 0, (graphics.height() / this.background.height) * this.background.width, graphics.height());
            const objects = world.objects;
            for (let i = objects.length; i--;) {
                // Draw
                // ----
                graphics.push();

                graphics.translate(objects[i].center.x, objects[i].center.y);
                graphics.rotate(objects[i].angle);

                // Circle
                if (!objects[i].type) {

                    // TODO - use sprite
                    let size = objects[i].bounds + 1;

                    graphics.drawImage(this.ball, -size, -size, size * 2, size * 2);
                    //graphics.fillCircle(0, 0, objects[i].bounds, "white");
                }

                // Rectangle
                else {
                    this.ninePatch(this.wood, -objects[i].width / 2, -objects[i].height / 2, objects[i].width, objects[i].height);
                    // graphics.fillRect(-objects[i].width / 2, -objects[i].height / 2, objects[i].width, objects[i].height, "green");
                }

                graphics.pop();
            }
        }
    }
}