import fs from 'node:fs';
import assert from 'node:assert/strict';

const [leftPath, rightPath, receiptPath] = process.argv.slice(2);
if (!leftPath || !rightPath || !receiptPath) {
  throw new Error('Usage: compare-assets.mjs LEFT_MANIFEST RIGHT_MANIFEST RECEIPT_PATH');
}
const left = JSON.parse(fs.readFileSync(leftPath, 'utf8'));
const right = JSON.parse(fs.readFileSync(rightPath, 'utf8'));
assert(left.length > 0 && right.length > 0, 'Both manifests must contain emitted assets.');
const leftEntries = new Set(left.map((entry) => JSON.stringify(entry)));
const rightEntries = new Set(right.map((entry) => JSON.stringify(entry)));
const receipt = {
  leftPath,
  rightPath,
  leftCount: left.length,
  rightCount: right.length,
  literalEquality: JSON.stringify(left) === JSON.stringify(right),
  leftDifferent: left.filter((entry) => !rightEntries.has(JSON.stringify(entry))),
  rightDifferent: right.filter((entry) => !leftEntries.has(JSON.stringify(entry))),
  method:
    'Exact path, byte count and SHA-256 comparison. No filename, export-alias, hash or code normalization.',
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(
  JSON.stringify({
    literalEquality: receipt.literalEquality,
    leftCount: left.length,
    rightCount: right.length,
    leftDifferent: receipt.leftDifferent.length,
    rightDifferent: receipt.rightDifferent.length,
    receiptPath,
  })
);
process.exitCode = receipt.literalEquality ? 0 : 1;
