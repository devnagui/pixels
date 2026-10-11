import assert from "node:assert/strict";
import test from "node:test";

let reconstructedData;

class FoundryRoll {
  static registerResult() {
    return false;
  }

  static get defaultImplementation() {
    return CONFIG.Dice.rolls[0];
  }

  static fromData(data) {
    if ( data.class && (data.class !== this.name) ) {
      const cls = CONFIG.Dice.rolls.find(cls => cls.name === data.class);
      if ( !cls ) throw new Error(`Unable to recreate ${data.class} instance from provided data`);
      return cls.fromData(data);
    }
    reconstructedData = data;
    return {
      _evaluateTotal: () => data.terms.flatMap(term => term.results).reduce((total, result) => total + result.result, 0),
      toMessage() {
        return {formula: data.formula, total: this._total};
      }
    };
  }
}

const CoreRoll = class Roll extends FoundryRoll {};
class BaseRoll extends FoundryRoll {}

globalThis.CONFIG = {debug: {pixels: false}, Dice: {rolls: [CoreRoll]}};
globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: Base => Base
    }
  },
  utils: {
    deepClone: structuredClone,
    isEmpty: object => Object.keys(object).length === 0
  }
};
globalThis.game = {settings: {get: () => true}};
globalThis.pixelsDice = {debounceRoll: () => {}};
globalThis.Roll = CoreRoll;

const {completePendingRoll, pendingRoll} = await import("../scripts/handlers.mjs");

test("unprompted rolls use the configured default Roll class in Foundry v13 and v14", () => {
  for ( const [version, implementation] of [["v13", CoreRoll], ["v14", BaseRoll]] ) {
    CONFIG.Dice.rolls = [implementation];
    globalThis.Roll = implementation;
    reconstructedData = undefined;
    pendingRoll({denomination: "d20", name: `Test d20 (${version})`, pixelId: `test-die-${version}`}, 17);

    const message = completePendingRoll();

    assert.equal(reconstructedData.class, implementation.name, version);
    assert.equal(reconstructedData.formula, "1d20", version);
    assert.deepEqual(message, {formula: "1d20", total: 17}, version);
  }
});