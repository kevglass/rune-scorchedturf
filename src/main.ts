import { ScorchedTurf } from "./ScorchedTurf";
import { physics } from "./lib/physics";

// Simple game bootstrap
const game = new ScorchedTurf();
game.start();

physics.startDemoScene(document.getElementById("a") as HTMLCanvasElement);