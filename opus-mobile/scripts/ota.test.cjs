const { test } = require("node:test");
const assert = require("node:assert/strict");
const { rolloutArguments } = require("./ota.cjs");

test("full preview deployments omit partial-rollout API arguments, while production keeps staged rollout", () => {
  assert.deepEqual(rolloutArguments("100"), []);
  assert.deepEqual(rolloutArguments("10"), ["--rollout-percentage", "10"]);
  assert.deepEqual(rolloutArguments("99"), ["--rollout-percentage", "99"]);
  for (const percent of [undefined, "0", "101", "NaN", "10.5", "10; false"])
    assert.throws(() => rolloutArguments(percent), /integer from 1 to 100/);
});
