"""Measured, model-specific corrections applied once on import, in the export's mm frame.
The depot, thumbnail studio, battle meshes, hit boxes and muzzle all consume the result.
"""
import base64
import struct


def triples(encoded, fmt):
    return list(struct.iter_unpack(fmt, base64.b64decode(encoded, validate=True)))


def encode(rows, fmt):
    return base64.b64encode(b''.join(struct.pack(fmt, *row) for row in rows)).decode('ascii')


def fit_turan(data):
    # Hull ring: centre (3, 1511, 444). The centroid of the turret's six lower
    # skirt corners is (1, 21, 149) in the old pivot frame. Move the local gun
    # joint with that skirt so it still meets the mantlet at every yaw/pitch.
    turret = next(m for m in data['meshes'] if m[0] == 'turret')
    seat = (1, 21, 149)
    turret[1] = encode((tuple(n-d for n, d in zip(p, seat))
                        for p in triples(turret[1], '<hhh')), '<hhh')
    data['pivot'] = [.003, 1.511, .444]
    data['gunPivot'] = [v-d/1000 for v, d in zip(data['gunPivot'], seat)]


def fit_t55(data):
    # The exported tyres were wide solid cylinders, evenly spaced even over the
    # sloped belt ends. Seat each assembly on its hull axle and leave a channel
    # between its two tyre faces for the track's raised central guide. Keep the
    # original hubs, track links, hull, ground contact and both gun joints.
    wheels = next(m for m in data['meshes'] if m[0] == 'wheels')
    positions, faces = triples(wheels[1], '<hhh'), triples(wheels[2], '<HHH')
    # old axle Z -> fitted Z, height and tyre radius (measured inside both belts).
    axles = {-2222: (-1838, 550, 370), -1027: (-748, 474, 397),
             168: (103, 476, 399), 1363: (953, 474, 399), 2558: (2094, 520, 388)}
    verts, paired = [], {}
    for i, (x, y, z) in enumerate(positions):
        cx = 1310 if x > 0 else -1318
        axle = min(axles, key=lambda a: abs(a-z))
        nz, ny, radius = axles[axle]
        yz = (round(ny + (y-560)*radius/440), round(nz + (z-axle)*radius/440))
        offset = x-cx
        if abs(offset) == 280:  # full-width tyre in the original export
            verts.append((cx + (-248 if offset < 0 else -45), *yz))
            paired[i] = (cx + (45 if offset < 0 else 248), *yz)
        elif abs(offset) == 320:  # small hub through the guide channel
            verts.append((cx + (-262 if offset < 0 else 262), *yz))
        else:
            raise ValueError('Unexpected T-55AM wheel profile')
    second = {old: len(verts)+i for i, old in enumerate(paired)}
    extra = [tuple(second[i] for i in face) for face in faces if face[0] in paired]
    wheels[1] = encode([*verts, *paired.values()], '<hhh')
    wheels[2] = encode(faces + extra, '<HHH')
    data['triangles'] += len(extra)


def face_forward(data):
    # These Blitz exports look down -Z. Rotate, don't mirror: triangle
    # winding and left/right details stay intact. Rebase the pitch joint onto
    # the bore so the barrel does not orbit an offset origin when elevated.
    for key in ('pivot', 'gunPivot'):
        x, y, z = data[key]
        data[key] = [-x, y, -z]
    for part in data['meshes']:
        pts = [(-x, y, -z) for x, y, z in triples(part[1], '<hhh')]
        if part[0] == 'gun':
            tip = max(z for x, y, z in pts)
            rim = [p for p in pts if p[2] >= tip-12]
            dx, dy = (round((min(c)+max(c))/2) for c in list(zip(*rim))[:2])
            pts = [(x-dx, y-dy, z) for x, y, z in pts]
            data['gunPivot'][0] += dx/1000
            data['gunPivot'][1] += dy/1000
        part[1] = encode(pts, '<hhh')


def lower_chassis_bounds(data):
    # Both G.W. Tigers carry a long, raised rear platform. It remains visible and
    # hittable, but its overhang isn't part of the chassis on the ground. Keep
    # all the belt vertices and the lower half-belt-height slice of the body.
    parts = {m[0]:m for m in data['meshes']}
    tracks = triples(parts['tracks'][1], '<hhh')
    mid = (min(y for _,y,_ in tracks) + max(y for _,y,_ in tracks))/2
    points = tracks + [p for p in triples(parts['body'][1], '<hhh') if p[1] <= mid]
    x, _, z = zip(*points)
    data['contactXZ'] = [v/1000 for v in (min(x), min(z), max(x), max(z))]


def fit_m24(data):
    # The Blitz viewer stores assembled chassis-space vertices, down -Z. Its
    # generic pivots would put the turret off the ring and swing the barrel in
    # an orbit. Rebase around the lower turret ring and measured breech axis;
    # join the rear face of the gun to the mantlet. Rotate, never mirror faces.
    ring = (0,1232,-510)
    joint = (0,1566,340)
    for part in data['meshes']:
        pts = [(-x,y,-z) for x,y,z in triples(part[1], '<hhh')]
        origin = ring if part[0]=='turret' else (0,1566,538) if part[0]=='gun' else (0,0,0)
        part[1] = encode((tuple(c-d for c,d in zip(p,origin)) for p in pts), '<hhh')
    data['pivot'] = [a/1000 for a in ring]
    data['gunPivot'] = [(a-b)/1000 for a,b in zip(joint,ring)]


def prepare(data, slug):
    import national_models
    if data['source'].startswith(national_models.ARCHIVE+' / '):
        return national_models.prepare(data)
    if data['id'] == 'AMX13M24':
        fit_m24(data)
    if data['id'] in ('BC15555','BC15558'):
        slug = slug.replace('â','a')  # consistent ASCII package paths
    if slug in ('gw-tiger-p', 'gw-tiger'):
        lower_chassis_bounds(data)
    if slug == 'grille' and data['id'] == 'GRILLE':
        data['id'] = 'GRILLE-SPG'  # GRILLE in older saves is the tier-X Grille 15 TD.
    if slug in ('stug-iii-ausf-b','stuig-33-b','brummbaer','sturmpanzer-ii','sturmtiger-p','baer'):
        from assault_running_gear import fit_export
        fit_export(data, slug)
    if data['id'] in ('T18', 'T82', 'T70-GMC'):
        face_forward(data)
    if data['id'] == 'TURAN1':
        fit_turan(data)
    elif data['id'] == 'T55AM1':
        fit_t55(data)
    elif data['id'] == 'T70-GMC':
        # This export is built from the Blitz Hellcat, not a distinct T70 model.
        # Keep its V loadout separate from the M18 Hellcat PC export at VI.
        data['id'], slug = 'HELLCAT-V', 'hellcat-v'
    return slug
