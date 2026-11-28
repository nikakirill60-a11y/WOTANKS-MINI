const test = require('node:test'),
  assert = require('node:assert/strict');
const path = require('node:path'),
  fs = require('node:fs');
const root = process.env.CITY_TANKS_INDEX
  ? path.dirname(path.resolve(process.env.CITY_TANKS_INDEX))
  : path.resolve(__dirname, '..');
const read = (slug) =>
  JSON.parse(
    fs
      .readFileSync(path.join(root, 'models', slug + '.mesh.js'), 'utf8')
      .slice('BattleModels.receive('.length, -3)
  );
function triples(bytes, signed) {
  const b = Buffer.from(bytes, 'base64');
  return Array.from({ length: b.length / 6 }, (_, i) =>
    [0, 2, 4].map((n) => (signed ? b.readInt16LE(i * 6 + n) : b.readUInt16LE(i * 6 + n)))
  );
}
function mesh(data, kind) {
  const [, v, ix] = data.meshes.find((p) => p[0] === kind);
  return { verts: triples(v, true), faces: triples(ix, false) };
}
const range = (values) => [Math.min(...values), Math.max(...values)];
const centre = ([a, b]) => (a + b) / 2;

test('Turán I: the rotating skirt remains seated and concentric with the hull ring, even broadside or reversed', () => {
  const d = read('turan-i'),
    hull = mesh(d, 'body').verts,
    turret = mesh(d, 'turret').verts;
  const ring = hull.filter((v) => v[1] === 1511);
  assert.equal(ring.length, 20); // upper rim of the socket
  const y = Math.min(...turret.map((p) => p[1]));
  const corners = turret.filter((v) => v[1] <= y + 3);
  assert.equal(corners.length, 6);
  corners.sort((a, b) => Math.atan2(a[2], a[0]) - Math.atan2(b[2], b[0]));
  // Area centroid of the six-sided mating plate, not the centre of the gun or the roof detail.
  let twiceArea = 0,
    cx = 0,
    cz = 0;
  for (const [i, a] of corners.entries()) {
    const b = corners[(i + 1) % corners.length],
      cross = a[0] * b[2] - a[2] * b[0];
    twiceArea += cross;
    cx += cross * (a[0] + b[0]);
    cz += cross * (a[2] + b[2]);
  }
  cx /= 3 * twiceArea;
  cz /= 3 * twiceArea;
  const rx = centre(range(ring.map((p) => p[0]))),
    rz = centre(range(ring.map((p) => p[2])));
  const [px, py, pz] = d.pivot.map((v) => v * 1000);
  assert.ok(Math.abs(py + y - ring[0][1]) <= 1);
  for (let deg = 0; deg < 360; deg += 15) {
    const a = (deg * Math.PI) / 180,
      x = px + cx * Math.cos(a) + cz * Math.sin(a),
      z = pz + cz * Math.cos(a) - cx * Math.sin(a);
    assert.ok(Math.hypot(x - rx, z - rz) < 2, deg + '° skirt centre off its ring');
  }
});

// Test the actual triangle order: double-sided garage renders can hide an inside-out mesh.
function outwardBroadside({verts,faces}) {
  const [bottom,top]=range(verts.map(p=>p[1])), [back,front]=range(verts.map(p=>p[2]));
  let rays=0, left=0, right=0;
  for(let row=0;row<16;row++)for(let col=0;col<16;col++) {
    const y=bottom+(row+.513)*(top-bottom)/16,z=back+(col+.517)*(front-back)/16;
    let lo=Infinity,hi=-Infinity,lowFront=false,highFront=false;
    for(const [ia,ib,ic] of faces) {
      const a=verts[ia],b=verts[ib],c=verts[ic],by=b[1]-a[1],bz=b[2]-a[2],cy=c[1]-a[1],cz=c[2]-a[2];
      const nx=by*cz-bz*cy;if(!nx)continue;
      const u=((y-a[1])*cz-(z-a[2])*cy)/nx,v=(by*(z-a[2])-bz*(y-a[1]))/nx;
      if(u<0 || v<0 || u+v>1)continue;
      const x=a[0]+u*(b[0]-a[0])+v*(c[0]-a[0]);
      if(x<lo){lo=x;lowFront=nx<0;}if(x>hi){hi=x;highFront=nx>0;}
    }
    if(lo!==Infinity){rays++;left+=lowFront;right+=highFront;}
  }
  return Math.min(left,right)/rays;
}
test('six German OBJ casemates: hull, gun and belts face out on both sides and match StuG G paint', () => {
  const reference=read('stug-iii-g');
  for(const [,,slug] of require('./fixtures/sturmtiger.cjs').slice(0,-1)) {
    const d=read(slug);assert.deepEqual([d.color,d.tracks],[reference.color,reference.tracks]);
    for(const part of ['body','gun','tracks'])assert.ok(outwardBroadside(mesh(d,part))>.7,slug+' '+part+' winding');
  }
});

// Weld coincident cap/side vertices only for identifying each physical cylinder.
function components({ verts, faces }) {
  const parent = verts.map((_, i) => i),
    used = new Map();
  const root = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  verts.forEach((v, i) => {
    const key = v.join();
    if (used.has(key)) parent[i] = used.get(key);
    else used.set(key, i);
  });
  for (const [a, b, c] of faces) {
    parent[root(b)] = root(a);
    parent[root(c)] = root(a);
  }
  const parts = new Map();
  verts.forEach((v, i) => {
    const k = root(i);
    if (!parts.has(k)) parts.set(k, []);
    parts.get(k).push(v);
  });
  return [...parts.values()];
}
// Distance from an axle to the filled Y/Z projection of one track triangle.
function distance(y, z, face) {
  let positive = true,
    negative = true,
    nearest = Infinity;
  for (let i = 0; i < 3; i++) {
    const p = face[i],
      q = face[(i + 1) % 3],
      dy = q[1] - p[1],
      dz = q[2] - p[2],
      a = y - p[1],
      b = z - p[2];
    const cross = dy * b - dz * a;
    positive &&= cross > 0;
    negative &&= cross < 0;
    const t = Math.max(0, Math.min(1, (a * dy + b * dz) / (dy * dy + dz * dz || 1)));
    nearest = Math.min(nearest, Math.hypot(a - t * dy, b - t * dz));
  }
  return positive || negative ? 0 : nearest;
}

test('T-55AM: every tyre and hub clears the actual sloped belt triangles, including the centre guides', () => {
  const d = read('t-55am-1'),
    tracks = mesh(d, 'tracks');
  const belts = tracks.faces.map((f) => f.map((i) => tracks.verts[i]));
  const parts = components(mesh(d, 'wheels'));
  assert.equal(parts.length, 30); // five axles × two sides × two tyres + hub
  let tyres = 0;
  for (const part of parts) {
    const [lo, hi] = range(part.map((v) => v[0])),
      cy = centre(range(part.map((p) => p[1]))),
      cz = centre(range(part.map((p) => p[2])));
    const radius = Math.max(...part.map((p) => Math.hypot(p[1] - cy, p[2] - cz)));
    const sameStrip = belts.filter((f) => f.some((p) => p[0] >= lo) && f.some((p) => p[0] <= hi));
    const crossing = sameStrip.filter((f) => f.some((p) => p[2] <= cz) && f.some((p) => p[2] >= cz));
    assert.ok(
      crossing.some((f) => f.every((p) => p[1] < cy)) && crossing.some((f) => f.every((p) => p[1] > cy)),
      'inside the loop'
    );
    const gap = Math.min(...sameStrip.map((f) => distance(cy, cz, f))) - radius;
    assert.ok(gap > 1, `axle ${cz}: track intersects running gear by ${-gap} mm`);
    if (radius > 300) {
      tyres++;
      assert.ok(gap < 12, 'tyre must also remain seated near the tread');
    }
  }
  assert.equal(tyres, 20);
});

test('the three reversed Blitz exports face game-forward and the actual muzzle, not the breech, is on the pitch axis', () => {
  for (const [slug, tip] of [
    ['t18', 1042],
    ['t82', 1183],
    ['hellcat-v', 3641]
  ]) {
    const vs = mesh(read(slug), 'gun').verts,
      z = Math.max(...vs.map((v) => v[2]));
    assert.equal(z, tip);
    const rim = vs.filter((v) => v[2] >= tip - 12);
    assert.ok([0, 1].every((n) => Math.abs(centre(range(rim.map((v) => v[n])))) <= 1));
  }
});

// Intersections of a vertical line through the wheel centre with actual packed track triangles.
function beltHeights(faces, x, z) {
  const hits = [];
  for (const [a,b,c] of faces) {
    const dx=b[0]-a[0], dz=b[2]-a[2], ex=c[0]-a[0], ez=c[2]-a[2], det=dx*ez-ex*dz;
    if (!det) continue;
    const u=((x-a[0])*ez-(z-a[2])*ex)/det, v=((z-a[2])*dx-(x-a[0])*dz)/det;
    if (Math.min(u,v,1-u-v)>=-1e-7) hits.push(a[1]+u*(b[1]-a[1])+v*(c[1]-a[1]));
  }
  return hits;
}

test('Sturmtiger family: symmetric fitted road wheels sit inside both complete belts; the sight uses the barrel opening', () => {
  for (const [id,,slug,,,,,,,axles,triangles] of require('./fixtures/sturmtiger.cjs')) {
    const d=read(slug), tracks=mesh(d,'tracks'), gun=mesh(d,'gun');
    assert.equal(d.id,id);assert.equal(d.triangles,triangles);assert.match(d.source,/german-tanks-seven-previous-style\.zip/);
    assert.ok(!d.meshes.some(p=>p[0]==='turret'));
    const tip=Math.max(...gun.verts.map(p=>p[2])), rim=gun.verts.filter(p=>p[2]>=tip-12);
    assert.ok(tip>500 && [0,1].every(k=>Math.abs(centre(range(rim.map(p=>p[k]))))<=2),id+' off-axis tip');
    const band=tracks.faces.map(f=>f.map(i=>tracks.verts[i]));
    const [,vs,ix]=d.meshes.find(p=>p[0]==='wheels' && p[3]==='#434648');
    const parts=components({verts:triples(vs,true),faces:triples(ix,false)});
    const left=[],right=[];
    for(const part of parts){
      const [x,y,z]=[0,1,2].map(k=>centre(range(part.map(p=>p[k]))));
      const [low,high]=range(part.map(p=>p[1]));if(high-low<400)continue; // smaller upper return rollers
      const hits=beltHeights(band,x,z), lower=Math.max(...hits.filter(h=>h<y)),upper=Math.min(...hits.filter(h=>h>y));
      assert.ok(Number.isFinite(lower) && Number.isFinite(upper) && low-lower>=-1.1 && low-lower<=12 && high<=upper+1,
        `${id} axle at ${x},${z} must meet the lower run, below the return run`);
      (x<0?left:right).push([Math.abs(x),y,z]);
    }
    assert.equal(right.length,axles,id);assert.deepEqual(left.sort((a,b)=>a[2]-b[2]),right.sort((a,b)=>a[2]-b[2]));
    if(id==='BAER' || id==='STURMTIGER')assert.equal(new Set(right.map(p=>p[0])).size,2,'interleaved wheel rows');
  }
});
