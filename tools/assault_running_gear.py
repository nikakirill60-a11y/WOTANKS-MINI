"""Build-time mesh repairs for german-tanks-seven-previous-style.zip (model coordinates in mm).

The six OBJ exports contain both the original chassis and a second, evenly spaced set of
8-sided drums with hexagonal plugs baked into the hull. Use the *original* axle positions;
keep the suspension, fenders, skirts and model-specific spacing. Bake the new faces in batches so
neither side of the vehicle needs any extra draw calls in the game.
"""
from collections import defaultdict
from math import cos, sin, hypot, pi, tau

from model_fit import triples, encode

# Road wheels: Y, radius, alternating outer face X (staggered on Bär/Tiger), half-width, axle Zs.
ROAD = {
    'STUG3B':      (-794, 250, (1360,), 112, (-1384,-810,-236,340,916,1492)),
    'STUIG33':     (-703, 260, (1365,), 109, (-1362,-790,-218,354,928,1500)),
    'BRUMMBAER':   (-650, 236, (1350,), 114, (-1765,-1261,-760,-254,247,746,1242,1748)),
    'STURMPANZER2':(-590, 292, (1132,), 75, (-1634,-984,-337,313,966,1616)),
    'STURMTIGERP': (-684, 355, (1523,1419,1419,1523,1419,1523), 100, (-2086,-1338,-409,340,1294,2044)),
    'BAER':        (-653, 399, (1488, 1806), 103, (-2662,-2072,-1482,-892,-301,290,879,1470,2060,2651)),
    'STURMTIGER':  (477, 401, (1573, 1421), 49, (-1756,-1248,-734,-223,294,818,1330,1838)),
}
# Width of each belt (inner/outer |X|); original end and return rollers (Z,Y,radius).
# Tier X has two complete GLB track loops: do not replace those with procedural belts.
BELTS = {
    'STUG3B': (1050,1460, [(-2087,-336,370),(2194,-402,451),(-1050,-98,158),(32,-108,158),(1290,-142,158)]),
    'STUIG33': (1045,1455, [(-2112,-296,369),(2168,-343,440),(-952,-40,156),(33,-46,156),(1380,-82,156)]),
    'BRUMMBAER': (980,1505, [(-2508,-363,333),(2328,-255,399),(-1590,-33,117),(0,-33,117),(1590,-33,117)]),
    'STURMPANZER2': (882,1280, [(-2316,-339,336),(2295,-265,416),(-1340,-12,114),(-399,-12,114),(541,-12,114),(1492,-12,114)]),
    'STURMTIGERP': (1005,1618, [(-2895,-394,434),(2918,-277,434)]),
    'BAER': (1170,2010, [(-3626,-493,352),(3430,-286,465),(-1520,-110,120),(1880,-110,120)]),
}


class Mesh:
    def __init__(self):
        self.verts, self.faces = [], []

    def ring(self, points):
        first = len(self.verts)
        self.verts.extend(tuple(round(c) for c in p) for p in points)
        return list(range(first, len(self.verts)))

    def strip(self, a, b, reverse=False):
        for i in range(len(a)):
            j = (i + 1) % len(a)
            faces = [(a[i], a[j], b[j]), (a[i], b[j], b[i])]
            self.faces.extend(tuple(reversed(f)) if reverse else f for f in faces)

    def pack(self, kind, color=None):
        return [kind, encode(self.verts, '<hhh'), encode(self.faces, '<HHH')] + ([color] if color else [])


def axles(model):
    y, r, outer, half, zs = ROAD[model]
    return [(outer[i % len(outer)], y, z, r, half) for i, z in enumerate(zs)]


def lathe(mesh, side, cy, cz, profile, segments=16):
    # Signed axial depth / radius profile; seal each end by specifying radius 0.
    prev = None
    for x, radius in profile:
        ring = mesh.ring([(side*x, cy+radius*cos(tau*i/segments), cz+radius*sin(tau*i/segments))
                          for i in range(segments)] if radius else [(side*x,cy,cz)])
        if prev is not None:
            if len(prev) == 1 or len(ring) == 1:
                cap, rim, front = (prev[0], ring, False) if len(prev)==1 else (ring[0], prev, True)
                for i, v in enumerate(rim):
                    f = (cap, v, rim[(i+1) % segments]); mesh.faces.append(f if front==(side>0) else f[::-1])
            else:
                mesh.strip(prev, ring, side<0)
        prev = ring


def road_wheels(model):
    disc, tyre, metal = Mesh(), Mesh(), Mesh()
    for outer, y, z, r, half in axles(model):
        for side in (-1, 1):
            # Dark bevelled tyre, recessed pressed dish, raised hub and six hex fasteners.
            inside = outer-2*half
            lathe(disc,side,y,z,[(inside,0),(inside,.81*r)])
            lathe(tyre,side,y,z,[(inside,.81*r),(inside,.93*r),(inside+.055*r,r),
                            (outer-.055*r,r),(outer,.93*r),(outer,.79*r)])
            lathe(disc,side,y,z,[(outer,.79*r),(outer+.012*r,.75*r),(outer-.065*r,.60*r),(outer-.09*r,.30*r)])
            lathe(metal,side,y,z,[(outer-.09*r,.30*r),(outer+.025*r,.27*r),(outer+.05*r,.21*r),(outer+.05*r,0)], 16)
            for i in range(6):
                a = tau*(i+.5)/6
                lathe(metal,side, y+.51*r*cos(a), z+.51*r*sin(a),
                      [(outer-.085*r,.055*r),(outer-.02*r,.055*r),(outer-.02*r,0)], 6)
    if model in BELTS:
        # The very coarse castings at each end are missing faces. Rebuild the exposed
        # steel idler and sprocket as open spoked rings, not two more solid road tyres.
        lo,hi,supports = BELTS[model]
        back,front = lo+(hi-lo)*.26, hi-(hi-lo)*.14
        for z,y,r in supports[:2]:
            for side in (-1,1):
                lathe(disc,side,y,z,[(back,.74*r),(back,.95*r),(back+.04*r,r),
                                     (front-.04*r,r),(front,.95*r),(front,.77*r),(front-.03*r,.74*r),(back,.74*r)],20)
                lathe(metal,side,y,z,[(back,0),(back,.25*r),(front,.27*r),(front+.04*r,.19*r),(front+.04*r,0)],12)
                for i in range(6):
                    a = tau*i/6
                    # Widen each spoke towards its hub; keep the six windows open all the way through.
                    corners = [(y+k*r*cos(a)-d*r*sin(a), z+k*r*sin(a)+d*r*cos(a))
                               for k,d in [(.18,-.105),(.80,-.075),(.80,.075),(.18,.105)]]
                    low,high = sorted([side*(back+.05*r),side*(front-.04*r)])
                    rings = [disc.ring((x,cy,cz) for cy,cz in corners) for x in (low,high)]
                    u,v = rings; disc.strip(u,v)
                    disc.faces.extend([(u[0],u[2],u[1]),(u[0],u[3],u[2]),(v[0],v[1],v[2]),(v[0],v[2],v[3])])
        if model in ('STUG3B','STUIG33','STURMPANZER2'):
            for z,y,r in supports[2:]:
                for side in (-1,1):
                    lathe(tyre,side,y,z,[(back,0),(back,r),(front-.04*r,r),(front,.86*r),(front,.70*r)],12)
                    lathe(disc,side,y,z,[(front,.70*r),(front-.07*r,.47*r),(front+.02*r,.25*r),(front+.02*r,0)],12)
    return [disc.pack('wheels'), tyre.pack('wheels','#434648'), metal.pack('wheels','#93948d')]


def without_old_wheels(verts, faces, model, old_drums=None):
    # Work on entire welded components, not on a box cut through the chassis.
    parent = list(range(len(verts)))
    def root(i):
        while i != parent[i]:
            parent[i] = parent[parent[i]]; i = parent[i]
        return i
    welded = {}
    for i, p in enumerate(verts):
        parent[i] = welded.setdefault(p, i)
    for a,b,c in faces:
        head = root(a); parent[root(b)] = head; parent[root(c)] = head
    groups = defaultdict(list)
    for f in faces:
        groups[root(f[0])].append(f)
    kept, removed_plugs = [], 0
    roads = axles(model); seats = list(roads)
    belt_lo,belt_hi = BELTS[model][:2] if model in BELTS else (1055,1784)
    if model in BELTS:
        lo,hi,supports = BELTS[model]
        trim = supports if model in ('STUG3B','STUIG33','STURMPANZER2') else supports[:2]
        seats += [(hi,y,z,r+12,(hi-lo)/2) for z,y,r in trim]
    for group in groups.values():
        vs = [verts[i] for i in {i for f in group for i in f}]
        xx, yy, zz = zip(*vs); lo, hi = min(map(abs,xx)), max(map(abs,xx))
        if old_drums and len(group)==24 and hi-lo==70 and abs(hi-old_drums[0]-53)<=1 and abs((min(yy)+max(yy))/2-old_drums[1])<2:
            removed_plugs += 1; continue
        # On the interleaved layouts, long original axle stubs stick out past the
        # inner dishes. Remove the old hub as a whole instead of burying it under a cap.
        if belt_lo-120 <= lo and hi <= belt_hi and any(hi>=x and
                min(yy)>=y-.36*r and max(yy)<=y+.36*r and min(zz)>=z-.36*r and max(zz)<=z+.36*r
                for x,y,z,r,_ in roads): continue
        if any(lo>=x-2*w-165 and x-2*w-18<=hi<=x+34 and min(yy)>=y-r-12 and max(yy)<=y+r+12
               and min(zz)>=z-r-12 and max(zz)<=z+r+12 for x,y,z,r,w in seats):
            continue
        kept.extend(group)
    if old_drums and removed_plugs != old_drums[2]:
        raise ValueError(f'{model}: expected {old_drums[2]} placeholder hubs, found {removed_plugs}')
    return compact(verts, kept)


def compact(verts, faces):
    out = Mesh(); index = {}
    for f in faces:
        points = [verts[i] for i in f]
        if len(set(points)) != 3: continue
        indices = []
        for p in points:
            if p not in index:
                index[p] = len(out.verts); out.verts.append(p)
            indices.append(index[p])
        out.faces.append(tuple(indices))
    return out


def belt(model):
    inner_x, outer_x, supports = BELTS[model]
    # Wrap both complete belts around the real sprockets and return rollers. Several source
    # loops lost whole faces (in particular the rear of the Porsche chassis) at export.
    rollers = supports + [(z,y,r) for _,y,z,r,_ in axles(model)]
    n = 20
    points = sorted((z+(r+5)*cos(tau*i/n)/cos(pi/n), y+(r+5)*sin(tau*i/n)/cos(pi/n))
                    for z,y,r in rollers for i in range(n))
    def half_hull(seq):
        hull = []
        for p in seq:
            while len(hull) >= 2:
                a,b = hull[-2:]
                if (b[0]-a[0])*(p[1]-a[1]) > (b[1]-a[1])*(p[0]-a[0]): break
                hull.pop()
            hull.append(p)
        return hull[:-1]
    loop = half_hull(points) + half_hull(reversed(points))
    edges = [(b[0]-a[0], b[1]-a[1]) for a,b in zip(loop,loop[1:]+loop[:1])]
    normals = [(dy/hypot(dz,dy), -dz/hypot(dz,dy)) for dz,dy in edges]
    outer = []
    for i,(z,y) in enumerate(loop):
        az,ay = normals[i-1]; bz,by = normals[i]; t = 44/(1+az*bz+ay*by)
        outer.append((z+t*(az+bz), y+t*(ay+by)))
    mesh = Mesh()
    for side in (-1, 1):
        lo,hi = sorted([side*inner_x,side*outer_x]); rings = []
        for x,path in [(lo,loop),(hi,loop),(hi,outer),(lo,outer)]:
            rings.append(mesh.ring((x,y,z) for z,y in path))
        for a,b in zip(rings,rings[1:]+rings[:1]): mesh.strip(a,b)
        # Raised transverse shoes. Walk the perimeter, not each segment individually,
        # so the tread pitch stays even around both rounded ends.
        lengths = [hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(outer,outer[1:]+outer[:1])]
        pitch = sum(lengths)/round(sum(lengths)/160); distance = pitch/2
        for i,length in enumerate(lengths):
            nz,ny = normals[i]; dz,dy = -ny,nz
            while distance < length:
                z,y = outer[i][0]+dz*distance,outer[i][1]+dy*distance
                def bar_ring(x):
                    return mesh.ring((x,y+dy*u+ny*v,z+dz*u+nz*v) for u,v in [(-24,-4),(-19,16),(19,16),(24,-4)])
                a,b = bar_ring(lo+6),bar_ring(hi-6); mesh.strip(a,b,True)
                mesh.faces.extend([(a[0],a[1],a[2]),(a[0],a[2],a[3]),(b[0],b[2],b[1]),(b[0],b[3],b[2])]); distance+=pitch
            distance-=length
    return mesh.pack('tracks')


def fit_export(data, slug):
    if slug=='stug-iii-ausf-b': data['id']='STUG3B'  # STUG3 is a legacy save alias for the Ausf. G.
    model = data['id']
    body,gun,drums = (next(p for p in data['meshes'] if p[0]==k) for k in ('body','gun','wheels'))
    vs = triples(drums[1],'<hhh'); ys = [p[1] for p in vs]
    old_hubs = (max(p[0] for p in vs), (min(ys)+max(ys))/2, len(triples(drums[2],'<HHH'))//32)
    hull = without_old_wheels(triples(body[1],'<hhh'), triples(body[2],'<HHH'), model, old_hubs)
    # The first vertex of a breech is not the pitch joint. Rebase the model on its
    # visible collar while leaving the complete neutral pose in exactly the same place.
    vs = triples(gun[1],'<hhh'); tip = max(p[2] for p in vs)
    if model=='BAER':  # the broken outer lip was 13 mm behind only *half* the tip, skewing the sight left
        vs = [(x,y,min(z,tip-6)) for x,y,z in vs]; tip-=6
    rim = [p for p in vs if p[2]>=tip-12]
    dx,dy = (round((min(c)+max(c))/2) for c in list(zip(*rim))[:2])
    dz = {'STUG3B':-997,'STUIG33':1496,'BRUMMBAER':-426,'STURMPANZER2':1174,'STURMTIGERP':-805,'BAER':-680}[model]
    gun[1] = encode(((x-dx,y-dy,z-dz) for x,y,z in vs),'<hhh')
    data['gunPivot'] = [v+s/1000 for v,s in zip(data['gunPivot'],(dx,dy,dz))]
    data['meshes'] = [hull.pack('body'),gun,belt(model),*road_wheels(model)]
    data['source'] = 'german-tanks-seven-previous-style.zip / '+slug+'-game.html · WoT Inspector OBJ'
    data['triangles'] = sum(len(triples(p[2],'<HHH')) for p in data['meshes'])
