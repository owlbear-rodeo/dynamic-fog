import OBR, { Item } from "@owlbear-rodeo/sdk";
import CanvasKitInit, { CanvasKit } from "canvaskit-wasm/bin/full/canvaskit";
import wasm from "canvaskit-wasm/bin/full/canvaskit.wasm?url";
import { clear, reconcile } from "./reconcile";
import { createMenu } from "../menu/createMenu";

async function waitUntilOBRReady() {
  return new Promise<void>((resolve) => {
    OBR.onReady(() => {
      resolve();
    });
  });
}

async function init() {
  const CanvasKit = await CanvasKitInit({ locateFile: () => wasm });
  await waitUntilOBRReady();
  OBR.scene.onReadyChange((ready) => handleSceneReady(ready, CanvasKit));
  OBR.scene.isReady().then((ready) => handleSceneReady(ready, CanvasKit));
  createMenu();
}

let sceneSubscriptions: VoidFunction[] = [];
async function handleSceneReady(ready: boolean, CanvasKit: CanvasKit) {
  for (const unsubscribe of sceneSubscriptions) {
    unsubscribe();
  }
  sceneSubscriptions = [];
  if (ready) {
    OBR.scene.items
      .getItems()
      .then((items) => handleItemsChange(items, CanvasKit));
    sceneSubscriptions.push(
      OBR.scene.items.onChange((items) => handleItemsChange(items, CanvasKit))
    );
  } else {
    clear();
  }
}

function handleItemsChange(items: Item[], CanvasKit: CanvasKit) {
  reconcile(items, CanvasKit);
}

init();
