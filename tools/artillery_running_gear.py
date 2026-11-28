"""Fit the moving wheels in soviet-german-artillery-23.zip, in export millimetres.

The viewers include both small generated cylinders and the game's actual drums,
spokes and hub caps welded into the body part. The cylinders give the axle Y/Z;
the original drums give the exposed X plane, especially on interleaved chassis.
"""
from itertools import combinations
from math import hypot

ARCHIVE = 'soviet-german-artillery-23.zip'
EXPORT_IDS = frozenset('SU18 SU26 SU5 SU122A SU8 S51 SU14-2 OBJ212 OBJ261 SU122 SUD15 ISU2SH OBJ715G OBJ261V4 '
                       'BISON WESPE PZSFLIVB GRILLE HUMMEL GWPANTHER GWTIGERP GWTIGER GWE100'.split())


def fit(axles, body, track_vertices, *, seat=None):
    rows, hidden = [], set()
    for side in (-1, 1):
        tread = [side*x for x, _, _ in track_vertices if side*x > 0]
        inner, outer = min(tread), max(tread)
        span = outer-inner
        seats = []
        for x, y, z, r, w in axles:
            if side*x <= 0:
                continue
            rims = []
            for (cx, cy, cz), (depth, height, length), verts, indices in body:
                near, far = side*cx-depth/2, side*cx+depth/2
                offset = hypot(cy-y, cz-z)
                if near < inner-span*.45 or far > outer+span*.25 or offset > r or max(height, length) > 2.65*r:
                    continue
                # Only whole, local components on this axle; never carve triangles
                # out of a hull, suspension arm or track loop to make a wheel fit.
                centered = offset <= .13*r + 3
                if not centered and (near < inner+.20*span or offset > .88*r):
                    continue
                radius = max(hypot(b-y, c-z) for _, b, c in verts)
                if radius > (1.30 if centered else 1.03)*r + 8:
                    continue
                hidden.update(indices)
                if centered and min(height, length) >= 1.55*r and max(height, length) < 1.3*min(height, length):
                    rims.append(far)
            # Some tiny return rollers have no distinct ring left after export simplification.
            face = seat(x,y,z,w,inner,outer) if seat else min(outer-3, max(rims, default=side*x+w/2))
            seats.append((face, y, z, r, w))

        radii = [s[3] for s in seats]
        widths = [s[4] for s in seats]
        for i, j in combinations(range(len(seats)), 2):
            a, b = seats[i], seats[j]
            d = hypot(a[1]-b[1], a[2]-b[2]); diameter = a[3]+b[3]
            if d >= diameter+2:
                continue
            if diameter-d < .16*min(a[3], b[3]):
                # Neighbouring rollers on a single plane (e.g. Hummel). The
                # viewer's polygonal guides slightly overestimate the tyre radius.
                k = min(1, (d-3)/diameter)
                radii[i] = min(radii[i], k*a[3]); radii[j] = min(radii[j], k*b[3])
            else:
                # Staggered tyres must clear each other across X, even at full roll.
                # The shared wheel's hub extends .204 tyre widths beyond its face.
                inside, outside = sorted((a,b), key=lambda s:s[0])
                k = min(1, (outside[0]-inside[0]-4)/(outside[4]+.205*inside[4]))
                assert k > .12, ('no separate rim planes', a, b)
                widths[i] = min(widths[i], k*a[4]); widths[j] = min(widths[j], k*b[4])
        for (face,y,z,_,_), r,w in zip(seats, radii, widths, strict=True):
            rows.append((side*(face-w/2), y, z, r, w))
    return rows, hidden
