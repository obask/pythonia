import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Pythonia",
    identifier: "dev.oleg.pythonia",
    version: "0.1.0",
  },
  runtime: {
    exitOnLastWindowClosed: true,
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    copy: {
      "dist/index.html": "views/main-ui/index.html",
      "dist/assets": "views/main-ui/assets",
    },
    watchIgnore: ["dist/**"],
  },
} satisfies ElectrobunConfig;
