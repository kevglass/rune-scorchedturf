import { graphics, physics } from "togl";
import { GameState, GameUpdate, MaterialType } from "./logic";
import { ASSETS } from "./lib/assets";
import { PlayerId, Players } from "rune-games-sdk";

export class ScorchedTurf implements graphics.Game {
    game?: GameState;

    font12white!: graphics.GameFont;
    ball!: graphics.GameImage;
    background!: graphics.GameImage;
    wood!: graphics.TileSet;
    flag!: graphics.TileSet;
    roundWood!: graphics.GameImage;
    assetsLoaded = false;
    cam: physics.Vector2 = physics.newVec2(0, 0);

    localPlayerId?: PlayerId;
    players?: Players;

    materials: Record<MaterialType, { rect: graphics.TileSet, circle: graphics.GameImage }>;
    frame = 0;
    widthInUnits = 0;
    heightInUnits = 0;
    scale = 0;
    vx = 0;
    vy = 0;

    constructor() {
        graphics.init(graphics.RendererType.WEBGL, true, 1024);

        this.font12white = graphics.generateFont(12, "black");

        this.ball = graphics.loadImage(ASSETS["ball.png"], true, "ball", true);
        this.background = graphics.loadImage(ASSETS["background.png"]);
        this.wood = graphics.loadTileSet(ASSETS["wood.png"], 15, 15);
        this.flag = graphics.loadTileSet(ASSETS["flag.png"], 128, 256);
        this.roundWood = graphics.loadImage(ASSETS["roundwood.png"]);

        this.materials = {
            [MaterialType.EARTH]: { rect: this.wood, circle: this.roundWood },
            [MaterialType.GRASS]: { rect: graphics.loadTileSet(ASSETS["grass.png"], 45, 15), circle: this.roundWood },
            [MaterialType.STONE1]: { rect: graphics.loadTileSet(ASSETS["stone1.png"], 45, 15), circle: this.roundWood },
            [MaterialType.STONE2]: { rect: graphics.loadTileSet(ASSETS["stone2.png"], 45, 15), circle: this.roundWood },
            [MaterialType.STONE3]: { rect: graphics.loadTileSet(ASSETS["stone3.png"], 45, 15), circle: this.roundWood },
        }
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
        this.localPlayerId = update.yourPlayerId;
        this.players = update.players;
    }

    mouseDown(x: number, y: number): void {
        x /= this.scale;
        y /= this.scale;
        x += Math.floor(this.vx - (this.widthInUnits / 2));
        y += Math.floor(this.vy - (this.heightInUnits / 2));

        if (this.game) {
            const body = this.game.course.world.bodies.find(b => b.id === this.game?.players[0].bodyId);
            console.log(body?.center);
            if (body) {
                const dx = x - body.center.x;
                const dy = y - body.center.y;
                
                Rune.actions.shoot({ dx, dy });
            }
        }
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

    threePatch(tiles: graphics.TileSet, x: number, y: number, width: number, height: number) {
        graphics.drawTile(tiles, x, y, 0, width, tiles.tileHeight);
        graphics.drawTile(tiles, x, y + tiles.tileHeight -1, 1, width, height - (tiles.tileHeight * 2) + 2);
        graphics.drawTile(tiles, x, y + height - tiles.tileHeight, 2, width, tiles.tileHeight);
    }

    render(): void {
        this.frame++;

        if (!this.assetsLoaded) {
            return;
        }
        if (!this.game) {
            return;
        }
        graphics.drawImage(this.background, 0, 0, (graphics.height() / this.background.height) * this.background.width, graphics.height());

        // run the world from the server
        if (this.game) {
            this.widthInUnits = 500;
            this.scale = (1 / this.widthInUnits) * graphics.width();
            this.heightInUnits = ((graphics.height() / graphics.width()) * this.widthInUnits);

            graphics.push();
            this.vx = this.game.course.start.x;
            this.vy = this.game.course.start.y;
            const localPlayer = this.game.players.find(p => p.playerId === this.localPlayerId);
            if (localPlayer) {
                const body = this.game.course.world.bodies.find(b => b.id === localPlayer.bodyId);
                if (body) {
                    this.vx = body.averageCenter.x;
                    this.vy = body.averageCenter.y;
                }
            }

            // rationalise view coordinates based on world bounds
            const worldBounds = physics.getWorldBounds(this.game.course.world);
            const maxX = this.vx > worldBounds.max.x - (this.widthInUnits / 2);
            const maxY = this.vy > worldBounds.max.y - (this.heightInUnits / 2);
            const minX = this.vx < worldBounds.min.x + (this.widthInUnits / 2);
            const minY = this.vy < worldBounds.min.y + (this.heightInUnits / 2);
            if (worldBounds.max.x - worldBounds.min.x < this.widthInUnits) {
                this.vx = (worldBounds.max.x + worldBounds.min.x) / 2;
            } else if (maxX) {
                this.vx = worldBounds.max.x - (this.widthInUnits / 2);
            } else if (minX) {
                this.vx = worldBounds.min.x + (this.widthInUnits / 2);
            }
            if (worldBounds.max.y - worldBounds.min.y < this.heightInUnits) {
                this.vy = (worldBounds.max.y + worldBounds.min.y) / 2;
            } else if (maxY) {
                this.vy = worldBounds.max.y - (this.heightInUnits / 2);
            } else if (minY) {
                this.vy = worldBounds.min.y + (this.heightInUnits / 2);
            }

            graphics.scale(this.scale, this.scale);
            graphics.translate(Math.floor(-this.vx + (this.widthInUnits / 2)), Math.floor(-this.vy + (this.heightInUnits / 2)));
            this.drawWorld(this.game.course.world);

            const flagWidth = 40;
            const flagHeight = 80;
            graphics.drawTile(this.flag, this.game.course.goal.x - Math.floor(flagWidth / 2), this.game.course.goal.y - flagHeight, 0, flagWidth, flagHeight);
            graphics.pop();
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
                    if (body.data.playerId) {
                        graphics.drawImage(this.ball, -size, -size, size * 2, size * 2);
                    } else {
                        const image = this.materials[body.data.type as MaterialType].circle;
                        graphics.drawImage(image, -size, -size, size * 2, size * 2);
                    }
                } else {
                    const width = body.width + 2;
                    const height = body.height + 2;
                    const tileset = this.materials[body.data.type as MaterialType].rect;
                    this.threePatch(tileset, -width / 2, -height / 2, width, height);
                }

                graphics.pop();
            }

            // draw bounds
            // for (const body of world.bodies) {
            //     graphics.fillRect(body.averageCenter.x - body.boundingBox.x, body.averageCenter.y - body.boundingBox.y, body.boundingBox.x * 2, body.boundingBox.y * 2, "rgba(255,0,0,0.5)");
            // }

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