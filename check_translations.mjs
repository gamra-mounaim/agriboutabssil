import { readFileSync } from 'fs';

const content = readFileSync('./src/translations.ts', 'utf8');

const getKeys = (block) => {
  const keys = [];
  const matches = block.matchAll(/^\s+(\w+):/gm);
  for (const m of matches) keys.push(m[1]);
  return new Set(keys);
};

// Extract each language block
const enMatch = content.match(/en:\s*\{([\s\S]*?)\n  \},/);
const frMatch = content.match(/fr:\s*\{([\s\S]*?)\n  \},/);
const arMatch = content.match(/ar:\s*\{([\s\S]*?)\n  \}/);

const enSet = getKeys(enMatch[1]);
const frSet = getKeys(frMatch[1]);
const arSet = getKeys(arMatch[1]);

const missingFR = [...enSet].filter(k => !frSet.has(k));
const missingAR = [...enSet].filter(k => !arSet.has(k));
const missingEN = [...frSet].filter(k => !enSet.has(k));

console.log('Total EN keys:', enSet.size);
console.log('Total FR keys:', frSet.size);
console.log('Total AR keys:', arSet.size);
console.log('\nMissing in FR:', missingFR);
console.log('\nMissing in AR:', missingAR);
console.log('\nIn FR but not EN:', missingEN);
