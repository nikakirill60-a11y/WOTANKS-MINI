// Transcription of the supplied sheets, not a projection of the runtime catalogue.
const fs = require('node:fs'), path = require('node:path');
const text = fs.readFileSync(path.resolve(__dirname, '../../docs/national-vehicles.tsv'), 'utf8');
const rows = text.trim().split('\n').slice(1).map(line=>{
  const [serial,nat,source,name,cls,tier,hp,hits,reload,pen,hull,turret,speed,triangles]=line.split('\t');
  const [damage,count=1]=hits.split('x').map(Number);
  return {id:'NAT'+serial.padStart(3,'0'),nat,source,name,cls,tier:+tier,hp:+hp,damage,count,reload:Math.round(1000*reload),
    pen:+pen,hull:+hull,turret:turret==='-'?null:+turret,speed:+speed,triangles:+triangles};
});
const active=rows.filter(r=>r.triangles);
const ids=(nation,source)=>active.filter(t=>(!nation || t.nat===nation) && (!source || t.source===source)).map(t=>t.id);
module.exports={rows,active,ids};
