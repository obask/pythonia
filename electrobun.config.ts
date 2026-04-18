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
    views: {
      "main-ui": {
        entrypoint: "src/main-ui/index.ts",
      },
    },
    copy: {
      "src/main-ui/index.html": "views/main-ui/index.html",
      "src/main-ui/styles.css": "views/main-ui/styles.css",
    },
  },
} satisfies ElectrobunConfig;
