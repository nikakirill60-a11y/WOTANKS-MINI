// Original low-poly scenery. One coloured mesh per design/variant, instanced across
// the sector. Local Y is up, +Z is the front. No network, texture atlas or per-window draws.
function makeLandmarkGeometry(kind, variant = 0) {
  const pos = [],
    rgb = [],
    colours = new Map(),
    tau = 2 * Math.PI;
  // Convex polygon, oriented away from an interior point (also works for sloped roofs).
  function face(c, points, inside) {
    if (!colours.has(c)) colours.set(c, new THREE.Color(c));
    const { r, g, b } = colours.get(c),
      [a, p, q] = points;
    const u = p.map((v, i) => v - a[i]),
      v = q.map((n, i) => n - a[i]);
    const flip =
      (u[1] * v[2] - u[2] * v[1]) * (a[0] - inside[0]) +
        (u[2] * v[0] - u[0] * v[2]) * (a[1] - inside[1]) +
        (u[0] * v[1] - u[1] * v[0]) * (a[2] - inside[2]) <
      0;
    for (let i = 1; i < points.length - 1; i++) {
      pos.push(...a, ...points[flip ? i + 1 : i], ...points[flip ? i : i + 1]);
      rgb.push(r, g, b, r, g, b, r, g, b);
    }
  }
  function shell(c, a, b, inside, ends = true) {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      face(c, [a[i], a[j], b[j], b[i]], inside);
    }
    if (ends) {
      face(c, a, inside);
      face(c, b, inside);
    }
  }
  // Box with an optional roll in the XY plane (bracing, hands, windmill sails).
  function box(c, x, y, z, w, h, d, roll = 0) {
    const co = Math.cos(roll),
      si = Math.sin(roll),
      ring = (dz) =>
        [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1]
        ].map(([a, b]) => [
          x + (co * a * w) / 2 - (si * b * h) / 2,
          y + (si * a * w) / 2 + (co * b * h) / 2,
          z + dz
        ]);
    shell(c, ring(-d / 2), ring(d / 2), [x, y, z]);
  }
  function strut(col,a,b,r){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),D=B.clone().sub(A).normalize();
    const u=new THREE.Vector3(Math.abs(D.y)>.85?1:0,Math.abs(D.y)>.85?0:1,0).cross(D).normalize().multiplyScalar(r),
      v=D.clone().cross(u),ring=p=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>p.clone().addScaledVector(u,i).addScaledVector(v,j).toArray());
    shell(col,ring(A),ring(B),A.clone().lerp(B,.5).toArray());
  }
  function cone(c, x, z, bottom, top, rx, rz, rtx = rx, rtz = rz, n = 12) {
    const ring = (y, w, d) =>
        Array.from({ length: n }, (_, i) => [
          x + w * Math.sin((i * tau) / n),
          y,
          z + d * Math.cos((i * tau) / n)
        ]),
      a = ring(bottom, rx, rz),
      o = [x, (bottom + top) / 2, z];
    if (rtx > 0 && rtz > 0) shell(c, a, ring(top, rtx, rtz), o);
    else {
      for (let i = 0; i < n; i++) face(c, [a[i], a[(i + 1) % n], [x, top, z]], o);
      face(c, a, o);
    }
  }
  function prism(c, x, length, profile) {
    const ring = (side) => profile.map(([y, z]) => [x + (side * length) / 2, y, z]);
    shell(c, ring(-1), ring(1), [
      x,
      ...[0, 1].map((j) => profile.reduce((sum, p) => sum + p[j], 0) / profile.length)
    ]);
  }
  const roof = (c, x, z, w, d, y, top) =>
    prism(c, x, w, [
      [y, z - d / 2],
      [top, z],
      [y, z + d / 2]
    ]);
  const diskX = (c, x, y, z, len, ry, rz, n = 12) =>
    prism(
      c,
      x,
      len,
      Array.from({ length: n }, (_, i) => [
        y + ry * Math.sin((tau * i) / n),
        z + rz * Math.cos((tau * i) / n)
      ])
    );
  const pane = '#394c51',
    glass = '#77959a',
    stone = '#a79d87',
    trim = '#dfcba9',
    dark = '#4b4943',
    timber = '#695039';
  // Flush layers use two triangles, not a whole six-sided block. A protruding
  // sill and cornice still read in silhouette at street level.
  function panel(c, x, y, z, w, h, side = false) {
    const pts = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1]
    ].map(([u, v]) => (side ? [x, y + (v * h) / 2, z + (u * w) / 2] : [x + (u * w) / 2, y + (v * h) / 2, z]));
    face(c, pts, side ? [0, y, z] : [x, y, 0]);
  }
  function windows(cols, levels, { width = 0.92, depth = 0.87, frame = trim } = {}) {
    for (const s of [-1, 1])
      for (const y of levels)
        for (let j = 0; j < cols; j++) {
          const x = width * ((j + 0.5) / cols - 0.5),
            w = (0.5 * width) / cols;
          panel(frame, x, y, s * (depth / 2 + 0.002), w + 0.022, 0.146);
          panel(pane, x, y, s * (depth / 2 + 0.004), w, 0.12);
          panel(glass, x - w * 0.22, y + 0.023, s * (depth / 2 + 0.005), w * 0.39, 0.062);
          box(frame, x, y - 0.073, s * (depth / 2 + 0.014), w + 0.036, 0.012, 0.034);
        }
  }
  function hip(c, x, z, w, d, y, top) {
    const rim = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1]
    ].map(([u, v]) => [x + (u * w) / 2, y, z + (v * d) / 2]);
    const l = [x - w * 0.34, top, z],
      r = [x + w * 0.34, top, z],
      mid = [x, (y + top) / 2, z];
    for (const f of [
      [rim[0], rim[1], r, l],
      [rim[1], rim[2], r],
      [rim[2], rim[3], l, r],
      [rim[3], rim[0], l],
      rim
    ])
      face(c, f, mid);
  }
  function door(x, z, w, h, c = dark) {
    box(trim, x, h / 2, z, w + 0.035, h + 0.021, 0.025);
    box(c, x, h / 2, z + Math.sign(z) * 0.019, w, h, 0.024);
  }
  function clock(x, y, z, r) {
    // An outward-facing round dial; four ticks and two independent hands.
    const ring = (dz) =>
      Array.from({ length: 16 }, (_, i) => [
        x + r * Math.cos((i * tau) / 16),
        y + r * Math.sin((i * tau) / 16),
        z + dz
      ]);
    shell('#eeddb6', ring(-0.008), ring(0.008), [x, y, z]);
    for (let i = 0; i < 4; i++) {
      const a = (i * tau) / 4;
      box(dark, x + 0.79 * r * Math.sin(a), y + 0.79 * r * Math.cos(a), z + 0.011, 0.011, 0.026, 0.007, -a);
    }
    box(dark, x, y + r * 0.24, z + 0.017, 0.012, r * 0.54, 0.01);
    box(dark, x + r * 0.19, y + 0.01, z + 0.019, r * 0.44, 0.014, 0.01, 0.25);
  }
  const wall = ['#d3a67d', '#b88571', '#b5b49c', '#cbbe9e'][variant % 4],
    tile = ['#80534b', '#726658', '#815849', '#687579'][variant % 4];
  if (kind === 'townhouse' || kind === 'cottage' || kind === 'snowhut' || kind === 'boathouse') {
    const snow = kind === 'snowhut',
      dock = kind === 'boathouse',
      town = kind === 'townhouse';
    const eave = town ? 0.74 : 0.64,
      paint = snow ? '#946848' : dock ? '#6d8e8b' : wall;
    box(paint, 0, eave / 2, 0, 0.94, eave, 0.87);
    box(stone, 0, 0.045, 0, 0.97, 0.09, 0.9);
    (town && variant % 2 ? hip : roof)(snow ? '#e4e8e0' : dock ? '#536e74' : tile, 0, 0, 1, 1, eave, 0.97);
    for (const s of [-1, 1]) box(snow ? '#e6d6b9' : trim, 0, eave - 0.027, s * 0.447, 0.98, 0.037, 0.028);
    if (town) {
      windows(4, [0.35, 0.58]);
      box(trim, 0, 0.447, 0, 0.96, 0.027, 0.9);
      for (const s of [-1, 1]) {
        for (const z of [-0.24, 0, 0.24])
          for (const y of [0.15, 0.36, 0.59]) {
            panel(trim, s * 0.471, y, z, 0.144, 0.14, true);
            panel(pane, s * 0.474, y, z, 0.105, 0.111, true);
            panel(glass, s * 0.476, y + 0.018, z - 0.022, 0.047, 0.054, true);
          }
        for (const x of [-0.345, 0.07, 0.295]) {
          panel(timber, x, 0.144, s * 0.439, 0.174, 0.16);
          panel(glass, x, 0.143, s * 0.442, 0.14, 0.119);
        }
        // Cafe awnings and shop fronts project into the eaves, never beyond the footprint.
        for (let j = 0; j < 8; j++)
          box(
            j % 2 ? trim : ['#9d594b', '#547572', '#778461', '#aa884c'][variant % 4],
            0.17 + (j - 3.5) * 0.07,
            0.236,
            s * 0.478,
            0.07,
            0.033,
            0.091
          );
        for (const x of [-0.44, 0.44])
          for (const y of [0.14, 0.29, 0.44, 0.59]) box(trim, x, y, s * 0.44, 0.053, 0.048, 0.025);
      }
      for (const s of [-1, 1])
        for (const x of [-0.32, 0.19]) {
          box(paint, x, 0.838, s * 0.267, 0.15, 0.138, 0.22);
          box(pane, x, 0.838, s * 0.383, 0.083, 0.08, 0.012);
          hip(tile, x, s * 0.267, 0.19, 0.26, 0.905, 0.971);
        }
    } else if (dock) {
      for (const x of [-0.36, -0.18, 0, 0.18, 0.36]) box(trim, x, 0.32, 0.445, 0.022, 0.61, 0.025);
      windows(3, [0.48], { frame: '#abc1ab' });
    } else windows(3, [0.4], { frame: snow ? '#e2ceb1' : trim });
    door(dock ? 0 : -0.17, 0.451, dock ? 0.53 : 0.13, dock ? 0.48 : 0.22, dock ? '#435a58' : timber);
    box('#875f4f', 0.31, 0.9, -0.12, 0.078, 0.22, 0.09);
    box(snow ? '#e5e7dd' : '#afa08c', 0.31, 1.012, -0.12, 0.1, 0.035, 0.11);
  } else if (kind === 'gasworks') {
    // Riveted bell holder inside an open lattice crown, with a smaller pump house at its foot.
    const rust='#ad664b',steel='#3e6268';
    cone('#9e8c70',-.08,0,0,.08,.39,.46);cone('#739290',-.08,0,.08,.66,.36,.42);
    for(const y of [.18,.38,.58,.80])cone(steel,-.08,0,y,y+.023,.394,.463,.394,.463,16);
    cone('#b88766',-.08,0,.66,.77,.365,.426,.08,.085,16);
    for(let j=0;j<12;j++) {const a=tau*j/12,x=-.08+.38*Math.cos(a),z=.45*Math.sin(a);
      box(rust,x,.46,z,.027,.88,.027);box(trim,x,.91,z,.042,.024,.042);
      const b=a+tau/12,X=-.08+.38*Math.cos(b),Z=.45*Math.sin(b);
      for(const y of [.18,.40,.62])strut(steel,[x,y,z],[X,y+.18,Z],.007);
    }
    box('#9b654f',.33,.17,.05,.31,.34,.57);roof('#52666b',.33,.05,.34,.62,.34,.46);
    for(const x of [.24,.32,.40])panel(glass,x,.19,.339,.048,.12);
    cone(rust,.39,-.33,0,.93,.049,.055,.033,.039);cone(trim,.39,-.33,.83,.86,.039,.045);
  } else if (kind === 'glasshouse') {
    // Cast-iron conservatory; each roof facet has its own glazing bars.
    const iron='#477571';box('#ba936e',0,.09,0,1,.18,.92);
    box('#80b4af',0,.39,0,.96,.43,.86);prism('#a4d0c4',0,.99,[[.60,-.45],[.86,-.23],[1,0],[.86,.23],[.60,.45]]);
    for(const s of [-1,1]) {
      box(iron,0,.60,s*.442,1,.027,.029);box(trim,0,.22,s*.44,.99,.022,.022);
      for(let i=-5;i<=5;i++){const x=i*.094;box(iron,x,.40,s*.445,.012,.42,.016);
        prism(iron,x,.014,[[.60,s*.456],[.87,s*.238],[1.01,0],[.99,0],[.85,s*.23]]);}
      for(let i=-4;i<5;i++)panel(i%3?'#73a9a8':'#92bfac',(i+.5)*.094,.40,s*.437,.076,.32);
    }
    for(const s of [-1,1]){for(let k=-2;k<=2;k++){
        panel('#587e7c',s*.483,.4,k*.155,.137,.30,true);panel('#9ccac2',s*.487,.45,k*.155,.112,.148,true);}
      strut(iron,[s*.492,.60,-.43],[s*.492,.98,0],.011);strut(iron,[s*.492,.98,0],[s*.492,.60,.43],.011);}
    box('#e5cf9a',0,.27,.449,.17,.36,.033);box(iron,0,.24,.47,.12,.33,.02);
  } else if (kind === 'observatory') {
    const clay='#ba7557', blue='#48777c', brass='#dfb568';
    cone('#b39876',0,0,0,.09,.50,.48,.48,.46,16);cone(clay,0,0,.09,.50,.45,.43,.40,.39,16);
    for(const y of [.14,.36,.48])cone(brass,0,0,y,y+.027,.455-(y-.14)*.10,.438-(y-.14)*.10,undefined,undefined,16);
    for(let j=0;j<5;j++){const a=j*Math.PI/10,b=(j+1)*Math.PI/10;
      cone(j%2?'#68969a':blue,0,0,.52+.43*Math.sin(a),.52+.43*Math.sin(b),.411*Math.cos(a),.401*Math.cos(a),.411*Math.cos(b),.401*Math.cos(b),20);}
    for(const x of [-.042,.042])for(let j=-4;j<4;j++){
      const pt=k=>[x,.525+.441*Math.cos(k*Math.PI/8),.408*Math.sin(k*Math.PI/8)];strut(brass,pt(j),pt(j+1),.009);}
    box(brass,0,.97,0,.045,.06,.043);for(let i=-2;i<=2;i++)panel('#534c47',i*.105,.26,.425-.035*Math.abs(i),.041,.083);
    box('#e8bb83',0,.11,.434,.20,.22,.1);door(0,.49,.11,.17);
  } else if (kind === 'gantry') {
    const steel='#416974',ochre='#d29746';box('#928c75',0,.04,0,.97,.08,.96);
    for(const z of [-.34,.34]){
      for(const x of [-.32,.32]){box(steel,x,.13,z,.19,.10,.17);strut(ochre,[x,.15,z],[x*.82,.76,z*.85],.027);}
      box(ochre,-.055,.78,z*.85,.89,.06,.06);box(ochre,-.055,.94,z*.85,.89,.034,.047);
      for(let j=0;j<7;j++){const x=-.48+j*.119;strut(steel,[x,j%2?.93:.80,z*.85],[x+.119,j%2?.80:.93,z*.85],.009);}
    }
    for(const x of [-.46,-.24,.05,.32])box(steel,x,.78,0,.025,.035,.62);
    box('#d4b46e',.21,.83,.04,.26,.16,.52);box(glass,.21,.85,.31,.21,.079,.028);
    for(const x of [-.46,-.20])strut(dark,[x,.77,.09],[x,.41,.09],.004);
    box('#b56448',-.33,.35,.09,.35,.13,.31);for(let i=0;i<8;i++)box('#e59c6d',-.48+.043*i,.35,.25,.009,.11,.008);
    for(const [x,z] of [[-.14,-.21],[.15,-.18],[.10,.19]]){box(steel,x,.16,z,.27,.17,.3);for(let j=0;j<5;j++)box('#89a199',x-.11+j*.055,.16,z+.153,.012,.16,.007);}
  } else if (kind === 'headframe') {
    const rust='#a35b42',iron='#3d5357';box('#9b8772',0,.038,0,.97,.076,.91);
    box('#9b7662',.21,.19,0,.48,.32,.74);roof('#5f6f6c',.21,0,.54,.83,.35,.47);
    for(const z of [-.25,.25]){strut(rust,[-.43,.08,z],[-.31,.87,z],.033);strut(rust,[.41,.09,z],[-.19,.87,z],.032);
      for(let j=0;j<3;j++){const y=.18+j*.19;strut(iron,[-.40+j*.028,y,z],[.30-j*.14,y+.13,z],.012);}
      box(trim,-.24,.79,z,.38,.035,.09);}
    for(const x of [-.34,-.15]){
      const at=a=>[x+.145*Math.cos(a),.905+.097*Math.sin(a),.29];
      for(let j=0;j<12;j++){strut(iron,at(j*tau/12),at((j+1)*tau/12),.012);if(!(j%2))strut(rust,[x,.905,.29],at(j*tau/12),.006);}
      strut(dark,[x,.99,.29],[.41,.32,.29],.004);
    }
    for(const x of [.05,.17,.29])panel(glass,x,.23,.373,.075,.085);
  } else if (kind === 'radome') {
    box('#876454',0,.16,0,.90,.32,.8);box('#e6e7d9',0,.335,0,1,.07,.93);
    cone('#657d82',0,0,.37,.51,.30,.34,.28,.32,12);
    const ring=(lat,step)=>Array.from({length:12},(_,j)=>{const a=(j+step)*tau/12;return [.43*Math.cos(lat)*Math.cos(a),.67+.34*Math.sin(lat),.49*Math.cos(lat)*Math.sin(a)];});
    for(let k=0;k<5;k++){const a=ring(-.55+k*.40,(k%2)*.5),b=ring(-.55+(k+1)*.40,((k+1)%2)*.5);
      for(let j=0;j<12;j++){const n=(j+1)%12,inside=[0,.67,0];face(['#dce8e4','#cbdbde','#eff0dd'][(j+k)%3],[a[j],b[j],a[n]],inside);face('#cfdddd',[a[n],b[j],b[n]],inside);}
      if(k===4)face('#e6eee8',b,[0,.67,0]);}
    for(const x of [-.29,-.13,.03,.19])panel('#c4ced0',x,.20,.403,.085,.083);
    box('#b65e49',.40,.51,.33,.018,.36,.021);box(trim,.40,.708,.33,.037,.032,.039);
  } else if (kind === 'belfry') {
    box('#b98970',0,.25,0,.78,.50,.80);box(stone,0,.06,0,.92,.12,.94);
    for(const s of [-1,1]){box(trim,s*.355,.36,0,.045,.51,.84);clock(0,.42,s*.415,.134);
      for(const y of [.17,.29,.49])box('#d9ab87',0,y,0,.82,.017,.84);
      for(const z of [-.22,0,.22]){panel(trim,s*.394,.285,z,.118,.158,true);panel(pane,s*.399,.285,z,.076,.125,true);}}
    door(0,.409,.20,.195);
    box(trim,0,.55,0,.9,.052,.93);
    for(const x of [-.30,.30])for(const z of [-.31,.31])box('#d9bd91',x,.66,z,.10,.20,.10);
    cone('#a87844',0,0,.61,.70,.20,.20,.12,.12,12);
    hip('#497877',0,0,.95,1,.75,.89);cone('#548683',0,0,.84,1.05,.16,.17,0,0,8);
  } else if (kind === 'daymark') {
    cone('#ac9e88',0,0,0,.13,.46,.48,.39,.41,8);
    for(const x of [-.28,.28])for(const z of [-.26,.26]) box('#8f624d',x,.48,z,.074,.80,.079,-Math.sign(x)*.15);
    for(const s of [-1,1]){box('#efe4c5',0,.75,s*.32,.46,.46,.063,Math.PI/4);box('#bd5a49',0,.75,s*.358,.28,.28,.03,Math.PI/4);}
    for(const y of [.21,.35,.49])box('#ede2c7',0,y,.26,.64,.033,.04);
  } else if (kind === 'kiln') {
    box('#a66349',0,.25,0,.96,.50,.87);roof('#586a68',0,0,1,.98,.50,.66);
    for(const x of [-.30,0,.30]){cone('#9e624a',x,-.19,.54,.97,.069,.093,.047,.068,8);cone('#d3b184',x,-.19,.93,.99,.065,.084,.065,.084,8);
      box('#60483e',x,.18,.444,.21,.30,.032);for(let i=0;i<4;i++)panel('#bf8c56',x,.09+i*.061,.465,.18,.016);}
    for(const s of [-1,1]) box('#dabd8d',0,.45,s*.439,.97,.032,.03);
  } else if (kind === 'terminal') {
    const ivory='#dfd8bf',teal='#497980';box(ivory,0,.19,0,.96,.38,.82);
    box(teal,0,.29,0,1,.046,.89);box('#b1b9a4',0,.405,0,.97,.07,.87);
    box(ivory,0,.47,-.02,.31,.50,.77);box(teal,0,.69,-.02,.34,.06,.82);
    for(const s of [-1,1]){for(let i=-5;i<=5;i++)panel(glass,i*.082,.16,s*.412,.062,.16);
      panel(pane,0,.52,s*.395-.02,.26,.15);for(const x of [-.09,0,.09])panel(glass,x,.54,s*.401-.02,.072,.094);}
    for(const x of [-.115,0,.115])box(ivory,x,.77,-.02,.026,.20,.50);box(teal,0,.81,-.02,.29,.032,.59);
    cone('#b37859',0,0,.84,1.05,.012,.025,0,0,7);
  } else if (kind === 'townhall') {
    box('#bf9277', 0, 0.25, 0, 0.96, 0.5, 0.8);
    windows(7, [0.18, 0.37], { depth: 0.8 });
    roof('#6e7372', 0, 0, 1, 0.95, 0.5, 0.67);
    box(trim, 0, 0.48, 0, 0.98, 0.04, 0.87);
    box('#b49b79', 0, 0.59, 0.18, 0.22, 0.5, 0.42);
    box(trim, 0, 0.78, 0.18, 0.25, 0.035, 0.45);
    clock(0, 0.69, 0.405, 0.078);
    roof('#54676b', 0, 0.18, 0.28, 0.49, 0.8, 0.92);
    cone('#686950', 0, 0.18, 0.9, 1.05, 0.017, 0.022, 0, 0, 8);
    door(0, 0.42, 0.14, 0.28);
  } else if (kind === 'station') {
    box('#ad7457', 0, 0.3, 0, 0.98, 0.6, 0.85);
    roof('#485d61', 0, 0, 1, 0.94, 0.6, 0.77);
    windows(7, [0.38], { depth: 0.85 });
    box('#ccb793', 0, 0.53, 0, 1, 0.036, 0.9);
    box('#bb8767', 0, 0.7, 0.255, 0.25, 0.43, 0.39);
    roof('#596465', 0, 0.255, 0.29, 0.47, 0.914, 1.025);
    clock(0, 0.79, 0.457, 0.093);
    door(0, 0.437, 0.14, 0.32);
    for (const s of [-1, 1]) {
      box('#637676', 0, 0.32, s * 0.47, 0.85, 0.048, 0.19);
      for (const x of [-0.4, -0.2, 0.2, 0.4]) box(dark, x, 0.16, s * 0.55, 0.018, 0.32, 0.018);
    }
  } else if (kind === 'tower' || kind === 'keep' || kind === 'rampart') {
    const ash = '#b3a48c',
      light = '#cfbfa2',
      slate = '#526775',
      flag = '#9e4848';
    if (kind === 'tower') {
      cone(ash, 0, 0, 0, 0.65, 0.42, 0.42, 0.4, 0.4);
      cone(light, 0, 0, 0.59, 0.68, 0.44, 0.44, 0.49, 0.49);
      cone('#65727a', 0, 0, 0.68, 0.73, 0.51, 0.51);
      cone(slate, 0, 0, 0.73, 0.995, 0.49, 0.49, 0, 0);
      for (const z of [-0.4, 0.4]) {
        box(dark, 0, 0.44, z, 0.09, 0.14, 0.022);
        box(light, 0, 0.366, z, 0.14, 0.014, 0.038);
      }
      for (const y of [0.18, 0.55]) cone(light, 0, 0, y, y + 0.025, 0.435, 0.435, 0.435, 0.435);
      panel(flag, 0, 0.38, 0.419, 0.13, 0.23);
      panel('#d8b570', 0, 0.46, 0.421, 0.095, 0.017);
      cone(stone, 0, 0, 0, 0.1, 0.47, 0.47, 0.45, 0.45);
    } else if (kind === 'keep') {
      // A gabled hall with two attached staircase turrets inside one footprint.
      box(ash, 0, 0.365, 0, 0.85, 0.73, 0.76);
      box(stone, 0, 0.065, 0, 0.89, 0.13, 0.81);
      hip(slate, 0, 0, 0.91, 0.85, 0.73, 0.99);
      windows(6, [0.34, 0.56], { width: 0.81, depth: 0.76 });
      for (const y of [0.19, 0.47, 0.71]) box(light, 0, y, 0, 0.87, 0.024, 0.785);
      for (const sign of [-1, 1]) {
        const x = sign * 0.39,
          z = sign * 0.3;
        cone(ash, x, z, 0, 0.76, 0.102, 0.15, 0.096, 0.14, 10);
        cone(light, x, z, 0.72, 0.78, 0.112, 0.16, 0.12, 0.17, 10);
        cone(slate, x, z, 0.78, 1.07, 0.137, 0.19, 0, 0, 10);
        for (const j of [-0.24, 0.24]) {
          box(ash, j, 0.384, sign * 0.385, 0.053, 0.71, 0.057);
          panel(flag, j, 0.47, sign * 0.42, 0.045, 0.16);
        }
      }
      door(0, 0.39, 0.16, 0.25);
      box(trim, 0, 0.23, 0.42, 0.22, 0.036, 0.1);
    } else {
      box(ash, 0, 0.385, 0, 0.96, 0.77, 0.92);
      box(light, 0, 0.745, 0, 1, 0.08, 1);
      for (const s of [-1, 1])
        for (let i = 0; i < 7; i++) box(ash, (i - 3) * 0.146, 0.84, s * 0.44, 0.085, 0.16, 0.12);
      for (const x of [-0.32, 0, 0.32]) box(dark, x, 0.6, 0.468, 0.026, 0.18, 0.015);
    }
  } else if (kind === 'planter') {
    box(stone, 0, 0.16, 0, 0.96, 0.32, 0.92);
    box(trim, 0, 0.36, 0, 1, 0.1, 1);
    box(timber, 0, 0.417, 0, 0.91, 0.036, 0.83);
    for (let j = 0; j < 5; j++)
      cone(
        j % 2 ? '#78804f' : '#647449',
        (j - 2) * 0.18,
        0,
        0.42,
        0.88 - (j % 2) * 0.1,
        0.105,
        0.36,
        0.073,
        0.25,
        7
      );
  } else if (kind === 'trawler') {
    // Hull on a wooden repair cradle in the boatyard, not a floating land collider.
    for (const x of [-0.29, 0, 0.29]) box(timber, x, 0.085, 0, 0.083, 0.17, 0.89);
    const hull = (y, w, d) =>
      [
        [0.5, 0],
        [0.28, 0.48],
        [-0.42, 0.47],
        [-0.48, 0.24],
        [-0.48, -0.24],
        [-0.42, -0.47],
        [0.28, -0.48]
      ].map(([x, z]) => [x * w, y, z * d]);
    shell('#8e5743', hull(0.15, 0.86, 0.38), hull(0.39, 0.96, 0.95), [0, 0.26, 0]);
    shell('#4e7377', hull(0.39, 0.96, 0.95), hull(0.56, 1, 1), [0, 0.48, 0]);
    face(trim, hull(0.565, 1, 1), [0, 0.55, 0]);
    box('#d1bc97', -0.095, 0.66, 0, 0.28, 0.19, 0.56);
    box(glass, -0.095, 0.78, 0, 0.26, 0.072, 0.54);
    box(trim, -0.095, 0.826, 0, 0.31, 0.026, 0.6);
    cone(timber, 0.21, 0, 0.565, 1.13, 0.012, 0.023, 0.008, 0.012, 8);
    box(timber, 0.23, 0.91, 0, 0.23, 0.015, 0.024, 0.26);
  } else if (kind === 'fountain') {
    cone(stone, 0, 0, 0, 0.16, 0.5, 0.5);
    cone('#82a6ac', 0, 0, 0.16, 0.19, 0.45, 0.45);
    cone(trim, 0, 0, 0.19, 0.4, 0.11, 0.11, 0.06, 0.06);
    cone(stone, 0, 0, 0.4, 0.55, 0.08, 0.08, 0.27, 0.27);
    cone('#9bbcc1', 0, 0, 0.55, 0.57, 0.235, 0.235);
    cone(trim, 0, 0, 0.56, 0.97, 0.055, 0.055, 0.023, 0.023);
  } else if (kind === 'wagon') {
    box('#44494a', 0, 0.22, 0, 0.95, 0.14, 0.84);
    box('#957458', 0, 0.58, 0, 0.93, 0.57, 0.88);
    for (const s of [-1, 1]) {
      for (const x of [-0.35, -0.25, 0.25, 0.35]) box('#383c3d', x, 0.14, s * 0.32, 0.11, 0.25, 0.17);
      for (const x of [-0.44, -0.25, 0, 0.25, 0.44]) box('#5b5246', x, 0.58, s * 0.45, 0.023, 0.61, 0.035);
      box('#645642', 0, 0.33, s * 0.46, 0.95, 0.035, 0.038);
    }
    roof('#58605d', 0, 0, 1, 0.97, 0.87, 0.99);
  } else if (kind === 'works' || kind === 'sawmill') {
    const mill = kind === 'sawmill',
      base = mill ? '#977244' : '#a37963',
      iron = '#516363';
    box(base, 0, 0.34, 0, 0.95, 0.68, 0.8);
    windows(6, [0.46], { depth: 0.8, frame: mill ? '#b9a078' : '#bba28a' });
    for (let j = 0; j < 3; j++) {
      const z = -0.43 + j * 0.29;
      prism(iron, 0, 1, [
        [0.67, z],
        [0.84, z + 0.25],
        [0.67, z + 0.29]
      ]);
      box('#8eafab', 0, 0.76, z + 0.253, 0.91, 0.095, 0.025);
    }
    door(-0.14, 0.411, 0.23, 0.32);
    box('#8c5947', 0.39, 0.82, -0.26, 0.095, 0.37, 0.106);
    box('#554e48', 0.39, 1, -0.26, 0.119, 0.042, 0.13);
    if (mill) {
      for (let i = 0; i < 8; i++) {
        const a = (i * tau) / 8;
        box(timber, 0.245 + 0.12 * Math.sin(a), 0.25 + 0.12 * Math.cos(a), 0.458, 0.04, 0.27, 0.08, -a);
        box('#b18a59', 0.245 + 0.23 * Math.sin(a), 0.25 + 0.23 * Math.cos(a), 0.465, 0.097, 0.045, 0.15, -a);
      }
    }
  } else if (kind === 'windmill') {
    cone('#c4b694', 0, 0, 0, 0.71, 0.35, 0.35, 0.22, 0.22, 10);
    cone('#614d41', 0, 0, 0.7, 0.91, 0.3, 0.3, 0, 0, 10);
    door(0, 0.302, 0.14, 0.25);
    box(pane, -0.12, 0.47, 0.215, 0.075, 0.095, 0.04);
    for (let k = 0; k < 4; k++) {
      const a = (k * tau) / 4 + 0.59,
        s = Math.sin(a),
        c = Math.cos(a);
      box(dark, s * 0.24, 0.64 + c * 0.24, 0.35, 0.027, 0.5, 0.039, -a);
      box('#dbc79d', s * 0.3 + c * 0.053, 0.64 + c * 0.3 - s * 0.053, 0.36, 0.103, 0.326, 0.018, -a);
      for (const v of [0.18, 0.26, 0.34, 0.42])
        box(timber, s * v + c * 0.052, 0.64 + c * v - s * 0.052, 0.378, 0.115, 0.018, 0.017, -a);
    }
  } else if (kind === 'hay' || kind === 'logs') {
    const hay = kind === 'hay',
      bark = hay ? '#c8a35c' : '#715743',
      end = hay ? '#dcb969' : '#c1a177';
    for (let layer = 0; layer < 3; layer++)
      for (let i = 0; i < 3 - layer; i++) {
        const z = (i - (2 - layer) / 2) * 0.3,
          y = 0.19 + layer * 0.29,
          len = 0.92 - ((i + layer) % 3) * 0.04;
        diskX(bark, 0, y, z, len, 0.19, 0.17, 10);
        for (const s of [-1, 1]) diskX(end, (s * len) / 2, y, z, 0.012, 0.164, 0.147, 10);
        if (hay) for (const s of [-1, 1]) diskX('#9f834d', s * 0.24, y, z, 0.023, 0.194, 0.174, 10);
      }
  } else if (kind === 'ruin') {
    const rock = ['#c99a69', '#d4aa7c', '#b6885d'];
    box('#ad815d', 0, 0.12, 0, 1, 0.24, 0.86);
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 5; i++)
        if (j < 2 || i % 3 !== 1)
          box(rock[(i + j) % 3], (i - 2) * 0.194, 0.28 + j * 0.17, -0.16, 0.188, 0.17, 0.52);
    for (const x of [-0.38, 0.39]) {
      box(rock[1], x, 0.47, 0.22, 0.18, 0.78, 0.27);
      box(rock[0], x, 0.87, 0.22, 0.215, 0.083, 0.31);
    }
  } else if (kind === 'winch') {
    box('#6b756d', 0, 0.12, 0, 0.96, 0.24, 0.93);
    box('#bb8653', -0.3, 0.44, 0, 0.26, 0.63, 0.72);
    diskX('#5c6360', 0.12, 0.46, 0, 0.57, 0.24, 0.34);
    for (const x of [-0.17, 0.42]) diskX('#a9845b', x, 0.46, 0, 0.053, 0.38, 0.47);
    for (let i = 0; i < 8; i++) diskX('#8a8b78', -0.12 + i * 0.069, 0.46, 0, 0.021, 0.26, 0.36);
  } else if (kind === 'market') {
    box('#9a7752', 0, 0.26, 0, 0.86, 0.52, 0.77);
    box(timber, 0, 0.55, 0, 0.95, 0.075, 0.84);
    for (const x of [-0.43, 0.43]) for (const z of [-0.38, 0.38]) box(timber, x, 0.68, z, 0.023, 0.61, 0.027);
    for (let i = 0; i < 9; i++) roof(i % 2 ? '#dfc693' : '#a86048', (i - 4) / 9, 0, 1 / 9, 1, 0.83, 1);
    for (let i = 0; i < 4; i++)
      cone('#b86e47', (i - 1.5) * 0.18, 0.12, 0.59, 0.74, 0.055, 0.07, 0.074, 0.09, 8);
  } else if (kind === 'conveyor') {
    box('#9e8a70', 0, 0.14, 0, 0.98, 0.28, 0.83);
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 0.27,
        h = 0.49 + i * 0.14;
      for (const z of [-0.32, 0.32]) {
        box('#736d5b', x, h / 2, z, 0.046, h, 0.092);
        box('#bd935e', x, h - 0.08, z, 0.07, 0.15, 0.12);
      }
    }
    box('#695f50', 0, 0.68, 0, 1.02, 0.13, 0.73, 0.47);
    for (const s of [-1, 1]) box('#be9159', 0, 0.78, s * 0.38, 1.02, 0.056, 0.077, 0.47);
  } else if (kind === 'crusher') {
    box('#8c775d', 0, 0.18, 0, 0.94, 0.36, 0.85);
    for (const x of [-0.36, 0.34]) for (const z of [-0.36, 0.36]) box('#6e6e63', x, 0.47, z, 0.1, 0.64, 0.1);
    for (const x of [-0.24, 0.24]) {
      cone('#a99473', x, 0, 0.35, 0.73, 0.095, 0.14, 0.23, 0.39, 4);
      cone('#c0a889', x, 0, 0.72, 0.93, 0.23, 0.39, 0.23, 0.39, 4);
    }
    box('#665f55', 0, 0.35, 0.37, 1, 0.13, 0.17);
    box('#afa18a', 0, 0.77, 0.44, 0.9, 0.027, 0.026);
  } else if (kind === 'lighthouse') {
    for (let i = 0; i < 5; i++) {
      const r = 0.38 - i * 0.028;
      cone(i % 2 ? '#b95647' : '#e1d4b3', 0, 0, i * 0.148, (i + 1) * 0.148, r, r, r - 0.028, r - 0.028, 16);
    }
    cone('#586768', 0, 0, 0.74, 0.78, 0.36, 0.36);
    cone('#668994', 0, 0, 0.78, 0.93, 0.235, 0.235);
    for (let i = 0; i < 8; i++) {
      const a = (tau * i) / 8;
      box('#d3c49f', 0.23 * Math.cos(a), 0.855, 0.23 * Math.sin(a), 0.023, 0.16, 0.023);
    }
    cone('#923f34', 0, 0, 0.925, 1.03, 0.31, 0.31, 0, 0, 12);
    door(0, 0.353, 0.16, 0.17);
  } else if (kind === 'hangar') {
    const profile = [
      [0, -0.49],
      [0.42, -0.49]
    ];
    for (let i = 1; i <= 10; i++) {
      const a = (Math.PI * i) / 10;
      profile.push([0.42 + 0.57 * Math.sin(a), -0.49 * Math.cos(a)]);
    }
    profile.push([0, 0.49]);
    prism('#80918b', 0, 0.98, profile);
    for (const x of [-0.475, -0.24, 0, 0.24, 0.475])
      prism(
        '#9da99c',
        x,
        0.015,
        profile.map(([y, z]) => [y * 1.013, z * 1.013])
      );
    for (const s of [-1, 1]) {
      box('#4a5b5a', s * 0.498, 0.32, 0, 0.026, 0.62, 0.77);
      box('#a4ac9d', s * 0.514, 0.32, 0, 0.012, 0.61, 0.014);
    }
  } else if (kind === 'control') {
    box('#c5bd9f', 0, 0.31, 0, 0.55, 0.62, 0.54);
    windows(2, [0.32], { width: 0.49, depth: 0.54 });
    box('#667774', 0, 0.62, 0, 0.75, 0.065, 0.73);
    box('#4c777e', 0, 0.75, 0, 0.81, 0.22, 0.76);
    for (const s of [-1, 1])
      for (const x of [-0.38, -0.17, 0.17, 0.38]) box('#c5cbb7', x, 0.75, s * 0.386, 0.026, 0.23, 0.019);
    box('#dbd4ba', 0, 0.89, 0, 0.93, 0.06, 0.91);
    cone(dark, 0.24, 0, 0.91, 1.17, 0.014, 0.014);
  } else if (kind === 'plane') {
    const cream = '#ded7bd',
      ochre = '#b98139';
    const sections = [
      [-0.47, 0.029, 0.39],
      [-0.28, 0.064, 0.39],
      [0.12, 0.095, 0.43],
      [0.34, 0.085, 0.42],
      [0.42, 0.05, 0.43]
    ];
    const rings = sections.map(([z, r, y]) =>
      Array.from({ length: 8 }, (_, i) => [
        r * Math.cos((i * tau) / 8),
        y + r * 1.3 * Math.sin((i * tau) / 8),
        z
      ])
    );
    for (let i = 1; i < rings.length; i++)
      shell(i === 4 ? ochre : cream, rings[i - 1], rings[i], [
        0,
        0.41,
        (sections[i - 1][0] + sections[i][0]) / 2
      ]);
    for (const sign of [-1, 1]) {
      const wing = [
          [sign * 0.045, 0.31, 0.15],
          [sign * 0.5, 0.38, 0.11],
          [sign * 0.475, 0.37, -0.015],
          [sign * 0.07, 0.31, -0.075]
        ],
        low = wing.map(([x, y, z]) => [x, y - 0.034, z]);
      shell(ochre, wing, low, [sign * 0.25, 0.325, 0.034]);
      box(dark, sign * 0.07, 0.19, 0.16, 0.022, 0.19, 0.024);
      box('#434944', sign * 0.084, 0.075, 0.16, 0.061, 0.145, 0.092);
    }
    box(cream, 0, 0.44, -0.35, 0.39, 0.031, 0.095);
    box(ochre, 0, 0.57, -0.39, 0.029, 0.29, 0.119);
    cone(glass, 0, 0.086, 0.47, 0.59, 0.079, 0.124, 0.055, 0.068, 8);
    box(dark, 0, 0.435, 0.432, 0.032, 0.43, 0.019, 0.64);
  } else throw Error('Неизвестная модель сектора: ' + kind);

  const g = new THREE.BufferGeometry();
  g.name = 'landmark:' + kind;
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rgb), 3));
  g.computeBoundingBox();
  const bounds = g.boundingBox,
    size = bounds.getSize(new THREE.Vector3()),
    c = bounds.getCenter(new THREE.Vector3());
  g.translate(-c.x, -bounds.min.y, -c.z);
  g.scale(1 / size.x, 1 / size.y, 1 / size.z);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
