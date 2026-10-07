import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNearCampus } from '../../mobile/src/reportLocation.js';
const campus = {latitude:0, longitude:0, radius_m:1500};
test('report locations include the server-approved surrounding area, but reject distant points', () => {
  assert.equal(isNearCampus({latitude:0,longitude:0},campus),true);
  assert.equal(isNearCampus({latitude:0.02,longitude:0},campus),true);
  assert.equal(isNearCampus({latitude:0.03,longitude:0},campus),false);
});
test('a campus crossing the date line can accept reports across the line', () => {
  assert.equal(isNearCampus({latitude:0,longitude:-179.999}, {latitude:0,longitude:179.999,radius_m:100}),true);
});
test('invalid coordinates cannot unlock report review or sending', () => {
  for(const point of [{latitude:NaN,longitude:0},{latitude:91,longitude:0},{latitude:0,longitude:181}])
    assert.equal(isNearCampus(point,campus),false);
});
