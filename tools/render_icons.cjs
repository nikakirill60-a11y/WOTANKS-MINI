// Generate offline inventory art from the exact battle meshes. Run after import_models.py.
// Pass catalogue IDs to render only those vehicles, e.g. `node tools/render_icons.cjs KV4 IS4`.
// Requires `npm ci --prefix tests` and a Playwright Chromium (or CHROMIUM_PATH).
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  { pathToFileURL } = require('node:url');
const { chromium } = require('../tests/node_modules/playwright-core'),
  root = path.resolve(__dirname, '..');
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'city-icon-studio-'));
  const file = path.join(tmp, 'index.html');
  fs.writeFileSync(
    file,
    `<base href="${pathToFileURL(root + '/')}"><script src="models/catalog.js"></script><script src="vendor/three-r180.min.js"></script><script src="models/running-gear.js"></script><script src="js/road-wheels.js"></script><script src="js/battle-models.js"></script>`
  );
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  try {
    const page = await browser.newPage({ offline: true });
    await page.goto(pathToFileURL(file).href);
    const vehicles = await page.evaluate((ids) => {
      const selected = ids.length ? [...new Set(ids)] : Object.keys(DB);
      return selected.map((id) => {
        if (!Object.hasOwn(DB, id)) throw Error('Unknown tank: ' + id);
        return [id, DB[id].thumbnail];
      });
    }, process.argv.slice(2));
    await page.evaluate(() => {
      const T = THREE,
        renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setClearColor(0, 0);
      renderer.setSize(900, 460, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      const scene = new T.Scene(),
        mat = new T.MeshPhongMaterial({
          vertexColors: true,
          side: T.DoubleSide,
          specular: '#55584b',
          shininess: 24
        });
      scene.add(new T.HemisphereLight('#fff3d6', '#a3aea6', 2.1));
      const sun = new T.DirectionalLight('#fff2d6', 3.8),
        rim = new T.DirectionalLight('#d6eaf1', 2.3);
      sun.position.set(4.5, 7.5, 3);
      rim.position.set(-3, 3, -3);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.1, far: 25 });
      sun.shadow.bias = -0.0004;
      scene.add(sun, rim);
      const cam = new T.PerspectiveCamera(12, 900 / 460, 0.1, 200),
        vec = new T.Vector3();
      window.renderIcon = async (id) => {
        const a = await BattleModels.load(id, new AbortController().signal),
          // A more frontal view separates the two tips on the double-barrelled tanks.
          dir = (a.muzzles ? new T.Vector3(0.55, 0.43, 1) : new T.Vector3(1, 0.37, 0.49)).normalize(),
          right = new T.Vector3().crossVectors(cam.up, dir).normalize(),
          up = new T.Vector3().crossVectors(dir, right),
          group = new T.Group();
        const h = new T.Mesh(a.hull, mat),
          t = new T.Mesh(a.turret, mat),
          g = new T.Mesh(a.gun, mat);
        t.position.fromArray(a.pivot);
        g.position.fromArray(a.gunPivot);
        t.add(g);
        const wheels=new RoadWheels(a,mat).mesh; wheels.castShadow=wheels.receiveShadow=true;
        group.add(h, t, wheels);
        scene.add(group);
        group.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(group),
          target = box.getCenter(new T.Vector3());
        let distance = 0;
        for (const part of [h, t, g]) {
          part.castShadow = part.receiveShadow = true;
          const p = part.geometry.attributes.position;
          for (let i = 0; i < p.count; i++) {
            vec.fromBufferAttribute(p, i).applyMatrix4(part.matrixWorld).sub(target);
            const z = vec.dot(dir),
              tan = Math.tan(Math.PI / 30);
            distance = Math.max(
              distance,
              z + Math.abs(vec.dot(right)) / (tan * cam.aspect),
              z + Math.abs(vec.dot(up)) / tan
            );
          }
        }
        cam.position.copy(target).addScaledVector(dir, distance * 1.12);
        cam.lookAt(target);
        renderer.render(scene, cam);
        const c = document.createElement('canvas');
        c.width = 900;
        c.height = 460;
        const ctx = c.getContext('2d');
        ctx.drawImage(renderer.domElement, 0, 0);
        const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
        let l = c.width,
          r = -1,
          b = -1,
          top = c.height;
        for (let y = 0; y < c.height; y++)
          for (let x = 0; x < c.width; x++)
            if (rgba[4 * (y * c.width + x) + 3] > 16) {
              l = Math.min(l, x);
              r = Math.max(r, x);
              top = Math.min(top, y);
              b = y;
            }
        if (l < 1 || top < 1 || r >= 899 || b >= 459 || r <= l || b <= top)
          throw Error(id + ' empty or clipped');
        const out = document.createElement('canvas'),
          w = r + 1 - l,
          ht = b + 1 - top;
        out.width = 640;
        out.height = Math.ceil((ht * 624) / w) + 16;
        const o = out.getContext('2d');
        o.imageSmoothingQuality = 'high';
        o.drawImage(c, l, top, w, ht, 8, 8, 624, out.height - 16);
        scene.remove(group); wheels.dispose();
        return out.toDataURL('image/webp', 0.92).split(',')[1];
      };
    });
    for (const [id, image] of vehicles) {
      const data = await page.evaluate((id) => renderIcon(id), id);
      fs.writeFileSync(path.join(root, 'models', image), Buffer.from(data, 'base64'));
      console.log(id, image);
    }
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
