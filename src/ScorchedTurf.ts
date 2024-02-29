import { graphics, physics, sound } from "togl";
import { ballSize, GameState, GameUpdate, MaterialType, localPhysics, maxPower, runUpdate, goalSize, ActionListener } from "./logic";
import { ASSETS } from "./lib/assets";
import { PlayerId, Players } from "rune-games-sdk";

const nthStrings = [
    "th",
    "st",
    "nd",
    "rd",
    "th"
]

const PARTICLE_LIFE = 10; // frames
const PARTICLE_SIZE = 15;

interface TrailPoint {
    life: number;
    x: number;
    y: number;
}

interface Sink {
    playerId: string;
    time: number;
}

export class ScorchedTurf implements graphics.Game, ActionListener {
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
    showTitleTimer = 0;

    trail: TrailPoint[] = [];
    courseNumber = -1;
    completed: string[] = [];

    currentBody?: physics.Body;

    lastSink?: Sink;
    gameOver = false;

    outOfBoundsTimer = 0;

    frameCount = 0;

    elements: Record<string, graphics.GameImage> = {};

    sfxSwish: sound.Sound;
    sfxHit: sound.Sound;
    sfxHole: sound.Sound;
    lastHitSound = 0;

    constructor() {
        graphics.init(graphics.RendererType.WEBGL, true, 2048);

        this.sfxSwish = sound.loadSound(ASSETS["swing.mp3"]);
        this.sfxHit = sound.loadSound(ASSETS["hit.mp3"]);
        this.sfxHole = sound.loadSound(ASSETS["hole.mp3"]);

        this.fontSmall = graphics.generateFont(16, "white");
        this.fontBig = graphics.generateFont(24, "white");
        this.fontBigger = graphics.generateFont(40, "white");
        this.arrow = graphics.loadImage(ASSETS["arrow.png"], true, "arrow", true);
        this.logo = graphics.loadImage(ASSETS["logo.png"]);
        this.whiteCircle = graphics.loadImage(ASSETS["whitecircle.png"]);

        this.elements.tree1 = graphics.loadImage(ASSETS["elements/tree1.png"], true, "tree1", true);
        this.elements.tree2 = graphics.loadImage(ASSETS["elements/tree2.png"], true, "tree2", true);
        this.elements.tree3 = graphics.loadImage(ASSETS["elements/tree3.png"], true, "tree3", true);
        this.elements.tree4 = graphics.loadImage(ASSETS["elements/tree4.png"], true, "tree4", true);
        this.elements.grass1 = graphics.loadImage(ASSETS["elements/grass1.png"], true, "grass1", true);
        this.elements.grass2 = graphics.loadImage(ASSETS["elements/grass2.png"], true, "grass2", true);

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

    shot(): void {
        sound.playSound(this.sfxSwish);
    }

    hole(): void {
        sound.playSound(this.sfxHole);
    }

    collision(maxDepth: number): void {
        if (Date.now() - this.lastHitSound > 250) {
            const depth = Math.min(maxDepth, 3)
            if (depth > 0.3) {
                sound.playSound(this.sfxHit, depth / 6);
                this.lastHitSound = Date.now();
            }
        }
    }

    get courseComplete(): boolean {
        return (this.game && this.players && Object.values(this.players).length <= this.completed.length) ? true : false;
    }

    start(): void {
        graphics.startRendering(this);
    }


    // notification of a new game state from the Rune SDK
    gameUpdate(update: GameUpdate): void {
        this.game = update.game;
        this.localPlayerId = update.yourPlayerId;
        this.players = update.players;

        if (this.game.startGame) {
            this.gameOver = false;
            this.executed = 0;
        }

        for (const event of this.game.events) {
            if (event.id > this.executed) {
                if (event.type === "newCourse") {
                    this.localWorld = JSON.parse(JSON.stringify(this.game.course.world));
                    this.executed = event.id;
                    this.showTitle = true;
                    this.showTitleTimer = Date.now();
                    this.courseNumber = event.courseNumber;
                    this.completed = [];
                    this.gameOver = false;
                }
                if (event.type === "gameOver") {
                    this.gameOver = true;
                    this.executed = event.id;
                }
            }
        }

        if (this.localWorld && update.event?.name === "update") {
            this.executed = runUpdate(update.game, this.localWorld, this.executed, this.completed, this);

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

            const currentBody = this.localWorld.dynamicBodies.find(p => p.data.playerId === this.game?.whoseTurn);
            if (currentBody?.data.outOfBounds) {
                this.outOfBoundsTimer = Date.now() + 2000;
                currentBody.data.outOfBounds = false;
                this.trail = [];
            }

            for (const p of [...this.trail]) {
                p.life--;
                if (p.life <= 0) {
                    this.trail.splice(this.trail.indexOf(p));
                }
            }

            this.frameCount++;

            if (!physics.atRest(this.localWorld)) {
                for (const body of [...this.localWorld.dynamicBodies]) {
                    const distanceToGoal = physics.lengthVec2(physics.subtractVec2(this.game.course.goal, body.center));
                    if (distanceToGoal < body.bounds + goalSize) {
                        sound.playSound(this.sfxHole);
                        this.completed.push(body.data.playerId);
                        physics.removeBody(this.localWorld, body);
                        setTimeout(() => {
                            Rune.actions.reachedGoal({ playerId: body.data.playerId, courseId: this.courseNumber })
                        }, 1);
                        this.lastSink = {
                            playerId: body.data.playerId,
                            time: Date.now()
                        }
                    } else {
                        if (body == this.currentBody && this.outOfBoundsTimer < Date.now() && physics.lengthVec2(body.velocity) > 10) {
                            if (this.frameCount % 2 === 0) {
                                this.trail.splice(0, 0, {
                                    life: PARTICLE_LIFE,
                                    x: body.center.x,
                                    y: body.center.y
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    mouseDown(x: number, y: number): void {
        if (this.gameOver) {
            return;
        }
        if (this.atStart) {
            this.atStart = false;
            this.showTitleTimer = Date.now();
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

        if (this.outOfBoundsTimer !== 0 && this.outOfBoundsTimer > Date.now()) {
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

        // tell rune to let us know when a game
        // update happens
        Rune.initClient({
            onChange: (update) => {
                this.gameUpdate(update);
            },
        });

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
            if (!this.currentBody || (this.currentBody !== body && body)) {
                this.currentBody = body;
            }

            if (this.currentBody) {
                this.vx = this.currentBody.averageCenter.x;
                this.vy = this.currentBody.averageCenter.y;
            }

            if (physics.atRest(this.currentWorld)) {
                this.cameraX = (this.cameraX * 0.7) + (this.vx * 0.3);
                this.cameraY = (this.cameraY * 0.7) + (this.vy * 0.3);
            } else {
                this.cameraX = this.vx;
                this.cameraY = this.vy;
            }
            this.cameraX += this.dragOffsetX;
            this.cameraY += this.dragOffsetY;

            if (this.atStart) {
                return;
            }

            graphics.scale(this.scale, this.scale);
            graphics.translate(Math.floor(-this.cameraX + (this.widthInUnits / 2)), Math.floor(-this.cameraY + (this.heightInUnits / 2)));

            // draw goal area
            graphics.alpha(0.2);
            graphics.drawImage(this.whiteCircle, this.game.course.goal.x - Math.floor(goalSize / 2), this.game.course.goal.y - (goalSize / 2), goalSize, goalSize);
            graphics.alpha(1);

            this.drawBackground(this.game, this.localWorld ?? this.game.course.world);
            if (this.currentBody) {
                let tx = this.currentBody.averageCenter.x;
                let ty = this.currentBody.averageCenter.y;
                for (let i = 0; i < this.trail.length; i++) {
                    const pt = this.trail[i];

                    const dx = tx - pt.x;
                    const dy = ty - pt.y;
                    const len = Math.sqrt((dx * dx) + (dy * dy));

                    const a = pt.life / PARTICLE_LIFE;
                    const size = PARTICLE_SIZE - (10 * (1 - a));
                    graphics.alpha(a);
                    graphics.push();
                    graphics.translate(pt.x, pt.y);
                    graphics.rotate(Math.atan2(dy, dx));
                    graphics.fillRect(0, -size, len + 4, size * 2, "white");
                    graphics.pop();

                    tx = pt.x;
                    ty = pt.y;
                }
            }
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
            graphics.drawText(67, graphics.height() - 32, message, this.fontBig);
            if (player) {
                message = (player.shots + 1) + nthStrings[Math.min(4, player.shots + 1)] + " shot";
                graphics.drawText(69, graphics.height() - 14, message, this.fontSmall);
            }
            let type = 5;
            const size = 20;
            if (player) {
                type = player.playerType;
            }
            graphics.drawImage(this.playerBalls[type], 20, graphics.height() - 33 - size, size * 2, size * 2);
        }

        if (this.showTitle && this.game) {
            const sinceShown = Date.now() - this.showTitleTimer;
            let a = 1;
            if (sinceShown > 2000) {
                this.showTitle = false;
            } else if (sinceShown > 1500) {
                a = 1 - ((sinceShown - 1500) / 500);
            }
            if (this.showTitle) {
                graphics.push();
                graphics.translate(0, -100);
                graphics.alpha(a);
                graphics.fillRect(0, (graphics.height() / 2) - 70, graphics.width(), 120, "rgba(0,0,0,0.5)");
                graphics.centerText("Hole " + (this.courseNumber + 1), (graphics.height() / 2) - 40, this.fontBig, "#ddd");
                graphics.centerText(this.game.course.name, (graphics.height() / 2), this.fontBigger);
                graphics.centerText("Par " + this.game.course.par, (graphics.height() / 2) + 35, this.fontBig, "#ddd");
                graphics.alpha(1);
                graphics.pop();
            }
        }

        if (this.players && this.lastSink && Date.now() - this.lastSink.time < 3000) {
            const playerData = this.game.players.find(p => p.playerId === this.lastSink?.playerId);
            if (playerData) {
                const sinceShown = Date.now() - this.lastSink.time;
                let a = 1;
                if (sinceShown > 2500) {
                    a = 1 - ((sinceShown - 2500) / 500);
                }
                graphics.alpha(a);
                graphics.fillRect(0, 10, graphics.width(), 45, "rgba(0,0,0,0.5)");
                const message = this.players[this.lastSink.playerId].displayName + " gets a hole in " + playerData.shots + "!";
                graphics.centerText(message, 28, this.fontSmall);
                graphics.centerText("(" + this.toParName(this.game.course.par, playerData.shots) + ")", 48, this.fontSmall, "#ddd");
                graphics.alpha(1);
            }
        }

        if (this.outOfBoundsTimer > Date.now()) {
            graphics.fillRect(0, 60, graphics.width(), 50, "rgba(0,0,0,0.5)");
            graphics.centerText("Out of Bounds!", 100, this.fontBigger);
        }
        if ((this.courseComplete || this.gameOver) && this.game && this.players) {
            let y = 100;
            graphics.fillRect(0, y - 40, graphics.width(), 50, "rgba(0,0,0,0.5)");
            graphics.centerText(this.gameOver ? "Game Over!" : "All Done!", y, this.fontBigger);
            y += 50;

            for (const player of [...this.game.players].sort((a, b) => a.totalShots - b.totalShots)) {
                const name = this.players[player.playerId]?.displayName ?? "";
                const score = player.totalShots;

                let type = 5;
                const size = 12;
                if (player) {
                    type = player.playerType;
                }

                graphics.fillRect(0, y - 25, graphics.width(), 30, "rgba(0,0,0,0.5)");
                graphics.drawImage(this.playerBalls[type], 4, 2 + y - size * 2, size * 2, size * 2);
                graphics.drawText(35, y, name, this.fontBig);
                graphics.drawText(graphics.width() - 10 - graphics.textWidth("" + score, this.fontBig), y, "" + score, this.fontBig);
                y += 35;
            }
        }
    }

    toParName(par: number, shots: number): string {
        const diff = shots - par;
        switch (diff) {
            case -1:
                return "Birdie!";
            case -2:
                return "Eagle!";
            case -3:
                return "Albatross!";
            case -4:
                return "Condor!";
            case 1:
                return "Bogey";
            case 2:
                return "Double Bogey";
            case 3:
                return "Triple Bogey";
        }

        if (par < shots) {
            return (shots - par) + " over par";
        }
        if (par > shots) {
            return (par - shots) + " under par";
        }
        return "Par";
    }

    drawBackground(game: GameState, world: physics.World) {
        if (world) {
            const all = physics.allBodies(world);
            for (const body of all) {
                // Draw
                // ----
                graphics.push();

                graphics.translate(body.averageCenter.x, body.averageCenter.y);
                graphics.rotate(Math.floor(body.averageAngle * 10) / 10);

                if (body.type === physics.ShapeType.CIRCLE) {
                    if (body.data.sprite) {
                        const image = this.elements[body.data.sprite];
                        if (image) {
                            graphics.drawImage(image, Math.floor(-image.width / 2), -image.height);
                        }
                    } 
                }
                graphics.pop();
            }
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
                    if (body.data.sprite) {
                        // drawn on the background layer
                    } else {
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
                    }
                } else {
                    const width = body.width + 2;
                    const height = body.height + 2;
                    const tileset = this.materials[body.data.type as MaterialType].rect;
                    this.threePatch(tileset, -width / 2, -height / 2, width, height + 10); // account for shadow
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