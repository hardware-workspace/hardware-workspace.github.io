import assert from 'node:assert/strict';
import { escapeCsvCell } from './security.js';
assert.equal(escapeCsvCell('a,"b"'), '"a,""b"""');
for (const value of ['=1+1', '+CMD()', '-1+1', '@SUM(A1)', '  =1', '\t=1']) {
  assert.equal(escapeCsvCell(value), '"\'' + value + '"');
}
assert.equal(escapeCsvCell(null), '""');
assert.equal(escapeCsvCell('ordinary task'), '"ordinary task"');
console.log('CSV security checks passed');
