"""Running gear from french-tanks-21-viewers.zip (20 actual viewers), in millimetres.

The wheeled vehicles have detailed tyres, rims and lugs in the BODY mesh and
simplified cylinders in WHEELS. Partition the original triangle indices, never
substitute a cylinder or a Sturmtiger disc for a tyre. Keep skirts on the body.
"""
from collections import defaultdict
from math import hypot
from model_fit import triples
from artillery_running_gear import fit as fit_tracked

ARCHIVE = 'french-tanks-21-viewers.zip'
WHEELED = {'AMD178B':4, 'HOTCHKISSEBR':6, 'LYNX6X6':6, 'EBR90':8, 'EBR105':8}
EXPORT_IDS = set(WHEELED) | set('AMX1390 AMX13105 AMX13M24 ERAC105 PROJETLOUIS PROJETMURAT RENAULTFT75BS '
                                'LORRAINE39LAM AMX105AM47 AMX13105AM50 AMX13F3AM LORRAINE15550 '
                                'LORRAINE15551 BC15555 BC15558'.split())


def guides(mesh):
    # Original face order, not connected components: two AM mle. 50 wheels
    # touch at a single welded vertex but are on independent axles.
    vs, fs = triples(mesh[1], '<hhh'), triples(mesh[2], '<HHH')
    assert len(fs) % 32 == 0
    for start in range(0, len(fs), 32):
        coords = list(zip(*(vs[i] for tri in fs[start:start+32] for i in tri)))
        w,h,l = (max(v)-min(v) for v in coords)
        assert .98 < h/l < 1.02 and w > 0
        yield (*((min(v)+max(v))/2 for v in coords), (h+l)/4, w), range(start,start+32)


def fit(data, body_groups, mask_runs, *, native_counts=WHEELED, seat=None):
    body, = (i for i,m in enumerate(data['meshes']) if m[0]=='body')
    wheel, = (i for i,m in enumerate(data['meshes']) if m[0]=='wheels')
    markers = list(guides(data['meshes'][wheel]))
    model = data['id']
    if model not in native_counts:
        track, = (m for m in data['meshes'] if m[0]=='tracks')
        rows, removed = fit_tracked([row for row,_ in markers], body_groups, triples(track[1], '<hhh'), seat=seat)
        rows = sorted([tuple(map(round, row)) for row in rows], key=lambda r:(r[0],r[2]))
        return [rows, {str(body):mask_runs(removed), str(wheel):True}]

    # Some AMD guides overlap. Associate them with the same physical tyre,
    # identified by the large circular casting in the original body.
    axles = defaultdict(list)
    for (x,y,z,r,_), indices in markers:
        candidates = [j for j,((cx,cy,cz),(_,h,l),_,_) in enumerate(body_groups)
                      if abs(cx-x)<.38*r and hypot(cy-y,cz-z)<.13*r and min(h,l)>1.58*r and max(h,l)<2.25*r]
        assert len(candidates)==1, (model,x,z,candidates)
        axles[candidates[0]].extend(indices)
    assert len(axles)==native_counts[model], model
    rows, parts, moved = [], [], set()
    for j, indices in sorted(axles.items(), key=lambda kv:body_groups[kv[0]][0][::2]):
        (x,y,z),(w,h,l),_,_ = body_groups[j]
        # Include authored hubs, bolt heads and the EBR 90's separate tyre lugs;
        # never pick triangles out of a fender or a suspension arm that crosses it.
        side = 1 if x>0 else -1
        r = max(row[3] for row,ix in markers if ix.start in indices)
        inner,outer = abs(x)-w/2-6, abs(x)+w/2+max(52,.09*r)
        faces = sorted(i for _,_,points,ix in body_groups
                       if all(inner<=side*a<=outer and hypot(b-y,c-z)<=1.04*r+12 for a,b,c in points) for i in ix)
        assert len(faces)>100 and not moved.intersection(faces), model
        moved.update(faces)
        rows.append([round(v) for v in (x,y,z,r,w)])
        parts.append([mask_runs(faces), mask_runs(indices)])
    native = {'wheels':parts}
    if model=='AMD178B':
        # Spare strapped to the right of the hull, between the two axles. Keep
        # both halves of the tyre and its hub stationary; do not paint the rack.
        spare = [i for _,_,points,ix in body_groups
                 if all(a>=820 and hypot(b-1126,c-242)<600 for a,b,c in points) for i in ix]
        assert len(spare)==289 and not moved.intersection(spare)
        native['spare'] = mask_runs(spare)
    return [rows, {str(body):mask_runs(moved), str(wheel):True}, native]
