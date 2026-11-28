"""Import mesh DATA, not model cards or scripts. python3 tools/import_models.py <export directory>

Extracts signed millimetre coordinates, indices, local pivots and credit.
Writing applies the per-model fit corrections in model_fit.py and assault_running_gear.py.
The small fixed wrapper permits on-demand loading offline via a classic local script.
"""
import base64
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def extract(src):
    if src.name in ('sturmtiger-game.html', 'sturmtiger-game-fixed.html'):
        from sturmtiger_glb import extract as extract_glb
        return extract_glb(src)
    text = src.read_text(encoding='utf-8')
    # Some exports put author/paint metadata BEFORE id. Locate the data literal by
    # its actual mesh array, not by property order. Never run the embedded viewer.
    mesh_at = text.rindex('meshes:[{kind:')
    start = max(m.start() for m in re.compile(r'\bvar [\w$]+=\{').finditer(text, 0, mesh_at))
    packed, after = text[mesh_at + len('meshes:['):].split(']', 1)
    # Early exports (e.g. Maus) carry nation and/or suspension pivots AFTER the meshes.
    meta = text[start:mesh_at] + after.split('</script>', 1)[0]

    def string(key):
        return json.loads(re.search(r'\b' + key + r':("(?:[^"\\]|\\.)*")', meta)[1])

    def vector(key):
        raw = re.search(r'\b' + key + r':\[([0-9eE.,+\-]+)\]', meta)[1]
        v = [float(i) for i in raw.split(',')]
        if len(v) != 3 or not all(abs(i) < 30 for i in v):
            raise ValueError(f'{src}: {key}')
        return v

    # Decorated exports may have several coloured submeshes attached to the same part.
    chunk = re.compile(r'\{kind:"(body|tracks|wheels|turret|gun)",(?:color:"(#[a-fA-F0-9]{6})",)?position:"([A-Za-z0-9+/=]+)",index:"([A-Za-z0-9+/=]+)"\}')
    chunks = chunk.findall(packed)
    # A model can bake the running gear or a fixed superstructure into its body.
    # Keep the supplied groups exactly, without dropping unknown ones or inventing meshes.
    if chunk.sub('', packed) != ',' * max(0, len(chunks) - 1) or not {'body', 'gun'} <= {k for k, paint, _, _ in chunks if not paint}:
        raise ValueError(f'{src}: missing/unrecognised mesh groups')
    mesh = []
    count = 0
    for kind, paint, pos, idx in chunks:
        mesh.append([kind, pos, idx, paint] if paint else [kind, pos, idx])
        xyz, ix = (base64.b64decode(s, validate=True) for s in (pos, idx))
        if not xyz or not ix or len(xyz)%6 or len(ix)%6 or max(i[0] for i in struct.iter_unpack('<H', ix)) >= len(xyz)//6:
            raise ValueError(f'{src}: invalid {kind} mesh')
        count += len(ix)//6
    if count != int(re.search(r'\btriangles:(\d+)',meta)[1]):
        raise ValueError(f'{src}: triangle count mismatch')
    model_id = string('id').upper()
    source = string('sourceUrl')
    # The 23 SPG viewers reused a template's unrelated Hungarian archive credit.
    from artillery_running_gear import ARCHIVE, EXPORT_IDS
    if model_id in EXPORT_IDS and 'source:"Lesta game model mirror"' in meta:
        source = f'{ARCHIVE} / {src.name} · Lesta Games · https://github.com/unicum-gg/wot.models/tree/Lesta'
    # These viewers' template sourceUrl says "undefined/model.glb"; url credits
    # the actual per-vehicle model (including the one BlitzKit M24).
    import french_running_gear as french
    if model_id in french.EXPORT_IDS and 'nation:"france"' in meta:
        source = f'{french.ARCHIVE} / {src.name} · {string("source")} · {string("url")}'
    import national_models as national
    if re.fullmatch(r'V[0-9]{3}',model_id) and src.name.startswith(model_id[1:]+'-'):
        serial = model_id[1:]
        # The PC template's sourceUrl is undefined. url is its actual vehicle path;
        # the Blitz exports have a valid per-vehicle GLB. Do not import viewer code.
        origin = ('BlitzKit · '+source if string('sourceType')=='blitzkit' else string('url'))
        source = f'{national.ARCHIVE} / {src.name} · {origin}'
        model_id = 'NAT'+serial
    return dict(id={'T28':'T28_USSR'}.get(model_id,model_id),color=string('color'),source=source,
                tracks=(string('trackColor') if 'trackColor:' in meta else
                        '#313527' if 'nation:"ussr"' in meta and '#313527' in text[:start] else
                        '#2e3227' if 'nation:"japan"' in meta and '#2e3227' in text[:start] else
                        '#2c3126' if 'nation:"hungary"' in meta else
                        '#303030' if '#303030' in text[:start] and 'nation:"germany"' in meta else
                        '#352e27' if '#352e27' in text[:start] and 'nation:"usa"' in meta else
                        '#2d322b' if 'nation:"sweden"' in meta else '#293236'),
                pivot=vector('turretOrigin'),gunPivot=vector('gunOrigin'),meshes=mesh,triangles=count,
                **({'suspension':vector('hullOrigin')} if re.search(r'aimMode:"hull(?:-gun)?"',meta) else {}))


if __name__ == '__main__':
    from model_fit import prepare
    directory = Path(sys.argv[1])
    sources = {p.name:p for p in directory.glob('*-game.html')}
    sources.update({p.name.replace('-game-fixed.html','-game.html'):p for p in directory.glob('*-game-fixed.html')})
    for name, src in sorted(sources.items()):
        data = extract(src)
        slug = prepare(data, name.removesuffix('-game.html'))
        out = ROOT/'models'/(slug + '.mesh.js')
        out.write_text('BattleModels.receive('+json.dumps(data, separators=(',',':'), allow_nan=False)+');\n',encoding='utf-8')
        print(out.name, data['id'], data['triangles'])
