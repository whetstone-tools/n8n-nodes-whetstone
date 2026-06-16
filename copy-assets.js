/* Copies node icons (SVG/PNG) into dist alongside the compiled .js, since tsc
   ignores non-TS assets. n8n loads an icon referenced as `file:whetstone.svg`
   from the same folder as the compiled node. Avoids a gulp dependency. */
const fs = require('fs');
const path = require('path');

function copyAssets(srcDir, outDir) {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const out = path.join(outDir, entry.name);
    if (entry.isDirectory()) {
      copyAssets(src, out);
    } else if (/\.(svg|png)$/i.test(entry.name)) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(src, out);
      console.log('copied asset:', out);
    }
  }
}

copyAssets(path.join(__dirname, 'nodes'), path.join(__dirname, 'dist', 'nodes'));
copyAssets(path.join(__dirname, 'credentials'), path.join(__dirname, 'dist', 'credentials'));
