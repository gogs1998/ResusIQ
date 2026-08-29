import fs from 'node:fs';
import path from 'node:path';
const sigs = [Buffer.from([0xc3,0xa2]), Buffer.from([0xc3,0x82]), Buffer.from([0xef,0xbf,0xbd])];
const skip = new Set(['node_modules','.git','dist','.vite','coverage']);
let hits = [];
(function walk(d){
  for (const e of fs.readdirSync(d,{withFileTypes:true})) {
    if (skip.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx|css|html|json|md|mjs|js)$/.test(e.name)) {
      const b = fs.readFileSync(p);
      let n = 0;
      for (const s of sigs) { let i = 0; while ((i = b.indexOf(s, i)) >= 0) { n++; i += s.length; } }
      if (n) hits.push([n, p]);
    }
  }
})('.');
console.log('files with corruption: ' + hits.length);
for (const [n,p] of hits) console.log('  ' + n + '  ' + p);
