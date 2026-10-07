import { test } from 'node:test';
import assert from 'node:assert/strict';
import { websiteIdentity } from '../../mobile/src/campusIdentity.js';
test('a campus website can be entered without technical URL prefixes', () => {
  assert.deepEqual(websiteIdentity('  www.school.edu  '), {website:'https://www.school.edu/',domain:'school.edu'});
  assert.equal(websiteIdentity('https://college.edu/campus')?.domain,'college.edu');
});
test('email addresses, credentials and insecure schemes are not campus websites', () => {
  for(const value of ['alex@example.com','http://school.edu','https://user:secret@school.edu','ftp://school.edu','javascript:alert(1)','school edu','localhost',''])
    assert.equal(websiteIdentity(value),null);
});
