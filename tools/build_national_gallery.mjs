// Build the standalone inspection page into an empty directory, with only its browser assets.
// Usage: node tools/build_national_gallery.mjs <output directory> [game directory]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=fileURLToPath(new URL('../',import.meta.url));
if(!process.argv[2]) throw Error('Specify an empty output directory for the gallery.');
const out=path.resolve(process.argv[2]), game=path.resolve(process.argv[3] || repo);
fs.mkdirSync(out,{recursive:true});
if(fs.readdirSync(out).length) throw Error('Build into an empty directory so retired files are not served.');

const scripts=['vendor/three-r180.min.js','js/model-kit.js','js/national-crates.js','js/crate-motion.js',
  'js/crate-model.js','js/crate-view.js','js/crate-cards.js'];
const files=[...scripts,'vendor/three.LICENSE','css/winter.css','css/supplies.css'];
const crateDir='assets/crates';
for(const poster of fs.readdirSync(path.join(game,crateDir))) {
  const nation=/^national-([a-z]+)\.webp$/.exec(poster)?.[1];
  if(!nation) continue;
  files.push(`assets/flags/${nation}.webp`);
  for(const pose of ['', '-open', '-motion']) files.push(`${crateDir}/national-${nation}${pose}.webp`);
}
for(const file of files) {
  const dest=path.join(out,file);
  fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.copyFileSync(path.join(game,file),dest);
}
const bench=fs.readFileSync(path.join(game,'index.html'),'utf8').match(/<dialog id="container-opening"[\s\S]*?<\/dialog>/)?.[0];
if(!bench) throw Error('Missing inspection bench in index.html');
const html=fs.readFileSync(path.join(repo,'tools/national-gallery.html'),'utf8')
  .replace('<!-- inspection bench -->',bench)
  .replace('<!-- local scripts -->',scripts.map(src=>`<script src="${src}"></script>`).join('\n'));
fs.writeFileSync(path.join(out,'index.html'),html);
