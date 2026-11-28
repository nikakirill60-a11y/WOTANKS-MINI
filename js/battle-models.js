// Offline, on-demand mesh library. Each local .mesh.js is a fixed registration call
// containing only whitelisted model data. No iframes, showcase pages or network fetches.
const BattleModels = (() => {
  const cache = new Map(),
    waiters = new WeakMap();
  function unpack(text, Type) {
    const b = atob(text),
      v = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) v[i] = b.charCodeAt(i);
    return new Type(v.buffer);
  }
  // Preserve authored hard edges: share normals across coincident corners only
  // within a 45-degree crease. The wheel/track exports use indexed vertex normals.
  function crease(pos) {
    const adjacent = new Map(),
      corners = new Array(pos.length / 3),
      faces = new Float32Array(pos.length / 3);
    for (let i = 0; i < pos.length; i += 9) {
      const a = pos[i + 3] - pos[i],
        b = pos[i + 4] - pos[i + 1],
        c = pos[i + 5] - pos[i + 2],
        d = pos[i + 6] - pos[i],
        e = pos[i + 7] - pos[i + 1],
        f = pos[i + 8] - pos[i + 2];
      const x = b * f - c * e,
        y = c * d - a * f,
        z = a * e - b * d,
        len = Math.hypot(x, y, z) || 1,
        k = i / 3;
      faces.set([x / len, y / len, z / len], k);
      for (let j = i; j < i + 9; j += 3) {
        const key = [0, 1, 2].map((n) => Math.trunc(pos[j + n] * 100.00000001)).join(',');
        let fan = adjacent.get(key);
        if (!fan) adjacent.set(key, (fan = []));
        fan.push(k);
        corners[j / 3] = fan;
      }
    }
    const out = new Float32Array(pos.length);
    for (let v = 0; v < corners.length; v++) {
      const f = 3 * Math.floor(v / 3);
      let x = 0,
        y = 0,
        z = 0;
      for (const n of corners[v])
        if (faces[f] * faces[n] + faces[f + 1] * faces[n + 1] + faces[f + 2] * faces[n + 2] > Math.SQRT1_2) {
          x += faces[n];
          y += faces[n + 1];
          z += faces[n + 2];
        }
      const len = Math.hypot(x, y, z) || 1;
      out.set([x / len, y / len, z / len], v * 3);
    }
    return out;
  }
  function join(parts) {
    const g = new THREE.BufferGeometry();
    for (const key of ['position', 'normal', 'color']) {
      const buf = new Float32Array(parts.reduce((n, p) => n + p[key].length, 0));
      let at = 0;
      for (const p of parts) {
        buf.set(p[key], at);
        at += p[key].length;
      }
      g.setAttribute(key, new THREE.BufferAttribute(buf, 3));
    }
    g.computeBoundingSphere();
    g.computeBoundingBox();
    // Wheel replacement changes only the draw index. Original model bounds
    // (including the tracks) still drive hits, ride height, drowning and camera.
    if (parts.some(p=>p.omit)) {
      const ix=[]; let base=0;
      for (const p of parts) {
        const count=p.position.length/3;
        if (p.omit!==true) {
          const runs=p.omit || []; let at=0;
          for (let i=0;i<count;i+=3) {
            if (at<runs.length && i===3*runs[at]) { i+=3*runs[at+1]-3; at+=2; }
            else ix.push(base+i,base+i+1,base+i+2);
          }
        }
        base+=count;
      }
      g.setIndex(ix);
    }
    return g;
  }
  function decodePart(data,kind,positions,indices,override) {
    const pos = Float32Array.from(unpack(positions, Int16Array), (v) => v / 1000),
      ix = unpack(indices, Uint16Array),
      wheels = kind === 'wheels' || kind === 'tracks',
      geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(ix, 1));
    if (wheels) geo.computeVertexNormals();
    const flat = geo.toNonIndexed(),
      position = flat.attributes.position.array,
      normal = wheels ? flat.attributes.normal.array : crease(position);
    const paint = new THREE.Color(override || (kind === 'tracks' ? data.tracks : data.color));
    if (kind === 'wheels') paint.multiplyScalar(0.65);
    const color = new Float32Array(position.length);
    for (let i = 0; i < color.length; i += 3) paint.toArray(color, i);
    geo.dispose(); flat.dispose();
    return {position,normal,color,decorative:!!override};
  }
  const wheelPaint=new Map();
  function build(data) {
    const [fit,omit]=WHEEL_FITS[data.id];
    const groups = {body:[], tracks:[], wheels:[], turret:[], gun:[]};
    data.meshes.forEach(([kind,positions,indices,override],i)=>{
      const p=decodePart(data,kind,positions,indices,override); p.omit=omit[i]; groups[kind].push(p);
    });
    if (!wheelPaint.has(data.color)) wheelPaint.set(data.color,join(STURM_WHEEL.map(
      ([pos,ix,paint])=>decodePart(data,'wheels',pos,ix,paint))));
    const a = {
      axles: fit.map(row=>row.map(v=>v/1000)), wheel:wheelPaint.get(data.color), sourceTriangles:data.triangles,
      hull: join([...groups.body, ...groups.tracks, ...groups.wheels]),
      turret: join(groups.turret),
      gun: join(groups.gun),
      pivot: data.pivot,
      gunPivot: data.gunPivot
    };
    if (data.suspension) {
      a.suspension = data.suspension;
      a.body = join(groups.body);
      a.treads = join([...groups.tracks, ...groups.wheels]);
    }
    // A decorative nose is not the muzzle. Use the authored base barrel for the ray.
    const p = groups.gun.find(part => !part.decorative).position;
    let z = -Infinity;
    for (let i = 2; i < p.length; i += 3) z = Math.max(z, p[i]);
    // The export is quantized to whole mm, then stored as Float32 metres.
    // For twins, include the full 12 mm slice of BOTH rims: a half-quantum
    // margin admits the boundary vertices but never those 13 mm from the tip.
    const twin = DB[data.id].salvo === 2, rimZ = z - (twin ? .0125 : .012);
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (let i = 0; i < p.length; i += 3)
      if (p[i + 2] >= rimZ) {
        x0 = Math.min(x0, p[i]);
        x1 = Math.max(x1, p[i]);
        y0 = Math.min(y0, p[i + 1]);
        y1 = Math.max(y1, p[i + 1]);
      }
    a.muzzle = [(x0 + x1) / 2, (y0 + y1) / 2, z];
    if (twin) {
      // Both coplanar rims are in ONE gun mesh. The sight uses their midpoint,
      // but each projectile/muzzle flash starts at its own actual barrel tip.
      const rims = [new THREE.Box3(), new THREE.Box3()], v = new THREE.Vector3();
      for (let i = 0; i < p.length; i += 3) if (p[i + 2] >= rimZ) {
        rims[Number(p[i] > a.muzzle[0])].expandByPoint(v.fromArray(p,i));
      }
      if (rims.some(r => r.isEmpty())) throw Error('Не найдены два ствола модели.');
      a.muzzles = rims.map(r => [(r.min.x+r.max.x)/2, (r.min.y+r.max.y)/2, r.max.z]);
      a.muzzle = a.muzzles[0].map((c,i) => (c+a.muzzles[1][i])/2);
    }
    // Coloured add-ons (antlers, spots) are visual only. Their boxes are not armour,
    // and must not change track contacts, aim height, or the depth at which a tank floods.
    if (data.meshes.some(m => m[3])) {
      const solidBox = parts => parts.filter(p => !p.decorative).reduce((box, p) =>
        box.union(new THREE.Box3().setFromArray(p.position)), new THREE.Box3());
      a.hitHull = solidBox([...groups.body,...groups.tracks,...groups.wheels]);
      a.hitTurret = solidBox(groups.turret);
    }
    const hull = a.hitHull || a.hull.boundingBox;
    a.groundY = -hull.min.y;
    if (DB[data.id].oscillating) {
      // The upper turret is in the gun group. Don't inflate its hit box with the long, narrow barrel.
      const box = new THREE.Box3(),
        v = new THREE.Vector3();
      for (let i = 0; i < p.length; i += 3)
        if (Math.abs(p[i] - a.muzzle[0]) > 0.3) box.expandByPoint(v.fromArray(p, i));
      a.upperBox = box;
    }
    a.height =
      a.groundY +
      Math.max(
        hull.max.y,
        a.pivot[1] + (a.hitTurret || a.turret.boundingBox).max.y,
        a.upperBox ? a.pivot[1] + a.gunPivot[1] + a.upperBox.max.y : 0
      );
    a.aimHeight = a.groundY + (hull.min.y + hull.max.y) / 2;
    return a;
  }
  function receive(data) {
    waiters.get(document.currentScript)?.(data);
  }
  function load(vehicleId, signal) {
    // A tier variant can share a physical asset, never a save slot or gun stats.
    const id = modelKey(vehicleId);
    if (signal.aborted) return Promise.reject(signal.reason);
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => fail(new Error('Нет ответа от файла модели.')), 15000);
      function clean() {
        clearTimeout(timer);
        waiters.delete(script);
        script.remove();
        signal.removeEventListener('abort', abort);
        script.onerror = script.onload = null;
      }
      function fail(error) {
        clean();
        reject(error);
      }
      function abort() {
        fail(signal.reason);
      }
      waiters.set(script, (data) => {
        try {
          if (data.id !== id) throw Error('Неверный файл модели.');
          if (!cache.has(id)) cache.set(id, build(data));
          clean();
          resolve(cache.get(id));
        } catch (e) {
          fail(e);
        }
      });
      signal.addEventListener('abort', abort, { once: true });
      script.onerror = script.onload = () => fail(Error('Не удалось прочитать геометрию.'));
      script.src = 'models/' + DB[id].file;
      document.head.append(script);
    });
  }
  return { load, receive };
})();
