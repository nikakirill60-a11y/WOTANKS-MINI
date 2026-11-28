"""Build offline instancing data; keep the authored hull, armour and track loops intact.
One wheel from the actual Sturmtiger mesh is shared by every model. On ordinary exports
read the axle from each welded wheel cylinder, not from a tier/length approximation.
The masks omit old drums and separate static hub caps only from the render index.
"""
import json
from pathlib import Path
from collections import defaultdict
from itertools import groupby
from math import hypot
from model_fit import triples, encode
from assault_running_gear import axles, ROAD

ROOT = Path(__file__).resolve().parents[1]


def read(file):
    return json.loads(file.read_text().removeprefix('BattleModels.receive(').removesuffix(');\n'))


def components(mesh):
    vs, fs = triples(mesh[1], '<hhh'), triples(mesh[2], '<HHH')
    parent = list(range(len(vs))); welded = {}
    def root(i):
        while parent[i] != i:
            parent[i] = i = parent[parent[i]]
        return i
    for i, p in enumerate(vs): parent[i] = welded.setdefault(p, i)
    for a,b,c in fs:
        r = root(a); parent[root(b)] = r; parent[root(c)] = r
    groups = defaultdict(list)
    for i,f in enumerate(fs): groups[root(f[0])].append(i)
    out = []
    for indices in groups.values():
        points = [vs[j] for j in {j for i in indices for j in fs[i]}]
        lo = [min(v) for v in zip(*points)]; hi = [max(v) for v in zip(*points)]
        out.append(([(a+b)/2 for a,b in zip(lo,hi)], [b-a for a,b in zip(lo,hi)], points, indices))
    return out


def template():
    # Outer (positive X) dish, tyre, raised hub and six individual fasteners.
    d = read(ROOT / 'models/sturmtiger.mesh.js'); x,y,z,r,h = axles('STURMTIGER')[0]; result=[]
    for part in d['meshes'][-3:]:
        vs=triples(part[1], '<hhh'); fs=triples(part[2], '<HHH')
        ids=[i for i,(a,b,c) in enumerate(vs) if x-2*h-1<=a<=x+r*.06 and hypot(b-y,c-z)<=r+1]
        ix={j:i for i,j in enumerate(ids)}
        faces=[tuple(ix[j] for j in f) for f in fs if all(j in ix for j in f)]
        points=[(round(1000*(vs[i][0]-x+h)/(2*h)),round(1000*(vs[i][1]-y)/r),round(1000*(vs[i][2]-z)/r)) for i in ids]
        assert faces and len(faces)==len(fs)//16
        result.append([encode(points,'<hhh'),encode(faces,'<HHH'),part[3] if len(part)>3 else None])
    return result


def build(d):
    model=d['id']; parts={i:components(m) for i,m in enumerate(d['meshes']) if m[0]=='wheels' or (m[0]=='body' and len(m)==3)}
    wheels=[g for i,groups in parts.items() if d['meshes'][i][0]=='wheels' for g in groups]
    # [signed X, axle height, longitudinal Z, radius, full tyre width], mm.
    if model in ROAD:
        rows=[(s*(x-h),y,z,r,2*h) for x,y,z,r,h in axles(model) for s in (-1,1)]
    elif model=='TOLDI1': # adjoining drums share vertices in the original model
        rows=[(x,727,z,310,280) for x in (-1182,1049) for z in (-1982,-1362,-742,-124,496,1116,1736,2355)]
    elif model=='TURAN2':
        rows=[(x,490,z,430,220) for x in (-1125,1125) for z in (-1520,-912,-304,304,912,1520)]
    elif model=='T55A': # one baked hull mesh, with two tyres and a guide channel on each axle
        rows=[(s*x,545,z,470,207) for s in (-1,1) for x in (1382,1704) for z in (-1930,-955,12,985,2272)]
    else:
        candidates=wheels if wheels else parts[0] # Tas: wheels belong to the body group
        rows=[]
        for (x,y,z),(w,h,l),points,_ in candidates:
            if len(points)<10 or abs(x)<300 or min(h,l)<75 or w<12 or not .94<h/l<1.07: continue
            if model=='TAS' and not (abs(x)>650 and y<740 and w>=150 and h>=180): continue
            r=(h+l)/4
            if wheels and len(wheels)>160 and r<90: continue # bolts and hubs of the four detailed KV exports
            rows.append((x,y,z,r,w))
        # Remove small hubs lying on a larger wheel. Keep dual tyres on separate X planes.
        fitted=[]
        for row in sorted(rows,key=lambda q:-q[3]):
            x,y,z,r,w=row
            if any(abs(x-X)<(w+W)/2+8 and hypot(y-Y,z-Z)<max(18,.10*R) for X,Y,Z,R,W in fitted): continue
            fitted.append(row)
        rows=fitted
        if model=='T95': # source only includes the two end axles; twin belts either side of hull
            rows.extend((side*x,344,z,257,250) for side in (-1,1) for x in (1260,1920)
                        for z in (-2715,-1825,-1190,-300,335,1226,1820,2710))
    rows=sorted([tuple(round(v) for v in row) for row in rows],key=lambda r:(r[0],r[2]))
    assert sum(x>0 for x,*_ in rows)>=3 and sum(x<0 for x,*_ in rows)>=3,(model,rows)
    hide={}
    for i,groups in parts.items():
        kind=d['meshes'][i][0]; removed=[]
        for (cx,cy,cz),(w,h,l),points,indices in groups:
            # Most original wheel groups are independent generated cylinders. For
            # a mixed group, retain suspension arms, idlers etc outside the road wheels.
            whole = kind=='wheels' and (model in ('TOLDI1','TURAN2') or len(points)==52 and .91<h/max(l,1)<1.09)
            if not whole:
                for x,y,z,r,width in rows:
                    if abs(cx-x)>width/2+85 or abs(cy-y)>r or abs(cz-z)>r: continue
                    if kind=='body' and hypot(cy-y,cz-z)>.69*r: continue # no belt links/fender trim
                    if abs(cx-x)+w/2>width/2+85 or h>2*r+55 or l>2*r+55: continue
                    if all((b-y)**2+(c-z)**2 <= (r*1.07+12)**2 for a,b,c in points):
                        whole=True;break
            if whole: removed.extend(indices)
        if removed:
            if len(removed)==len(triples(d['meshes'][i][2],'<HHH')): hide[str(i)]=True
            else:
                runs=[]
                for _,g in groupby(enumerate(sorted(removed)),key=lambda p:p[1]-p[0]):
                    v=list(g);runs.extend((v[0][1],len(v)))
                hide[str(i)]=runs
    return [rows,hide]


if __name__=='__main__':
    compact=lambda a:json.dumps(a,separators=(',',':'),ensure_ascii=False)
    rigs=[]
    for file in sorted((ROOT/'models').glob('*.mesh.js')):
        d=read(file); rigs.append(compact(d['id'])+':'+compact(build(d)))
    out='// Generated by tools/wheel_layouts.py. Coordinates in model millimetres.\n'
    out+='const STURM_WHEEL = '+compact(template())+';\nconst WHEEL_FITS = {\n'+',\n'.join(rigs)+'\n};\n'
    (ROOT/'models/running-gear.js').write_text(out);print(f'{len(rigs)} fitted models; {len(out):,} bytes')
