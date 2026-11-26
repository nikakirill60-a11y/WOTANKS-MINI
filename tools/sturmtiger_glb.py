"""Read the three embedded Lesta GLB parts in the supplied tier-X viewer as data, not code.
Only this import needs fast-simplification==0.1.12 (offline QEM bake, never a game dependency).
"""
import base64
import json
import re
import struct

from assault_running_gear import Mesh, compact, without_old_wheels, road_wheels


def primitives(encoded):
    blob = base64.b64decode(encoded, validate=True)
    magic, version, length, size, kind = struct.unpack_from('<4sIII4s', blob)
    if (magic,version,length,kind) != (b'glTF',2,len(blob),b'JSON'):
        raise ValueError('Expected embedded GLB 2.0')
    gltf = json.loads(blob[20:20+size]); length, kind = struct.unpack_from('<I4s',blob,20+size)
    binary = memoryview(blob)[28+size:]
    if kind != b'BIN\0' or len(binary) != length: raise ValueError('Invalid GLB buffer')

    def accessor(i, fmt, component, shape):
        a = gltf['accessors'][i]; v = gltf['bufferViews'][a['bufferView']]
        if (a['componentType'],a['type'],v['buffer']) != (component,shape,0) or 'byteStride' in v or 'sparse' in a:
            raise ValueError('Unsupported Sturmtiger accessor')
        offset = a.get('byteOffset',0); size = struct.calcsize(fmt)*a['count']
        if offset+size > v['byteLength']: raise ValueError('Short GLB accessor')
        start = v.get('byteOffset',0)+offset
        return list(struct.iter_unpack(fmt,binary[start:start+size]))

    # The flat nodes in these exports are already in bind pose. Check that joint × inverse
    # bind really is identity before discarding the skeleton (especially its reflected Z).
    for n in gltf['nodes']:
        if n.get('children') or ('mesh' in n and set(n)&{'matrix','translation','scale','rotation'}):
            raise ValueError('Unexpected GLB hierarchy')
    for skin in gltf.get('skins',[]):
        for joint,inv in zip(skin['joints'],accessor(skin['inverseBindMatrices'],'<16f',5126,'MAT4'),strict=True):
            m = gltf['nodes'][joint]['matrix']
            if any(abs(sum(m[4*k+r]*inv[4*c+k] for k in range(4))-(c==r))>1e-5 for r in range(4) for c in range(4)):
                raise ValueError('Non-neutral GLB skin')
    for m in gltf['meshes']:
        for p in m['primitives']:
            if p.get('mode',4)!=4: raise ValueError('Expected triangles')
            verts = [tuple(round(c*1000) for c in v) for v in accessor(p['attributes']['POSITION'],'<fff',5126,'VEC3')]
            it = iter(i for i, in accessor(p['indices'],'<H',5123,'SCALAR'))
            yield m['name'], verts, list(zip(it,it,it,strict=True))


def extract(src):
    from fast_simplification import simplify
    parts = json.loads(re.search(r'window\.PARTS=(\{[^<>]*?\});',src.read_text(encoding='utf-8'))[1])
    if set(parts) != {'Chassis','Hull','Gun_01'}: raise ValueError('Incomplete Sturmtiger')
    combined = {kind:Mesh() for kind in ('body','tracks','wheels','gun')}
    for part, glb in parts.items():
        for name, verts, faces in primitives(glb):
            if part=='Chassis':
                kind = {'track_L_Shape':'tracks','track_R_Shape':'tracks','chassis_L_Shape':'wheels','chassis_R_Shape':'wheels'}[name]
            else:
                kind = {'Hull':'body','Gun_01':'gun'}[part]
            if kind=='body': verts = [(x,y+1010,z) for x,y,z in verts]  # supplied hull socket above the tracks
            mesh = without_old_wheels(verts,faces,'STURMTIGER') if kind=='wheels' else compact(verts,faces)
            target = {'body':5200,'tracks':1100,'wheels':1200}.get(kind)
            if target and len(mesh.faces)>target:
                pts,ix = simplify(mesh.verts, mesh.faces, target_count=target)
                mesh = compact([tuple(map(round,p)) for p in pts],ix.tolist())
            out = combined[kind]; offset = len(out.verts); out.verts.extend(mesh.verts)
            out.faces.extend((a+offset,b+offset,c+offset) for a,b,c in mesh.faces)
    # Original sprockets, inner wheels and both complete tracks remain; only refit the exposed wheel faces.
    meshes = [m.pack(kind) for kind,m in combined.items()] + road_wheels('STURMTIGER')
    return dict(id='STURMTIGER', color='#707070', tracks='#303030',
                source='german-tanks-seven-previous-style.zip / sturmtiger-game.html · Lesta Games, Мир танков 1.46.0.0',
                pivot=[0,0,0], gunPivot=[-.30244,2.049616,1.67451], meshes=meshes,
                triangles=sum(len(base64.b64decode(m[2]))//6 for m in meshes))
