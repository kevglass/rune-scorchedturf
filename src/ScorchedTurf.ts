import { graphics, physics } from "togl";
import { ballSize, GameState, GameUpdate, MaterialType, localPhysics, maxPower, runUpdate } from "./logic";
import { ASSETS } from "./lib/assets";
import { PlayerId, Players } from "rune-games-sdk";

const nthStrings = [
    "th",
    "st",
    "nd",
    "rd",
    "th"
]

export class LocalBall {

}

export class ScorchedTurf implements graphics.Game {
    game?: GameState;

    gradient = [
        { r: 153, g: 193, b: 64 },
        { r: 231, g: 180, b: 22 },
        { r: 219, g: 123, b: 43 },
        { r: 204, g: 50, b: 50 }
    ];
    fontSmall!: graphics.GameFont;
    fontBig!: graphics.GameFont;
    fontBigger!: graphics.GameFont;
    playerBalls: graphics.GameImage[] = [];
    background!: graphics.GameImage;
    arrow!: graphics.GameImage;
    logo!: graphics.GameImage;
    whiteCircle!: graphics.GameImage;
    flag!: graphics.TileSet;
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

    cameraX = 0;
    cameraY = 0;

    localWorld?: physics.World;
    currentWorld?: physics.World;
    executed = 0;
    powerDragging = false;
    px = 0;
    py = 0;
    power = 0;
    changeTurnAt = 0;

    sx = 0;
    sy = 0;

    dragOffsetX = 0;
    dragOffsetY = 0;
    dragging = false;

    atStart = true;
    showTitle = false;

    constructor() {
        graphics.init(graphics.RendererType.WEBGL, true, 2048);

        this.fontSmall = graphics.generateFont(16, "white");
        this.fontBig = graphics.generateFont(24, "white");
        this.fontBigger = graphics.generateFont(40, "white");
        this.arrow = graphics.loadImage(ASSETS["arrow.png"], true, "arrow", true);
        this.logo = graphics.loadImage(ASSETS["logo.png"]);
        this.whiteCircle = graphics.loadImage(ASSETS["whitecircle.png"]);

        this.playerBalls = [
            graphics.loadImage(ASSETS["parrot.png"], true, "parrot", true),
            graphics.loadImage(ASSETS["monkey.png"], true, "monkey", true),
            graphics.loadImage(ASSETS["penguin.png"], true, "penguin", true),
            graphics.loadImage(ASSETS["pig.png"], true, "pig", true),
            graphics.loadImage(ASSETS["rabbit.png"], true, "rabbit", true),
            graphics.loadImage(ASSETS["snake.png"], true, "snake", true),
        ];

        this.background = graphics.loadImage(ASSETS["background.png"]);
        this.flag = graphics.loadTileSet(ASSETS["flag.png"], 128, 256);

        this.materials = {
            [MaterialType.GRASS]: {
                rect: graphics.loadTileSet(ASSETS["grass.png"], 45, 15),
                circle: graphics.loadImage(ASSETS["grass-round.png"])
            },
            [MaterialType.STONE0]: {
                rect: graphics.loadTileSet(ASSETS["stone0.png"], 45, 15),
                circle: graphics.loadImage(ASSETS["stone0-round.png"])
            },
            [MaterialType.STONE1]: {
                rect: graphics.loadTileSet(ASSETS["stone1.png"], 45, 15),
                circle: graphics.loadImage(ASSETS["stone1-round.png"])
            },
            [MaterialType.STONE2]: {
                rect: graphics.loadTileSet(ASSETS["stone2.png"], 45, 15),
                circle: graphics.loadImage(ASSETS["stone2-round.png"])
            },
            [MaterialType.STONE3]: {
                rect: graphics.loadTileSet(ASSETS["stone3.png"], 45, 15),
                circle: graphics.loadImage(ASSETS["stone3-round.png"])
            },
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

        for (const event of this.game.events) {
            if (event.id > this.executed) {
                if (event.type === "newCourse") {
                    this.localWorld = JSON.parse(JSON.stringify(this.game.course.world));
                    this.executed = event.id;
                    this.showTitle = true;
                }
            }
        }

        if (this.localWorld && update.event?.name === "update") {
            this.executed = runUpdate(update.game, this.localWorld, this.executed);

            if (!physics.atRest(this.localWorld)) {
                this.dragOffsetX = 0;
                this.dragOffsetY = 0;
            }
            if (physics.atRest(this.localWorld) && Rune.gameTime() > this.changeTurnAt && this.changeTurnAt !== 0) {
                if (update.game.whoseTurn === this.localPlayerId) {
                    this.changeTurnAt = 0;
                    setTimeout(() => { if (this.localWorld) { Rune.actions.endTurn(); } }, 1);
                }
            }
        }

    }

    mouseDown(x: number, y: number): void {
        if (this.atStart) {
            this.atStart = false;
            return;
        }
        if (this.showTitle) {
            this.showTitle = false;
            return;
        }

        // tapped at the bottom - reset view
        if (y > graphics.height() - 60) {
            this.dragOffsetX = 0;
            this.dragOffsetY = 0;
            return;
        }

        x /= this.scale;
        y /= this.scale;
        x += Math.floor(this.cameraX - (this.widthInUnits / 2));
        y += Math.floor(this.cameraY - (this.heightInUnits / 2));

        this.sx = x;
        this.sy = y;

        this.dragging = true;
        if (this.game && this.currentWorld && physics.atRest(this.currentWorld)) {
            const body = this.currentWorld.dynamicBodies.find(b => b.data?.playerId === this.localPlayerId);
            if (body) {
                if (body.data.playerId === this.game.whoseTurn && this.game.whoseTurn === this.localPlayerId) {
                    const dx = x - body.center.x;
                    const dy = y - body.center.y;
                    const len = Math.sqrt((dx * dx) + (dy * dy));
                    if (len < ballSize) {
                        // start drag on ball
                        this.powerDragging = true;
                        this.px = dx;
                        this.py = dy;
                        this.power = Math.min(maxPower, len);
                        this.dragging = false;
                    }
                }
            }
        }
    }

    mouseDrag(x: number, y: number): void {
        x /= this.scale;
        y /= this.scale;
        x += Math.floor(this.cameraX - (this.widthInUnits / 2));
        y += Math.floor(this.cameraY - (this.heightInUnits / 2));

        if (this.game && this.currentWorld && physics.atRest(this.currentWorld)) {
            if (this.powerDragging) {
                const body = this.currentWorld.dynamicBodies.find(b => b.data?.playerId === this.localPlayerId);
                if (body) {
                    if (body.data.playerId === this.game.whoseTurn && this.game.whoseTurn === this.localPlayerId) {
                        const dx = x - body.center.x;
                        const dy = y - body.center.y;
                        const len = Math.sqrt((dx * dx) + (dy * dy));
                        this.px = dx;
                        this.py = dy;
                        this.power = Math.min(maxPower, len);
                    }
                }
            } else if (this.dragging) {
                this.dragOffsetX -= x - this.sx;
                this.dragOffsetY -= y - this.sy;
            }
        }

        this.sx = x;
        this.sy = y;
    }

    mouseUp(): void {
        this.dragging = false;

        if (this.powerDragging) {
            if (this.power > 20) {
                Rune.actions.shoot({ dx: -this.px / this.power, dy: -this.py / this.power, power: 150 + (this.power * 2) });
                this.changeTurnAt = Rune.gameTime() + 1000;
            }
        }
        this.powerDragging = false;
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
        graphics.drawTile(tiles, x, y + tiles.tileHeight - 1, 1, width, height - (tiles.tileHeight * 2) + 2);
        graphics.drawTile(tiles, x, y + height - tiles.tileHeight, 2, width, tiles.tileHeight);
    }

    render(): void {
        this.frame++;

        if (this.frame % 2 !== 0) {
            return;
        }
        if (!this.assetsLoaded) {
            return;
        }
        if (!this.game) {
            return;
        }
        if (localPhysics && !this.localWorld) {
            return;
        }
        this.currentWorld = this.localWorld ?? this.game.course.world;

        if (graphics.width() > graphics.height()) {
            graphics.drawImage(this.background, 0, 0, graphics.width(), (graphics.width() / this.background.width) * this.background.height);
        } else {
            graphics.drawImage(this.background, 0, 0, (graphics.height() / this.background.height) * this.background.width, graphics.height());
        }

        if (this.atStart) {
            graphics.drawImage(this.logo, Math.floor((graphics.width() - (1.05 * this.logo.width)) / 2), 50);
            graphics.fillRect(0, graphics.height() - 65, graphics.width(), 40, "rgba(0,0,0,0.5)");
            graphics.centerText("Tap/Click to Start", graphics.height() - 36, this.fontBig);
        }
        // run the world from the server
        if (this.game) {
            if (graphics.width() > graphics.height()) {
                this.heightInUnits = 500;
                this.widthInUnits = ((graphics.height() / graphics.width()) * this.heightInUnits);
                this.scale = (1 / this.heightInUnits) * graphics.height();
            } else {
                this.widthInUnits = 500;
                this.heightInUnits = ((graphics.height() / graphics.width()) * this.widthInUnits);
                this.scale = (1 / this.widthInUnits) * graphics.width();
            }

            graphics.push();
            this.vx = this.game.course.start.x;
            this.vy = this.game.course.start.y;
            const body = this.currentWorld.dynamicBodies.find(b => b.data.playerId === this.game?.whoseTurn);
            if (body) {
                this.vx = body.averageCenter.x;
                this.vy = body.averageCenter.y;
            }

            this.cameraX = (this.cameraX * 0.7) + (this.vx * 0.3);
            this.cameraY = (this.cameraY * 0.7) + (this.vy * 0.3);

            this.cameraX += this.dragOffsetX;
            this.cameraY += this.dragOffsetY;

            if (this.atStart) {
                return;
            }

            graphics.scale(this.scale, this.scale);
            graphics.translate(Math.floor(-this.cameraX + (this.widthInUnits / 2)), Math.floor(-this.cameraY + (this.heightInUnits / 2)));

            // draw goal area
            const goalSize = 60;
            graphics.alpha(0.2);
            graphics.drawImage(this.whiteCircle, this.game.course.goal.x - Math.floor(goalSize / 2), this.game.course.goal.y - (goalSize / 2), goalSize, goalSize);
            graphics.alpha(1);

            this.drawWorld(this.game, this.localWorld ?? this.game.course.world);

            const flagWidth = 40;
            const flagHeight = 80;
            graphics.drawTile(this.flag, this.game.course.goal.x - 6, this.game.course.goal.y - flagHeight, 0, flagWidth, flagHeight);

            if (this.powerDragging && this.power > 20) {
                const body = this.currentWorld.dynamicBodies.find(b => b.data.playerId === this.game?.whoseTurn);
                if (body) {
                    graphics.push();
                    graphics.translate(body.averageCenter.x, body.averageCenter.y);
                    graphics.rotate(Math.atan2(-this.py, -this.px));
                    const scale = 0.5 + (0.5 * this.power / maxPower);
                    graphics.scale(scale, scale);
                    const n = (this.power / (maxPower + 1)) * 3;
                    const p = Math.floor(n);
                    const diff = n - p;
                    const col = {
                        r: Math.floor((this.gradient[p].r * (1 - diff)) + (this.gradient[p + 1].r * diff)),
                        g: Math.floor((this.gradient[p].g * (1 - diff)) + (this.gradient[p + 1].g * diff)),
                        b: Math.floor((this.gradient[p].b * (1 - diff)) + (this.gradient[p + 1].b * diff)),
                    }
                    graphics.drawImage(this.arrow, 20 * (1 / scale), (-this.arrow.height / 2), this.arrow.width, this.arrow.height, "rgb(" + col.r + "," + col.g + "," + col.b + ")");
                    graphics.pop();
                }
            }

            graphics.pop();
        }

        if (this.atStart) {
            return;
        }

        if (this.players && this.game.whoseTurn) {
            graphics.fillRect(0, graphics.height() - 60, graphics.width(), 60, "rgba(0,0,0,0.5)");
            let message = this.players[this.game.whoseTurn].displayName;
            if (this.game.whoseTurn === this.localPlayerId) {
                message = "Your Turn";
            }
            const player = this.game.players.find(p => p.playerId === this.game?.whoseTurn);
            graphics.drawText(57, graphics.height() - 32, message, this.fontBig);
            if (player) {
                message = (player.shots + 1) + nthStrings[Math.min(4, player.shots + 1)] + " shot";
                graphics.drawText(59, graphics.height() - 14, message, this.fontSmall);
            }
            let type = 5;
            const size = 20;
            if (player) {
                type = player.playerType;
            }
            graphics.drawImage(this.playerBalls[type], 10, graphics.height() - 33 - size, size * 2, size * 2);
        }

        if (this.showTitle && this.game) {
            graphics.fillRect(0, (graphics.height() / 2) - 50, graphics.width(), 100, "rgba(0,0,0,0.5)");
            graphics.centerText(this.game.course.name, (graphics.height() / 2), this.fontBigger);
            graphics.centerText("Par " + this.game.course.par, (graphics.height() / 2) + 30, this.fontBig);
        }
    }

    drawWorld(game: GameState, world: physics.World) {
        if (world) {
            const all = physics.allBodies(world);
            for (const body of all) {
                // Draw
                // ----
                graphics.push();

                graphics.translate(body.averageCenter.x, body.averageCenter.y);
                graphics.rotate(Math.floor(body.averageAngle * 10) / 10);

                if (body.type === physics.ShapeType.CIRCLE) {
                    const size = body.bounds + 1;
                    if (body.data && body.data.playerId) {
                        const player = game.players.find(p => p.playerId === body.data.playerId);
                        let type = 5;
                        if (player) {
                            type = player.playerType;
                        }
                        graphics.drawImage(this.playerBalls[type], -size, -size, size * 2, size * 2);
                    } else {
                        const image = this.materials[body.data?.type as MaterialType]?.circle;
                        if (image) {
                            graphics.drawImage(image, -size, -size, size * 2, size * 2);
                        }
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
                const bodyA = all.find(b => b.id === joint.bodyA);
                const bodyB = all.find(b => b.id === joint.bodyB);
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