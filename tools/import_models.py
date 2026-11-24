"""Import mesh DATA, not model cards or scripts. python3 tools/import_models.py <export directory>

Retains the original signed millimetre coordinates, indices, local pivots and credit.
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
    text = src.read_text(encoding='utf-8')
    body = text[re.search(r'\bvar \w+=\{id:"\w+",name:', text).start():].split('</script>', 1)[0]

    def string(key):
        return json.loads(re.search(r'\b' + key + r':("(?:[^"\\]|\\.)*")', body)[1])

    def vector(key):
        raw = re.search(r'\b' + key + r':\[([0-9eE.,+\-]+)\]', body)[1]
        v = [float(i) for i in raw.split(',')]
        if len(v) != 3 or not all(abs(i) < 30 for i in v):
            raise ValueError(f'{src}: {key}')
        return v

    mesh = re.findall(r'\{kind:"(body|tracks|wheels|turret|gun)",position:"([A-Za-z0-9+/=]+)",index:"([A-Za-z0-9+/=]+)"\}', body)
    if sorted(k for k, _, _ in mesh) != ['body','gun','tracks','turret','wheels']:
        raise ValueError(f'{src}: missing/unrecognised mesh groups')
    count = 0
    for kind, pos, idx in mesh:
        xyz, ix = (base64.b64decode(s, validate=True) for s in (pos, idx))
        if not xyz or not ix or len(xyz)%6 or len(ix)%6 or max(i[0] for i in struct.iter_unpack('<H', ix)) >= len(xyz)//6:
            raise ValueError(f'{src}: invalid {kind} mesh')
        count += len(ix)//6
    if count != int(re.search(r'\btriangles:(\d+)',body)[1]):
        raise ValueError(f'{src}: triangle count mismatch')
    model_id = string('id').upper()
    return dict(id={'T28':'T28_USSR'}.get(model_id,model_id),color=string('color'),source=string('sourceUrl'),
                tracks=('#303030' if '#303030' in text[:text.find(body)] and 'nation:"germany"' in body else
                        '#352e27' if '#352e27' in text[:text.find(body)] and 'nation:"usa"' in body else
                        '#2d322b' if 'nation:"sweden"' in body else '#293236'),
                pivot=vector('turretOrigin'),gunPivot=vector('gunOrigin'),meshes=mesh,triangles=count,
                **({'suspension':vector('hullOrigin')} if re.search(r'aimMode:"hull(?:-gun)?"',body) else {}))


if __name__ == '__main__':
    directory = Path(sys.argv[1])
    sources = {p.name:p for p in directory.glob('*-game.html')}
    sources.update({p.name.replace('-game-fixed.html','-game.html'):p for p in directory.glob('*-game-fixed.html')})
    for name, src in sorted(sources.items()):
        data = extract(src)
        out = ROOT/'models'/name.replace('-game.html','.mesh.js')
        out.write_text('BattleModels.receive('+json.dumps(data, separators=(',',':'), allow_nan=False)+');\n',encoding='utf-8')
        print(out.name, data['id'], data['triangles'])
