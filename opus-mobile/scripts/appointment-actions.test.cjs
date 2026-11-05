const { test } = require("node:test");
const assert = require("node:assert/strict");
const { appointmentActionState } = require("../src/lib/appointments.ts");

test("a completed appointment remains correctable to no-show", () => {
  assert.equal(appointmentActionState("completed", null).canMarkNoShow, true);
  assert.equal(
    appointmentActionState("completed", "no_show").pendingConfirmation,
    "no_show",
  );
});

test("automatic completion keeps an open no-show confirmation actionable", () => {
  const before = appointmentActionState("confirmed", "no_show");
  const after = appointmentActionState("completed", before.pendingConfirmation);
  assert.equal(after.active, false);
  assert.equal(after.canMarkNoShow, true);
  assert.equal(after.pendingConfirmation, "no_show");
});

test("automatic completion removes an open cancellation confirmation", () => {
  const before = appointmentActionState("confirmed", "cancelled");
  const after = appointmentActionState("completed", before.pendingConfirmation);
  assert.equal(after.active, false);
  assert.equal(after.pendingConfirmation, null);
});

test("cancelled and no-show appointments discard stale confirmations", () => {
  for (const status of ["cancelled", "no_show"]) {
    for (const confirmation of [null, "cancelled", "no_show"]) {
      assert.deepEqual(appointmentActionState(status, confirmation), {
        active: false,
        canMarkNoShow: false,
        pendingConfirmation: null,
      });
    }
  }
});
