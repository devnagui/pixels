import assert from "node:assert/strict";
import test from "node:test";

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: Base => Base
    }
  }
};
globalThis.game = {settings: {set: () => {}}};
globalThis.Color = {from: value => value};

const {default: PixelsManager} = await import("../scripts/manager.mjs");

class TestPixel {
  constructor(pixelId) {
    this.pixelId = pixelId;
    this.systemId = `${pixelId}-system`;
    this.name = pixelId;
    this.dieType = "d20";
    this.listeners = new Map();
  }

  async connect() {}

  async blink() {}

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    const index = listeners.indexOf(listener);
    if ( index >= 0 ) listeners.splice(index, 1);
  }

  listenerCount(type) {
    return this.listeners.get(type)?.length ?? 0;
  }
}

test("reconnecting the same Pixel does not accumulate listeners", async () => {
  const manager = new PixelsManager();
  const pixel = new TestPixel("same-pixel");

  for ( let i = 0; i < 20; i++ ) await manager.connect(pixel);

  assert.equal(pixel.listenerCount("roll"), 1);
  assert.equal(pixel.listenerCount("status"), 1);
});

test("replacing a Pixel instance moves its listeners", async () => {
  const manager = new PixelsManager();
  const previousPixel = new TestPixel("replacement-pixel");
  const replacementPixel = new TestPixel("replacement-pixel");

  await manager.connect(previousPixel);
  await manager.connect(replacementPixel);

  assert.equal(previousPixel.listenerCount("roll"), 0);
  assert.equal(previousPixel.listenerCount("status"), 0);
  assert.equal(replacementPixel.listenerCount("roll"), 1);
  assert.equal(replacementPixel.listenerCount("status"), 1);
});