// The shared hangar is the inspection bay from the original MS-1 exhibit.
function buildInspectionBay(scene, camera, controls) {
  const T = THREE;
  const room = new T.Group();
  room.name = 'CITY TANKS · Депо 01';
  const steel = new T.MeshStandardMaterial({ color: '#465156', metalness: 0.43, roughness: 0.8 });
  const lip = new T.MeshStandardMaterial({ color: '#273038', metalness: 0.5, roughness: 0.76 });
  const stripe = new T.MeshStandardMaterial({ color: '#c09a51', metalness: 0.1, roughness: 0.9 });
  const lamp = new T.MeshBasicMaterial({ color: '#fff2ca' });
  const box = new T.BoxGeometry(1, 1, 1);
  function block(parent, material, x, y, z, width, height, depth) {
    const part = new T.Mesh(box, material);
    part.position.set(x, y, z);
    part.scale.set(width, height, depth);
    parent.add(part);
    return part;
  }
  // Painted roller door, clerestory glazing, skirting and stencilled bay numbers.
  function wallSkin(number) {
    const panel = document.createElement('canvas');
    panel.width = 1536;
    panel.height = 480;
    const g = panel.getContext('2d');
    const rect = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    const text = (label, x, y, size, color) => {
      g.font = 'bold ' + size + 'px Arial, sans-serif';
      g.fillStyle = color;
      g.fillText(label, x, y);
    };
    rect(0, 0, 1536, 480, '#495257');
    for (let x = 0; x < 1536; x += 32) {
      rect(x, 0, 2, 370, '#394245');
      rect(x + 2, 0, 2, 370, '#555e60');
    }
    rect(0, 365, 1536, 115, '#303d35');
    rect(0, 364, 1536, 4, '#ab985e');
    rect(0, 36, 1536, 67, '#26342f');
    for (let x = 8; x < 1536; x += 69) {
      rect(x, 42, 62, 55, '#82918a');
      rect(x, 44, 62, 23, '#9daaa1');
      rect(x + 29, 42, 3, 55, '#55645c');
    }
    rect(440, 145, 656, 335, '#26312b');
    rect(447, 151, 642, 329, '#525e60');
    for (let y = 153; y < 480; y += 12) {
      rect(447, y, 642, 2, '#3e484c');
      rect(447, y + 2, 642, 1, '#667178');
    }
    text(number, 688, 366, 122, '#757d7b');
    rect(116, 190, 218, 96, '#38463e');
    rect(116, 190, 5, 96, '#bfa46e');
    text('СЕКТОР', 141, 223, 15, '#c0c6b7');
    text('ДЕПО  /  ' + number, 138, 264, 30, '#d1d2bd');
    rect(1232, 260, 114, 220, '#29362f');
    rect(1238, 266, 102, 214, '#4d5b50');
    rect(1255, 285, 66, 55, '#263930');
    rect(1318, 381, 12, 4, '#b3ad8d');
    const tex = new T.CanvasTexture(panel);
    tex.colorSpace = T.SRGBColorSpace;
    return new T.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.12 });
  }
  const skins = [wallSkin('01'), wallSkin('02')];
  const wallPlane = new T.PlaneGeometry(16, 5);
  const walls = [];
  for (let i = 0; i < 4; i++) {
    const wall = new T.Group(),
      a = (i * Math.PI) / 2;
    const nx = Math.sin(a),
      nz = Math.cos(a);
    wall.position.set(-nx * 8, 0, -nz * 8);
    wall.rotation.y = a;
    room.add(wall);
    walls.push({ wall, nx, nz });
    const sheet = new T.Mesh(wallPlane, skins[i % 2]);
    sheet.position.y = 2.5;
    wall.add(sheet);
    for (const x of [-7.96, -4, 4, 7.96]) {
      block(wall, steel, x, 2.5, 0.1, 0.13, 5, 0.22);
      block(wall, lip, x, 2.5, 0.24, 0.21, 5, 0.055);
      block(wall, stripe, x, 0.6, 0.271, 0.205, 0.19, 0.008);
    }
    block(wall, lip, 0, 4.93, 0.16, 16, 0.18, 0.35);
    block(wall, steel, 0, 3.88, 0.1, 16, 0.08, 0.2);
    for (const x of [-5, 0, 5]) {
      block(wall, lip, x, 3.62, 0.23, 1.74, 0.1, 0.25);
      block(wall, lamp, x, 3.59, 0.37, 1.6, 0.036, 0.018);
    }
  }
  // Low turntable with index marks and traffic lines around the inspection stand.
  const plinth = new T.Mesh(new T.CylinderGeometry(3.06, 3.1, 0.045, 96), lip);
  plinth.position.set(0, 0.066, -0.31);
  plinth.receiveShadow = true;
  room.add(plinth);
  for (let i = 0; i < 40; i++) {
    const a = (i * Math.PI) / 20;
    const r = 2.98;
    block(
      room,
      i % 5 === 0 ? stripe : steel,
      Math.sin(a) * r,
      0.092,
      Math.cos(a) * r - 0.31,
      0.018,
      0.006,
      i % 5 === 0 ? 0.14 : 0.06
    ).rotation.y = a;
  }
  for (const x of [-3.7, 3.7]) block(room, stripe, x, 0.05, 0, 0.045, 0.008, 15.8);
  scene.add(room);
  // When zooming out, never put the viewer behind a near wall.
  function cutaway() {
    for (const { wall, nx, nz } of walls)
      wall.visible =
        (camera.position.x - wall.position.x) * nx + (camera.position.z - wall.position.z) * nz > 0.6;
  }
  controls.addEventListener('change', cutaway);
  cutaway();
  return room;
}
