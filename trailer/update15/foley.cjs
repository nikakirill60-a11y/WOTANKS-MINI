// Export the very PCM the local game constructs (not library soundalikes).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const folder=process.argv[2];if(!folder)throw Error('Pass the temporary work directory');
const out=path.resolve(folder,'foley');fs.mkdirSync(out,{recursive:true});
const bank=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../js/sector-foley.js'),'utf8')+'\nSectorFoley');
const ctx={createBuffer(channels,n,rate){const rows=Array.from({length:channels},()=>new Float32Array(n));return {channels,n,rate,rows,getChannelData:i=>rows[i]};}};
function wav(id,{rows,n,channels,rate}){const b=Buffer.alloc(44+n*channels*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*channels*2,28);b.writeUInt16LE(channels*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);for(let j=0;j<n;j++)for(let c=0;c<channels;c++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,rows[c][j]))*32767),44+2*(j*channels+c));fs.writeFileSync(path.join(out,id+'.wav'),b);}
for(const id of ['engine','chain','ground'])wav(id,bank.motor(ctx,id));
for(const id of ['field','burgstadt','port'])wav(id,bank.ambience(ctx,id,'clear'));
for(const id of ['bigshot','ready','service'])wav(id,bank.effect(ctx,id));
