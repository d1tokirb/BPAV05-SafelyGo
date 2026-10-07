import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walkStatus } from '../../mobile/src/walkStatus.js';
import type { SharingSession } from '../../mobile/src/types.js';
const now = Date.parse('2026-10-05T17:00:00Z');
const walk: SharingSession = {id:'walk', owner_id:'owner', expires_at: new Date(now + 15000).toISOString(), latitude:0, longitude:0, accuracy:null, updated_at:new Date(now).toISOString()};
test('zero coordinates are valid while unknown accuracy never implies perfect precision', () => {
  const status = walkStatus(walk, now);
  assert.equal(status.hasPosition, true);
  assert.equal(status.recent, true);
  assert.equal(status.accuracy, 'Accuracy unavailable.');
  assert.equal(status.minutesLeft, 1);
});
test('invalid, missing and old positions are never presented as recent', () => {
  for (const change of [{latitude:null}, {updated_at:null}, {updated_at:'bad date'}, {updated_at:new Date(now-61000).toISOString()}, {updated_at:new Date(now+60000).toISOString()}])
    assert.equal(walkStatus({...walk,...change}, now).recent, false);
});
test('expired or malformed sessions are hidden even when refresh cannot connect', () => {
  assert.equal(walkStatus(walk, now+15000).expired, true);
  assert.equal(walkStatus(walk, now+15000).minutesLeft, 0);
  assert.equal(walkStatus({...walk,expires_at:'invalid'},now).expired, true);
});
