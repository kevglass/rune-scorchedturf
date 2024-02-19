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

        resolveAllAssetImports().then(() => {
            this.font12white = graphics.generateFont(12, "white");

            this.ball = graphics.loadImage(ASSETS["ball.png"]);
            this.background = graphics.loadImage(ASSETS["background.png"]);
            this.wood = graphics.loadTileSet(ASSETS["wood.png"], 15, 15);

            this.localWorld = loadCourse("course1.svg");
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