"""Adapters for batch114's numbered viewers. Never execute the embedded Three scripts.

Use the archive serial (including the gaps), not the position in deliverables.json.
Stitch's supplied geometry is Chi-Se without its cosmetic style; it has its own card/TTX.
"""
from model_fit import triples, encode, face_forward

ARCHIVE = 'batch114-tank-viewers-110.zip'
NATIVE = {'NAT090': 6, 'NAT095': 6, 'NAT103': 8}  # Ashigaru, Gendron and EBR 75


def prepare(data):
    if 'BlitzKit' in data['source']:
        # These twelve viewers face -Z, with their pitch pivot at the barrel's
        # bounding-box centre. Preserve the assembled neutral pose, then rotate
        # around the breech rather than the middle of the tube.
        face_forward(data)
        gun, = (p for p in data['meshes'] if p[0]=='gun')
        points = triples(gun[1], '<hhh'); rear = min(z for x,y,z in points)
        gun[1] = encode(((x,y,z-rear) for x,y,z in points), '<hhh')
        data['gunPivot'][2] += rear/1000
    return 'national-' + data['id'][3:]


def seat(model):
    # Twin rows on VK 168 share Y/Z but not X. The Skorpion and VK 90 have
    # overlapping, staggered axles: fit separate inner/outer seats inside each belt.
    if model == 'NAT031':
        return lambda x,y,z,w,inner,outer: min(outer-3,abs(x)+w/2)
    if model in ('NAT034','NAT035'):
        def stagger(x,y,z,w,inner,outer):
            if model == 'NAT034':
                outside = abs(x)>1350
            else:
                outside = abs(x)>1340
            return inner+(outer-inner)*(.94 if outside else .49)
        return stagger
