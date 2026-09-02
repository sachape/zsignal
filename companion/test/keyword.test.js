"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { matchesKeyword } = require("../src/lib/keyword");
const { CooldownGate } = require("../src/lib/cooldown");

test("matches the keyword as an isolated word", () => {
  assert.equal(matchesKeyword("clip", "clip"), true);
  assert.equal(matchesKeyword("allez clip ça", "clip"), true);
  assert.equal(matchesKeyword("CLIP !", "clip"), true);
});

test("never matches inside another word", () => {
  assert.equal(matchesKeyword("clipping", "clip"), false);
  assert.equal(matchesKeyword("clips", "clip"), false);
  assert.equal(matchesKeyword("clippé", "clip"), false);
  assert.equal(matchesKeyword("éclipse", "clip"), false);
});

test("is accent and case insensitive on the keyword itself", () => {
  assert.equal(matchesKeyword("garde ça", "ca"), true);
  assert.equal(matchesKeyword("Pépite !", "pepite"), true);
});

test("cooldown blocks a second command inside the window", () => {
  const gate = new CooldownGate(5);
  const t0 = 1_000_000;
  assert.equal(gate.accept(t0), true);
  assert.equal(gate.accept(t0 + 2000), false);
  assert.equal(gate.accept(t0 + 5001), true);
});
