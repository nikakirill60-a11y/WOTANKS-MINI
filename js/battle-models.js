// file:// cannot fetch() a sibling model. Request the mesh once from its isolated
// archive and share part geometries among all units of this type. Never send profile data.
const BattleModels = (() => {
  const cache = new Map();
  function geometry(part) {
    const geometry = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'color']) {
      const array = part[name];
      if (
        !(array instanceof Float32Array) ||
        !array.length ||
        array.length % 9 ||
        array.length !== part.position.length
      ) {
        throw new Error('Повреждена геометрия модели.');
      }
      geometry.setAttribute(name, new THREE.BufferAttribute(array, 3));
    }
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return geometry;
  }
  function load(id, signal) {
    if (signal.aborted) return Promise.reject(signal.reason);
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.hidden = true;
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.title = 'Загрузка геометрии: ' + DB[id].n;
      const timeout = setTimeout(() => fail(new Error('Нет ответа от файла модели.')), 15000);
      function cleanup() {
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
        signal.removeEventListener('abort', abort);
        frame.remove();
      }
      function fail(error) {
        cleanup();
        reject(error);
      }
      function abort() {
        fail(signal.reason);
      }
      function receive(event) {
        const m = event.data;
        if (event.source !== frame.contentWindow || m?.type !== 'city-tanks/mesh-v1' || m.id !== id) return;
        try {
          if (
            m.error ||
            ![m.pivot, m.gunPivot, m.muzzle].every((v) => v?.length === 3 && v.every(Number.isFinite))
          )
            throw new Error('Модель не готова к бою.');
          const parts = (v) => ({ hull: geometry(v.hull), turret: geometry(v.turret), gun: geometry(v.gun) });
          const asset = {
            ...parts(m),
            far: m.far ? parts(m.far) : null,
            pivot: m.pivot,
            gunPivot: m.gunPivot,
            muzzle: m.muzzle
          };
          asset.groundY = -asset.hull.boundingBox.min.y;
          const hull = asset.hull.boundingBox, turret = asset.turret.boundingBox;
          asset.height = asset.groundY + Math.max(hull.max.y, asset.pivot[1] + turret.max.y);
          asset.aimHeight = asset.groundY + (hull.min.y + hull.max.y) * 0.5;
          cache.set(id, asset);
          cleanup();
          resolve(asset);
        } catch (error) {
          fail(error);
        }
      }
      window.addEventListener('message', receive);
      signal.addEventListener('abort', abort, { once: true });
      frame.onerror = () => fail(new Error('Не удалось открыть файл модели.'));
      frame.src = 'models/' + DB[id].file + '#battle-mesh';
      document.body.append(frame);
    });
  }
  return { load };
})();
