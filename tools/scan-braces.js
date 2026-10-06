'use strict';
const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');
let depth = 0, inStr = null, inBlock = false;
const anomalies = [];
lines.forEach((line, idx) => {
  const before = depth;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], next = line[i + 1];
    if (inBlock) { if (ch === '*' && next === '/') { inBlock = false; i++; } continue; }
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '/' && next === '/') break;
    if (ch === '/' && next === '*') { inBlock = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  if (inStr) inStr = null;
  if (/^ {0,2}(function |const |let )/.test(line) && before !== 1 && depth !== 1) {
    anomalies.push((idx + 1) + ' before=' + before + ' after=' + depth + ' | ' + line.trim().slice(0, 70));
  }
});
console.log(anomalies.slice(0, 15).join('\n') || '无明显异常行');
console.log('最终权括号深度:', depth);
