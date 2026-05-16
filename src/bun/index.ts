import { ApplicationMenu, BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import {
  getCatalog,
  getLesson,
  getProgress,
  markComplete,
  setActiveLesson,
} from "./lessons";
import { runPythonChallenge } from "./pythonRunner";
import type { PythoniaRPC } from "../shared/types";

ApplicationMenu.setApplicationMenu([
  {
    submenu: [{ label: "Quit", role: "quit" }],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "delete" },
      { role: "selectAll" },
    ],
  },
]);

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const MAIN_VIEW_URL = "views://main-ui/index.html";

async function getMainViewUrl() {
  const channel = await Updater.localInfo.channel();
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      console.log(`HMR enabled: using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log("Vite dev server not running. Run 'bun run dev:hmr' for HMR support.");
    }
  }

  return MAIN_VIEW_URL;
}

const rpc = BrowserView.defineRPC<PythoniaRPC>({
  maxRequestTime: 8000,
  handlers: {
    requests: {
      getCatalog: async () => ({
        modules: await getCatalog(),
        progress: await getProgress(),
      }),
      getLesson: async ({ slug }) => {
        await setActiveLesson(slug);
        return getLesson(slug);
      },
      runChallenge: async ({ slug, code }) => {
        const lesson = await getLesson(slug);
        return runPythonChallenge(code, lesson.challenge.tests);
      },
      markComplete: async ({ slug }) => markComplete(slug),
      setActiveLesson: async ({ slug }) => setActiveLesson(slug),
    },
    messages: {
      log: ({ message }) => console.log(message),
    },
  },
});

new BrowserWindow({
  title: "Pythonia",
  url: await getMainViewUrl(),
  frame: {
    x: 80,
    y: 80,
    width: 1260,
    height: 820,
  },
  rpc,
});
