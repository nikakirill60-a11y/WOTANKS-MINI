// The film's type plates, predecessors, route count and odds use the shipped data.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../..');
const src=['models/catalog.js','js/tree-event.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
process.stdout.write(vm.runInNewContext(src+`\nJSON.stringify({
 fleet:Object.fromEntries(Object.entries(DB).map(([id,v])=>[id,{name:v.n,tier:v.tier,nat:v.nat,cls:v.cls,art:v.thumbnail,parent:v.parent,alpha:v.alpha,reload:v.reload,mag:v.mag||1}])),
 routes:Object.fromEntries(Object.values(BRANCHES).flatMap(b=>b.routes.map(route=>[route.at(-1).id,route.map(t=>t.id)]))),
 toys:TreeEvent.items,slots:TreeEvent.slotCount,ordinary:TreeEvent.dropChance([]),withBall:TreeEvent.dropChance(['bauble'])
})`));
