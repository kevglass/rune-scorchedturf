import { defineConfig } from "vite"
import { qrcode } from "vite-plugin-qrcode"
import rune from "vite-plugin-rune"
import path from "node:path"

// https://vitejs.dev/config/
export default defineConfig({
  base: "", // Makes paths relative
  plugins: [
    qrcode(), // only applies in dev mode
    rune({ logicPath: path.resolve("./src/logic.ts") }),
  ],
  optimizeDeps: {
    include: ['toglib', "toglib/logic", "propel-js"],
  },
  assetsInclude: ["**/*.svg"],
})
