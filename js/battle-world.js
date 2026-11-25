// Procedural scenery: no texture/model downloads. Solid cover and ground markings are
// built from the very same wall and terrain records that the simulation collides with.
function buildBattleWorld(scene, state) {
  const T = THREE,
    arena = state.arena,
    spec = arena.spec;
  const { x: W, y: H } = arena.bounds,
    diagonal = Math.hypot(W, H);
  const city = arena.id === 'city',
    sand = arena.id === 'desert',
    port = arena.id === 'port',
    frost = arena.id === 'frost',
    quarry = arena.id === 'quarry';
  const weather = WeatherEngine.currentWeather,
    night = weather === 'night',
    overcast = weather === 'rain' || weather === 'snow';
  let seed = spec.seed;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const box = new T.BoxGeometry(),
    cylinder = new T.CylinderGeometry(0.5, 0.5, 1, 12);
  const crown = new T.IcosahedronGeometry(0.5, 0),
    pine = new T.ConeGeometry(0.5, 1, 7);
  const matte = new T.MeshLambertMaterial(),
    batches = new Map(),
    matrix = new T.Object3D();
  let baseHeight = 0; // ground datum of the current multi-part prop
  function place(shape, x, h, z, w, height, depth, color, turn = 0) {
    matrix.position.set(x, baseHeight + h, z);
    matrix.scale.set(w, height, depth);
    matrix.rotation.set(0, turn, 0);
    matrix.updateMatrix();
    if (!batches.has(shape)) batches.set(shape, []);
    batches.get(shape).push([matrix.matrix.clone(), new T.Color(color)]);
  }
  function texture(width, height, paint) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    paint(c.getContext('2d'));
    const map = new T.CanvasTexture(c);
    map.colorSpace = T.SRGBColorSpace;
    map.wrapS = map.wrapT = T.RepeatWrapping;
    return map;
  }
  function noise(ctx, size, count, scale = 1) {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle =
        random() > 0.49 ? `rgba(255,248,215,${random() * 0.18})` : `rgba(28,27,18,${random() * 0.23})`;
      ctx.fillRect(
        random() * size,
        random() * size,
        scale * (0.3 + random() * 2),
        scale * (0.4 + random() * 1.5)
      );
    }
  }
  const skyTop =
    spec.sky && !night && !overcast
      ? spec.sky[0]
      : night
        ? '#435e79'
        : overcast
          ? '#7c8f96'
          : frost
            ? '#789cab'
            : port
              ? '#719bb0'
              : sand
                ? '#7cabb4'
                : '#779eae';
  const horizon =
    spec.sky && !night && !overcast
      ? spec.sky[1]
      : night
        ? '#b6b7ab'
        : frost
          ? '#dce6e5'
          : overcast
            ? '#c6ccbe'
            : sand
              ? '#ead6a4'
              : quarry
                ? '#d9bd9a'
                : port
                  ? '#cfdfdf'
                  : '#ded7b9';
  scene.background = new T.Color(horizon);
  scene.fog = new T.FogExp2(
    horizon,
    weather === 'sandstorm' ? 0.00095 : overcast ? 0.0006 : spec.haze || 0.00041
  );
  const sky = new T.Mesh(
    new T.SphereGeometry(diagonal + 2300, 32, 16),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: { zenith: { value: new T.Color(skyTop) }, rim: { value: new T.Color(horizon) } },
      vertexShader:
        'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform vec3 zenith,rim;varying vec3 dir;void main(){vec3 d=normalize(dir);
      float y=max(d.y,0.);vec3 c=mix(rim,zenith,smoothstep(0.,.76,pow(y,.75)));
      float s=max(dot(d,normalize(vec3(.82,.26,-.53))),0.);c+=vec3(.31,.21,.09)*pow(s,32.)+vec3(.8,.65,.4)*smoothstep(.99955,.9999,s);
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`
    })
  );
  sky.renderOrder = -2;
  scene.add(sky);
  scene.add(
    new T.HemisphereLight(
      night || frost ? '#dceaf7' : '#fff6df',
      frost ? '#8ea6b5' : sand ? '#ac895a' : '#697064',
      night ? 1.75 : 1.85
    )
  );
  const sun = new T.DirectionalLight(frost ? '#f3f9ff' : night ? '#f5debd' : '#fff0d1', night ? 1.85 : 2.25);
  sun.position.set(-470, 740, -510);
  scene.add(sun);

  // Two ridgelines made of continuous, faceted terrain, behind the play area.
  for (let row = 0; row < 2; row++) {
    const pos = [],
      n = 84,
      radius = (diagonal + 200) / 0.75 + row * 460,
      ridge = [];
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n,
        r = radius + random() * 200;
      ridge.push([
        Math.cos(a) * r,
        (row ? 235 : 105) + Math.sin(a * 7) * 54 + random() * 100,
        Math.sin(a) * r
      ]);
    }
    for (let i = 0; i < n; i++) {
      const a = ridge[i],
        b = ridge[(i + 1) % n],
        foot = (v) => [v[0] * 0.75, -14, v[2] * 0.75];
      pos.push(...foot(a), ...a, ...b, ...foot(a), ...b, ...foot(b));
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
    geo.computeVertexNormals();
    scene.add(
      new T.Mesh(
        geo,
        new T.MeshLambertMaterial({
          color: frost
            ? row
              ? '#c3d0d6'
              : '#9aafb2'
            : quarry
              ? '#ab8d78'
              : sand
                ? '#ac805b'
                : row
                  ? '#809393'
                  : '#65796b',
          side: T.DoubleSide,
          flatShading: true
        })
      )
    );
  }
  const groundMap = texture(256, 256, (ctx) => {
    ctx.fillStyle = spec.ground;
    ctx.fillRect(0, 0, 256, 256);
    noise(ctx, 256, 2300, 3);
    noise(ctx, 256, 8200, 0.7);
    if (sand)
      for (let i = 0; i < 38; i++) {
        ctx.beginPath();
        ctx.strokeStyle = '#e4c98b35';
        const z = i * 7;
        ctx.moveTo(0, z);
        ctx.bezierCurveTo(80, z - 5, 167, z + 5, 256, z);
        ctx.stroke();
      }
  });
  const groundSize = 2 * (diagonal + 2300);
  groundMap.repeat.set(groundSize / 64, groundSize / 64);
  // An apron outside the playable mesh (not a second flat floor through ponds).
  const border = [],
    uv = [];
  function strip(x0, z0, x1, z1) {
    for (const [x, z] of [
      [x0, z0],
      [x0, z1],
      [x1, z0],
      [x0, z1],
      [x1, z1],
      [x1, z0]
    ]) {
      border.push(x, -0.12, z);
      uv.push(x / groundSize, z / groundSize);
    }
  }
  const edge = groundSize / 2;
  strip(-edge, -edge, edge, -H);
  strip(-edge, H, edge, edge);
  strip(-edge, -H, -W, H);
  strip(W, -H, edge, H);
  const apron = new T.BufferGeometry();
  apron.setAttribute('position', new T.BufferAttribute(new Float32Array(border), 3));
  apron.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2));
  apron.computeVertexNormals();
  scene.add(new T.Mesh(apron, new T.MeshLambertMaterial({ map: groundMap })));

  // Baked terrain layer, including road paint, to avoid z-fighting at road junctions.
  const tile = 1536;
  const cobbled =
    arena.zones.some((z) => z.type === 'cobble') || arena.paths.some((p) => p.type === 'cobble');
  const pathStroke = (ctx, p) => {
    ctx.beginPath();
    p.points.forEach(({ x, y }, i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  // The kilometre-scale paint cannot resolve individual stones under the tracks.
  // Bake the street mask once, then sample a separate bevelled tile in local metres.
  const stoneMask =
    cobbled &&
    texture(512, 512, (ctx) => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = ctx.strokeStyle = 'white';
      ctx.setTransform(256 / W, 0, 0, 256 / H, 256, 256);
      for (const z of arena.zones) if (z.type === 'cobble') ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.lineJoin = ctx.lineCap = 'round';
      for (const p of arena.paths)
        if (p.type === 'cobble') {
          ctx.lineWidth = p.radius * 2;
          pathStroke(ctx, p);
        }
    });
  const stoneTile =
    cobbled &&
    texture(192, 192, (ctx) => {
      ctx.fillStyle = '#645f5a';
      ctx.fillRect(0, 0, 192, 192);
      for (let j = 0; j < 12; j++)
        for (let i = -1; i < 8; i++) {
          const x = i * 24 + (j % 2) * 12,
            y = j * 16,
            c = ['#918d82', '#a39c8e', '#9e998d', '#938e85'][Math.floor(random() * 4)];
          ctx.fillStyle = c;
          ctx.fillRect(x + 1, y + 1, 22, 14);
          ctx.fillStyle = '#dbd2bc77';
          ctx.fillRect(x + 2, y + 1, 19, 1);
          ctx.fillRect(x + 1, y + 2, 1, 11);
          ctx.fillStyle = '#625e5788';
          ctx.fillRect(x + 3, y + 14, 19, 1);
          ctx.fillRect(x + 22, y + 3, 1, 11);
        }
      noise(ctx, 192, 2300, 0.55);
    });
  const surface = texture(tile, tile, (ctx) => {
    ctx.setTransform(tile / (2 * W), 0, 0, tile / (2 * H), tile / 2, tile / 2);
    for (const z of state.terrainZones) {
      ctx.fillStyle = {
        asphalt: '#626967',
        cobble: '#99968b',
        rail: '#817a6d',
        runway: '#667071',
        paving: '#a7a396',
        ice: '#9fbfc6',
        mud: '#686147',
        sand: '#cfb37d',
        trail: sand ? '#c9ac7a' : '#9a9476',
        gravel: '#a59683',
        stubble: '#acaa70'
      }[z.type];
      ctx.fillRect(z.x, z.y, z.w, z.h);
      if (z.type === 'asphalt') {
        const horiz = z.w > z.h;
        ctx.strokeStyle = '#c9c1a1';
        ctx.lineWidth = 2.7;
        ctx.setLineDash([24, 40]);
        ctx.beginPath();
        ctx.moveTo(z.x + (horiz ? 0 : z.w / 2), z.y + (horiz ? z.h / 2 : 0));
        ctx.lineTo(z.x + (horiz ? z.w : z.w / 2), z.y + (horiz ? z.h / 2 : z.h));
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (z.type === 'paving') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#8d8a8066';
        ctx.beginPath();
        for (let x = z.x; x <= z.x + z.w; x += 60) {
          ctx.moveTo(x, z.y);
          ctx.lineTo(x, z.y + z.h);
        }
        for (let y = z.y; y <= z.y + z.h; y += 60) {
          ctx.moveTo(z.x, y);
          ctx.lineTo(z.x + z.w, y);
        }
        ctx.stroke();
      } else if (z.type === 'rail') {
        const cx = z.x + z.w / 2,
          m = BATTLE_UNITS_PER_METRE;
        ctx.fillStyle = '#66523e';
        for (let y = z.y; y < z.y + z.h; y += 1.8 * m) ctx.fillRect(cx - 1.55 * m, y, 3.1 * m, 0.55 * m);
        ctx.fillStyle = '#b5b6a8';
        for (const s of [-1, 1]) ctx.fillRect(cx + s * 0.88 * m, z.y, 0.32 * m, z.h);
      } else if (z.type === 'runway') {
        const m = BATTLE_UNITS_PER_METRE,
          cy = z.y + z.h / 2;
        ctx.fillStyle = '#dddac7';
        for (let x = z.x + 80 * m; x < z.x + z.w - 66 * m; x += 24 * m)
          ctx.fillRect(x, cy - 0.7 * m, 10 * m, 1.4 * m);
        for (const s of [-1, 1]) {
          const end = s < 0 ? z.x : z.x + z.w;
          ctx.fillRect(z.x, cy + s * (z.h / 2 - 1.2 * m), z.w, 0.65 * m);
          for (let i = -3; i <= 3; i++)
            ctx.fillRect(end + (s < 0 ? 5 : -16) * m, cy + (i * 4 - 1) * m, 11 * m, 2 * m);
          ctx.save();
          ctx.translate(end - s * 38 * m, cy);
          ctx.rotate((-s * Math.PI) / 2);
          ctx.textAlign = 'center';
          ctx.font = 'bold ' + 11 * m + 'px monospace';
          ctx.fillText(s < 0 ? '09' : '27', 0, 3 * m);
          ctx.restore();
        }
      } else if (z.type === 'stubble') {
        ctx.fillStyle = '#8f905c';
        for (let y = z.y + 6; y < z.y + z.h; y += 12) ctx.fillRect(z.x, y, z.w, 2.5);
      } else if (z.type === 'sand') {
        ctx.strokeStyle = '#e0c68c';
        ctx.lineWidth = 3;
        for (let y = z.y + 11; y < z.y + z.h - 8; y += 15) {
          ctx.beginPath();
          ctx.moveTo(z.x + 4, y);
          ctx.bezierCurveTo(z.x + z.w * 0.35, y - 7, z.x + z.w * 0.65, y + 7, z.x + z.w - 4, y);
          ctx.stroke();
        }
      } else if (z.type === 'ice') {
        ctx.strokeStyle = '#e3e8dc99';
        ctx.lineWidth = 2.8;
        for (let i = 0; i < 140; i++) {
          const x = z.x + random() * (z.w - 35),
            y = z.y + random() * (z.h - 35);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 11, y + 12);
          ctx.lineTo(x + 10, y + 19);
          ctx.lineTo(x + 24, y + 28);
          ctx.stroke();
        }
      }
    }
    ctx.lineJoin = ctx.lineCap = 'round';
    for (const p of arena.paths) {
      ctx.strokeStyle = p.type === 'cobble' ? '#beb7a3' : '#827c64';
      ctx.lineWidth = 2 * p.radius + 3;
      pathStroke(ctx, p);
      ctx.strokeStyle = { cobble: '#99968b', trail: '#a39670', gravel: '#ad9e83', timber: '#907458' }[p.type];
      ctx.lineWidth = 2 * p.radius;
      pathStroke(ctx, p);
      if (p.type === 'timber') {
        const [a, b] = p.points,
          dx = b.x - a.x,
          dy = b.y - a.y,
          length = Math.hypot(dx, dy);
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.fillStyle = '#665543';
        for (let x = 0; x < length; x += 10) ctx.fillRect(x, -p.radius, 2, p.radius * 2);
        ctx.fillStyle = '#bda178';
        for (const s of [-1, 1]) ctx.fillRect(0, s * (p.radius - 7), length, 4);
        ctx.restore();
      }
    }
    for (const w of arena.water) {
      ctx.fillStyle = frost ? '#668993' : port ? '#54858d' : '#699297';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.lineWidth = 6;
      ctx.strokeStyle = frost ? '#e6eeea' : port ? '#cbbb95' : '#a2ab89';
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#cfdfd36b';
      for (let i = 0; i < 110; i++)
        ctx.fillRect(w.x + random() * (w.w - 16), w.y + random() * w.h, 6 + random() * 10, 2.3);
    }
    // A painted play boundary remains visible between the perimeter stakes.
    ctx.strokeStyle = '#d2bd8177';
    ctx.lineWidth = 4;
    ctx.setLineDash([28, 18]);
    ctx.strokeRect(-W + 3, -H + 3, 2 * W - 6, 2 * H - 6);
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    noise(ctx, tile, 38000, 1.1);
  });
  const field = arena.ground,
    mesh = new T.PlaneGeometry(W * 2, H * 2, field.cols, field.rows);
  mesh.rotateX(-Math.PI / 2);
  for (let i = 0; i < field.samples.length; i++) mesh.attributes.position.setY(i, field.samples[i]);
  mesh.computeVertexNormals();
  mesh.computeBoundingSphere();
  // Full-size paint supplies lanes, shorelines and fields. Sample the separate
  // small, repeating ground tile in world metres, not once over a kilometre:
  // grass/gravel stays sharp under the tracks without a second terrain draw.
  // Broad height and aspect variation make the playable landforms legible under
  // diffuse light too. This is vertex colour on the driveable mesh, not painted bumps.
  const colors = new Float32Array(field.samples.length * 3),
    n = mesh.attributes.normal;
  for (let i = 0; i < field.samples.length; i++) {
    const high = Math.max(0, field.samples[i]) / Math.max(1, field.max),
      sun = -n.getX(i) * 0.68 - n.getZ(i) * 0.73;
    const light = 0.93 + high * 0.09 + sun * 0.85;
    colors.set([light + high * 0.046, light, light - high * 0.062], 3 * i);
  }
  mesh.setAttribute('color', new T.BufferAttribute(colors, 3));
  const soil = new T.MeshLambertMaterial({ map: surface, vertexColors: true });
  const tint = new T.Color(spec.ground);
  if (cobbled)
    soil.addEventListener('dispose', () => {
      stoneMask.dispose();
      stoneTile.dispose();
    });
  soil.onBeforeCompile = (shader) => {
    if (cobbled) {
      shader.uniforms.stoneMask = { value: stoneMask };
      shader.uniforms.stoneTile = { value: stoneTile };
      shader.fragmentShader =
        'uniform sampler2D stoneMask; uniform sampler2D stoneTile;\n' + shader.fragmentShader;
    }
    shader.uniforms.soilTile = { value: groundMap };
    shader.uniforms.tileCount = { value: new T.Vector2((2 * W) / 64, (2 * H) / 64) };
    shader.uniforms.baseLight = { value: tint.r * 0.299 + tint.g * 0.587 + tint.b * 0.114 };
    shader.fragmentShader =
      'uniform sampler2D soilTile; uniform vec2 tileCount; uniform float baseLight;\n' +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
      vec3 grain=texture2D(soilTile,vMapUv*tileCount).rgb;
      vec4 paint=texture2D(map,vMapUv);
      float value=clamp(dot(grain,vec3(.299,.587,.114))/baseLight,.68,1.28);
      vec3 ground = mix(grain,paint.rgb*mix(1.,value,.35),paint.a);
      ${cobbled ? 'ground=mix(ground,texture2D(stoneTile,vMapUv*tileCount*1.8).rgb,texture2D(stoneMask,vMapUv).r);' : ''}
      diffuseColor.rgb *= ground;
    `
      );
  };
  scene.add(new T.Mesh(mesh, soil));
  if (arena.id === 'cape') {
    const sea = new T.Mesh(
      new T.PlaneGeometry(edge - W, edge * 2),
      new T.MeshLambertMaterial({ color: '#638c96' })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set((edge + W) / 2, 0.035, 0);
    scene.add(sea);
  }
  if (arena.water.length) {
    const pool = new T.InstancedMesh(
      new T.PlaneGeometry(),
      new T.MeshPhongMaterial({
        color: frost ? '#94c0cc' : '#638d9a',
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      }),
      arena.water.length
    );
    for (const [i, r] of arena.water.entries()) {
      matrix.rotation.set(-Math.PI / 2, 0, 0);
      matrix.scale.set(r.w, r.h, 1);
      matrix.position.set(r.x + r.w / 2, 0.04, r.y + r.h / 2);
      matrix.updateMatrix();
      pool.setMatrixAt(i, matrix.matrix);
    }
    scene.add(pool);
  }

  const neutral = (color) => new T.MeshLambertMaterial({ color });
  const roofMat = neutral('#505658'),
    edgeMat = neutral('#89918a');
  // One draw per geometry/material, not per destructible city block. Keep the
  // owner of each piece so a fallen building and its shadow disappear together.
  const buildings = new Map();
  const facades =
    city || port
      ? ['#9c7764', '#a89678', '#89928b', '#8f7467'].map((color, index) => {
          const map = texture(384, 256, (ctx) => {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 384, 256);
            ctx.fillStyle = '#3a3c321a';
            for (let y = 0; y < 256; y += 8) {
              ctx.fillRect(0, y, 384, 1);
              for (let x = y % 16 ? 0 : -14; x < 384; x += 28) ctx.fillRect(x, y, 1, 8);
            }
            noise(ctx, 384, 4200, 1);
            for (let row = 0; row < 2; row++)
              for (let col = 0; col < 5; col++) {
                const x = 11 + col * 76,
                  y = 29 + row * 93;
                ctx.fillStyle = '#655e50';
                ctx.fillRect(x - 3, y - 2, 56, 46);
                ctx.fillStyle = night ? '#c8b788' : '#435051';
                ctx.fillRect(x, y, 50, 40);
                ctx.fillStyle = night ? '#847960' : '#697778';
                ctx.fillRect(x + 2, y + 1, 21, 17);
                ctx.fillRect(x + 27, y + 21, 20, 16);
                ctx.fillStyle = '#888372';
                ctx.fillRect(x + 23, y, 3, 40);
                ctx.fillRect(x, y + 18, 50, 3);
                ctx.fillStyle = '#b5a78b';
                ctx.fillRect(x - 4, y + 40, 58, 4);
              }
            ctx.fillStyle = '#625d51';
            ctx.fillRect(0, 224, 384, 32);
            // A recessed roll-up door, service sign and enamel hazard stripes on each shop.
            const door = index % 2 ? 226 : 16;
            ctx.fillStyle = '#494c45';
            ctx.fillRect(door - 5, 136, 125, 120);
            ctx.fillStyle = '#69746d';
            ctx.fillRect(door, 143, 115, 113);
            ctx.fillStyle = '#3c4845';
            for (let y = 145; y < 256; y += 7) ctx.fillRect(door, y, 115, 1.7);
            for (let y = 148; y < 250; y += 15) {
              ctx.fillStyle = '#d6ac64';
              ctx.fillRect(door - 5, y, 5, 7);
              ctx.fillRect(door + 115, y, 5, 7);
            }
            const label = index % 2 ? 18 : 181;
            ctx.fillStyle = '#465e5c';
            ctx.fillRect(label, 172, 120, 37);
            ctx.strokeStyle = '#b4b6a0';
            ctx.strokeRect(label + 3, 175, 114, 31);
            ctx.fillStyle = '#e2d7b5';
            ctx.font = 'bold 21px monospace';
            ctx.fillText('ЦЕХ  0' + (index + 1), label + 11, 199);
            ctx.fillStyle = '#9c9b89';
            ctx.fillRect(371, 10, 4, 232);
            ctx.fillStyle = '#6a685a';
            for (let y = 22; y < 240; y += 47) ctx.fillRect(369, y, 8, 3);
          });
          return new T.MeshLambertMaterial({ map });
        })
      : [];
  function buildingPart(wall, geo, mat, x, y, z, width, height, depth, rotX = 0, yaw = 0) {
    const key = geo.id + ':' + mat.id;
    if (!buildings.has(key)) buildings.set(key, { geo, mat, parts: [], mesh: null });
    matrix.position.set(x, wall.baseHeight + y, z);
    matrix.rotation.set(rotX, yaw, 0);
    matrix.scale.set(width, height, depth);
    matrix.updateMatrix();
    buildings.get(key).parts.push({ wall, transform: matrix.matrix.clone() });
  }
  const shadow = texture(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 9, 32, 32, 32);
    g.addColorStop(0, 'rgba(28,24,18,.58)');
    g.addColorStop(1, 'rgba(28,24,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  const shadowMat = new T.MeshBasicMaterial({
    map: shadow,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2
  });
  const floorQuad = new T.PlaneGeometry();
  // A cut-corner ledge with a slightly eroded upper rim. Reuse this one mesh for
  // the coloured strata instead of repeating smooth cylinders or square blocks.
  function ledgeGeometry() {
    const rim = [
      [-0.5, -0.31],
      [-0.36, -0.49],
      [0.29, -0.5],
      [0.49, -0.32],
      [0.5, 0.26],
      [0.35, 0.48],
      [-0.28, 0.5],
      [-0.49, 0.34]
    ];
    const bottom = rim.map(([x, z]) => [x, -0.5, z]),
      top = rim.map(([x, z], i) => [x * (0.89 + 0.06 * (i % 2)), 0.5, z * (0.88 + 0.05 * (i % 3))]);
    const vertices = [];
    for (let i = 0; i < rim.length; i++) {
      const j = (i + 1) % rim.length;
      vertices.push(
        ...bottom[i],
        ...top[i],
        ...bottom[j],
        ...bottom[j],
        ...top[i],
        ...top[j],
        0,
        0.5,
        0,
        ...top[j],
        ...top[i]
      );
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(vertices), 3));
    g.computeVertexNormals();
    return g;
  }
  const strata = quarry || sand ? ledgeGeometry() : null;
  const staticShadows = [],
    landmarkGeos = new Map(),
    landmarkPaint = new T.MeshLambertMaterial({ vertexColors: true });
  for (const [i, w] of state.walls.entries()) {
    baseHeight = w.baseHeight;
    const x = w.x + w.w / 2,
      z = w.y + w.h / 2,
      h = w.height,
      d = w.h,
      a = w.w;
    if (w.model) {
      const key = w.model + ':' + w.variant,
        odd = w.turn % 2 !== 0;
      if (!landmarkGeos.has(key)) landmarkGeos.set(key, makeLandmarkGeometry(w.model, w.variant));
      buildingPart(
        w,
        landmarkGeos.get(key),
        landmarkPaint,
        x,
        0,
        z,
        odd ? d : a,
        h,
        odd ? a : d,
        0,
        (w.turn * Math.PI) / 2
      );
      if (w.type === 'building')
        buildingPart(
          w,
          floorQuad,
          shadowMat,
          x - a * 0.06,
          0.1,
          z + d * 0.06,
          a * 1.4,
          d * 1.4,
          1,
          -Math.PI / 2
        );
      else staticShadows.push(w);
      continue;
    }
    if (w.type === 'building') {
      buildingPart(
        w,
        floorQuad,
        shadowMat,
        x - a * 0.1,
        0.09,
        z + d * 0.09,
        a * 1.45,
        d * 1.45,
        1,
        -Math.PI / 2
      );
      buildingPart(w, box, facades[i % facades.length], x, h / 2, z, a, h, d);
      buildingPart(w, box, edgeMat, x, h, z, a + 2, 2, d + 2);
      buildingPart(w, box, roofMat, x, h + 1.45, z, a, 0.9, d);
      if (i % 2 === 0) {
        buildingPart(w, box, roofMat, x - a * 0.19, h + 3, z - d * 0.16, 14, 6, 20);
        buildingPart(w, cylinder, edgeMat, x + a * 0.23, h + 4, z, 4, 9, 4);
      }
      continue;
    }
    staticShadows.push(w);
    if (w.type === 'container') {
      const color = ['#996753', '#648486', '#798267', '#9a8260'][i % 4],
        rim = '#b0a894';
      place(box, x, h / 2, z, a, h, d, color);
      const alongX = a > d;
      for (let f = -0.45; f <= 0.45; f += 0.06)
        for (const sign of [-1, 1])
          place(
            box,
            x + a * (alongX ? f : sign * 0.5),
            h / 2,
            z + d * (alongX ? sign * 0.5 : f),
            1.7,
            h * 0.94,
            1.7,
            rim
          );
      place(box, x, h, z, a + 1, 1.8, d + 1, rim);
      if (h > 38) place(box, x, h * 0.51, z, a + 1, 1.7, d + 1, '#4c5550');
    } else if (w.type === 'bench' || w.type === 'mesa') {
      const ledge = w.type === 'bench',
        r = i % 2 ? Math.PI : 0,
        band = 0.46 + (i % 3) * 0.04;
      const colors = ledge ? ['#94795e', '#b69c81', '#c9b69e'] : ['#b08060', '#cd9d71', '#dcb484'];
      place(strata, x, (h * band) / 2, z, a, h * band, d, colors[0], r);
      place(strata, x, h * (band + 0.035), z, a * 0.98, h * 0.07, d * 0.98, ledge ? '#705e4f' : '#9e7359', r);
      place(strata, x, h * (band / 2 + 0.47), z, a * 0.96, h * (0.8 - band), d * 0.95, colors[1], r);
      place(strata, x, h * 0.935, z, a * 0.91, h * 0.13, d * 0.9, colors[2], r);
    } else if (w.type === 'grove') {
      place(crown, x, h * 0.09, z, a, h * 0.21, d, frost ? '#b1bfba' : '#76825d');
      for (let k = 0; k < 4; k++)
        tree(
          x + ((k % 2) - 0.5) * a * 0.56,
          z + (Math.floor(k / 2) - 0.5) * d * 0.56,
          h * (0.8 + 0.2 * random())
        );
    } else if (w.type === 'barn') {
      place(box, x, h * 0.42, z, a, h * 0.84, d, frost ? '#806f60' : '#9b6753');
      place(box, x, h * 0.87, z, a + 2, h * 0.19, d + 3, frost ? '#e1e6db' : '#636c62');
      place(box, x, h * 0.4, z + d * 0.5, a * 0.32, h * 0.75, 2, '#434f46');
      for (const sign of [-1, 1])
        place(box, x + sign * a * 0.46, h * 0.44, z + d * 0.5, 2, h * 0.85, 2, '#b8ad95');
    } else if (w.type === 'silo') {
      place(cylinder, x, h * 0.44, z, a, h * 0.88, d, '#a8a99a');
      place(pine, x, h * 0.92, z, a * 1.08, h * 0.17, d * 1.08, '#747d78');
      for (const y of [0.18, 0.48, 0.8]) place(cylinder, x, h * y, z, a * 1.02, 2, d * 1.02, '#7f8a86');
    } else if (w.type === 'crate') {
      place(box, x, h * 0.5, z, a, h, d, '#8e7d63');
      for (const k of [-0.35, 0.35]) place(box, x + k * a, h * 0.5, z, 3, h + 1, d + 1, '#5e6559');
    } else {
      place(
        crown,
        x,
        h * 0.45,
        z,
        a * 1.12,
        h * 1.18,
        d * 1.1,
        sand ? '#bb9667' : frost ? '#a7b4b3' : '#878a75'
      );
      if (frost) place(crown, x, h * 0.74, z, a * 0.88, h * 0.57, d * 0.87, '#e2e7db');
    }
  }
  baseHeight = 0;
  if (staticShadows.length) {
    const shadows = new T.InstancedMesh(floorQuad, shadowMat, staticShadows.length);
    staticShadows.forEach((w, i) => {
      matrix.rotation.set(-Math.PI / 2, 0, 0);
      matrix.position.set(w.x + w.w * 0.43, w.baseHeight + 0.08, w.y + w.h * 0.56);
      matrix.scale.set(w.w * 1.48, w.h * 1.48, 1);
      matrix.updateMatrix();
      shadows.setMatrixAt(i, matrix.matrix);
    });
    scene.add(shadows);
  }
  if (city)
    for (const sign of [-1, 1])
      for (let x = -W + 120; x < W; x += 330) {
        const z = sign * ((17 / 2) * (spec.size[1] / spec.plan[1]) + 1) * BATTLE_UNITS_PER_METRE;
        baseHeight = field.at(x, z);
        place(cylinder, x, 14, z, 1.5, 28, 1.5, '#64685b');
        place(box, x, 28, z - sign * 4.2, 1, 1, 9.3, '#62675d');
        place(box, x, 27.1, z - sign * 9, 2.4, 1.5, 4.3, '#e8dab3');
      }
  baseHeight = 0;
  // Tree belts and industrial silhouettes are outside the driveable area.
  function tree(x, z, h) {
    place(cylinder, x, h * 0.22, z, h * 0.1, h * 0.45, h * 0.1, '#716757');
    if (arena.id === 'sawmill') {
      const leaves = ['#bc823f', '#bd994c', '#b3693f', '#98894b'][Math.floor(random() * 4)];
      place(crown, x, h * 0.69, z, h * 0.53, h * 0.78, h * 0.58, leaves, random() * 6);
      place(crown, x + h * 0.13, h * 0.54, z - h * 0.07, h * 0.37, h * 0.48, h * 0.4, leaves);
    } else if (frost || (!city && random() < 0.52)) {
      place(pine, x, h * 0.63, z, h * 0.48, h * 0.82, h * 0.46, '#596c59');
      place(pine, x, h * 0.84, z, h * 0.31, h * 0.53, h * 0.31, frost ? '#d2dfd8' : '#637665');
    } else {
      const c = ['#77805b', '#697554', '#888a60'][Math.floor(random() * 3)];
      place(crown, x, h * 0.65, z, h * 0.56, h * 0.72, h * 0.58, c, random() * 6);
    }
  }
  for (let i = 0; i < (sand ? 55 : 200); i++) {
    let a = random() * Math.PI * 2,
      x = Math.cos(a) * (W + 100 + random() * 330),
      z = Math.sin(a) * (H + 105 + random() * 340);
    if (Math.abs(x) < W + 32 && Math.abs(z) < H + 32) continue;
    if (arena.id === 'cape' && x > W) continue; // open sea beyond the coves
    if (sand) place(crown, x, 3, z, 22 + random() * 33, 10 + random() * 16, 25, '#ae8c6b', a);
    else tree(x, z, 29 + random() * 46);
  }
  if (city)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = side * (W + 125 + i * 56),
          z = side * (-140 + i * 90),
          h = 138 + i * 17;
        place(cylinder, x, h / 2, z, 18, h, 18, '#92816d');
        for (let k = 0; k < 3; k++) place(cylinder, x, h * 0.76 + k * 12, z, 18.3, 6, 18.3, '#b5a896');
        place(box, x - 48, 21, z, 74, 42, 105, '#8c8980');
        place(box, x - 48, 43, z, 77, 4, 109, '#626e70');
      }
      for (let i = 0; i < 6; i++) {
        const x = side * (W + 85),
          z = 240 + i * 50;
        place(cylinder, x, 33, z, 38, 66, 38, '#a6aca0');
        place(pine, x, 70, z, 42, 11, 42, '#67777a');
      }
    }
  // Large landmarks beyond the play boundary, not invisible obstacles on a road.
  if (port)
    for (const [x, z] of [
      [0.58 * W, H + 110],
      [-0.52 * W, -H - 120],
      [W + 72, H * 0.24]
    ]) {
      for (const dx of [-38, 38])
        for (const dz of [-32, 32]) place(box, x + dx, 97, z + dz, 8, 194, 8, '#c9975d');
      for (const dz of [-32, 32]) {
        place(box, x - 46, 193, z + dz, 188, 12, 9, '#c69151');
        place(box, x - 93, 116, z + dz, 2, 145, 2, '#686d63');
      }
      place(box, x, 186, z, 60, 25, 70, '#b88150');
      place(box, x - 92, 47, z, 24, 5, 63, '#657577');
      place(box, x - 58, 177, z, 22, 20, 22, '#618087');
    }
  if (quarry)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = (-0.55 + i * 0.11) * W * side,
          z = side * (H + 78);
        place(box, x, 23 + i * 11, z, 10, 46 + i * 22, 13, '#756752');
        place(box, x, 47 + i * 22, z, W * 0.115, 7, 19, '#997857');
      }
      place(cylinder, side * W * 0.62, 60, side * (H + 70), 55, 120, 55, '#9c9380');
    }
  // Perimeter stakes make the driveable boundary legible even in open country.
  for (let x = -W; x <= W; x += 70)
    for (const z of [-H, H]) {
      place(box, x, 5, z, 3, 10, 3, '#ddd4af');
      place(box, x, 8, z, 3.2, 3, 3.2, '#ab6a46');
    }
  for (let z = -H; z <= H; z += 70)
    for (const x of [-W, W]) {
      place(box, x, 5, z, 3, 10, 3, '#ddd4af');
      place(box, x, 8, z, 3.2, 3, 3.2, '#ab6a46');
    }
  for (const [geo, list] of batches) {
    const m = new T.InstancedMesh(geo, matte, list.length);
    list.forEach(([transform, color], i) => {
      m.setMatrixAt(i, transform);
      m.setColorAt(i, color);
    });
    scene.add(m);
  }
  for (const batch of buildings.values()) {
    batch.mesh = new T.InstancedMesh(batch.geo, batch.mat, batch.parts.length);
    scene.add(batch.mesh);
  }
  // Soft roadside trees change pose only on contact, not every frame.
  let treeRevision = -1,
    trunks,
    tops;
  if (arena.trees.length) {
    trunks = new T.InstancedMesh(
      cylinder,
      new T.MeshLambertMaterial({ color: '#776852' }),
      arena.trees.length
    );
    tops = new T.InstancedMesh(
      frost ? pine : crown,
      new T.MeshLambertMaterial({
        color: frost ? '#92aa94' : arena.id === 'sawmill' ? '#ffffff' : '#75835a'
      }),
      arena.trees.length
    );
    if (arena.id === 'sawmill')
      for (let i = 0; i < arena.trees.length; i++)
        tops.setColorAt(i, new T.Color(['#c58b48', '#b27a45', '#c2a150', '#a36d43', '#8e8a53'][i % 5]));
    scene.add(trunks, tops);
  }
  function syncTrees() {
    if (!trunks || treeRevision === arena.treeRevision) return;
    treeRevision = arena.treeRevision;
    for (const [i, t] of arena.trees.entries()) {
      const base = field.at(t.x, t.y),
        yaw = t.angle || 0,
        tilt = t.fallen ? 1.48 : 0;
      const x = Math.sin(tilt) * Math.cos(yaw),
        y = Math.sin(tilt) * Math.sin(yaw),
        h = Math.cos(tilt);
      function piece(mesh, center, width, height) {
        matrix.rotation.set(tilt, Math.PI / 2 - yaw, 0, 'YXZ');
        matrix.scale.set(width, height, width);
        matrix.position.set(t.x + center * x, base + t.r + center * h, t.y + center * y);
        matrix.updateMatrix();
        mesh.setMatrixAt(i, matrix.matrix);
      }
      piece(trunks, t.height * 0.29, 2 * t.r, t.height * 0.6);
      piece(tops, t.height * 0.69, t.height * 0.48, t.height * 0.63);
    }
    for (const mesh of [trunks, tops]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }
  let drawnRevision = -1;
  function syncBuildings() {
    syncTrees();
    if (drawnRevision === arena.revision) return;
    drawnRevision = arena.revision;
    for (const { mesh, parts } of buildings.values()) {
      let count = 0;
      for (const { wall, transform } of parts) if (!wall.destroyed) mesh.setMatrixAt(count++, transform);
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  syncBuildings();
  return { syncBuildings, shadowMat };
}
