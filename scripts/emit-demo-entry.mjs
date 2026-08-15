// Emit dist/demo/index.html so GitHub Pages serves resusiq.app/demo.
// Same bundle; demo-ness comes from the path at runtime (src/lib/demoMode.ts).
// Asset URLs are absolute (base '/'), so a straight copy resolves correctly.
import { mkdirSync, copyFileSync } from 'fs';
mkdirSync('dist/demo', { recursive: true });
copyFileSync('dist/index.html', 'dist/demo/index.html');
console.log('emitted dist/demo/index.html');
