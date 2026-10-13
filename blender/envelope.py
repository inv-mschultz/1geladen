"""
18:00 — the invitation: a pink paper envelope with a wax seal, and the card.

Built facing the viewer (-Y), 3 × 2 m in X/Z, centred on the origin. Paper
parts are thin slabs; the front ones bulge gently towards the viewer, the
way an envelope does with a card inside, so light rolls across them.

Names the three.js side relies on:
  Flap        empty on the hinge (top edge); rotate around X to open
  Seal        child of Flap, pops off first
  Card        slides out; its front face uses the material CardFace
  Envelope    parent of every paper part, fades away at the end
  Stamp, Address, CardFace  get canvas textures; Paper* get a fibre bump
"""

import math
import os
import random
import sys

import bmesh
from mathutils import Matrix, Vector

sys.path.append(os.path.dirname(__file__))
import kit  # noqa: E402

a = kit.args()
kit.reset()
random.seed(4)

paper_back = kit.material("PaperBack", "#ef7cc0", rough=0.85)
paper_side = kit.material("PaperSide", "#ff8fd0", rough=0.85)
paper_bottom = kit.material("PaperBottom", "#ff9ad8", rough=0.85)
paper_flap = kit.material("PaperFlap", "#f477c2", rough=0.8)
# Inside: plain and dark — no pattern, it should read as shadowed paper.
inner = kit.material("Inner", "#3a1b2e", rough=0.95)
wax = kit.material("Wax", "#0f2219", rough=0.32, metal=0.05)
emboss = kit.material("Emboss", "#ff8ad4", rough=0.45)
card_face = kit.material("CardFace", "#10291d", rough=0.55)
card_edge = kit.material("CardEdge", "#10291d", rough=0.6)
stamp = kit.material("Stamp", "#ffffff", rough=0.6)
address = kit.material("Address", "#ffffff", rough=0.9)


BULGE = 0.055  # metres at the centre: puffed by the card inside


def bulge(x, z):
    """How far the front paper bows towards the viewer at (x, z)."""
    return BULGE * max(0.0, math.cos(math.pi * x / 3.2)) * max(0.0, math.cos(math.pi * (z + 0.05) / 2.3))


def slab(name, points, depth, y, mats, parent=None, bevel=0.0015, origin=(0, 0, 0), puff=False):
    """
    Polygon in the XZ plane (points are (x, z)), extruded `depth` along Y,
    front face at y - depth/2. Material 0 goes on the front (towards the
    viewer), 1 on the back, 0 on the edges.
    """
    ox, oy, oz = origin
    bm = bmesh.new()
    front = [bm.verts.new((x - ox, y - depth / 2 - oy, z - oz)) for x, z in points]
    back = [bm.verts.new((x - ox, y + depth / 2 - oy, z - oz)) for x, z in points]
    f_front = bm.faces.new(front)
    f_back = bm.faces.new(list(reversed(back)))
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], back[i], back[j], front[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for face in bm.faces:
        face.material_index = 1 if face.normal.y > 0.9 else 0
    if puff:
        # Dense enough to bend smoothly, then bowed towards the viewer.
        flat = [f for f in bm.faces if abs(f.normal.y) > 0.9]
        result = bmesh.ops.triangulate(bm, faces=flat, quad_method="BEAUTY", ngon_method="BEAUTY")
        edges = list({e for f in result["faces"] for e in f.edges})
        bmesh.ops.subdivide_edges(bm, edges=edges, cuts=7, use_grid_fill=True)
        for v in bm.verts:
            v.co.y -= bulge(v.co.x + ox, v.co.z + oz)
        bevel = 0
    kit.planar_uv(bm, "xz")
    obj = kit.mesh_object(name, bm, mats, parent, origin)
    if bevel:
        kit.add_bevel(obj, bevel, 2)
    if puff:
        kit.smooth(obj, 60)
    del f_front, f_back
    return obj


def rounded(points, radius, steps=6):
    """Rounds the corners of a polygon a little — cut paper is never perfectly sharp.
    `radius` is one value for all corners or a list, one per corner."""
    out = []
    n = len(points)
    radii = radius if isinstance(radius, (list, tuple)) else [radius] * n
    for i in range(n):
        radius = radii[i]
        p0, p1, p2 = Vector(points[i - 1]), Vector(points[i]), Vector(points[(i + 1) % n])
        d0, d1 = (p0 - p1).normalized(), (p2 - p1).normalized()
        r = min(radius, (p0 - p1).length / 3, (p2 - p1).length / 3)
        a0, a1 = p1 + d0 * r, p1 + d1 * r
        for s in range(steps + 1):
            t = s / steps
            # quadratic Bézier through the corner
            q = (1 - t) ** 2 * a0 + 2 * (1 - t) * t * p1 + t**2 * a1
            out.append((q.x, q.y))
    return out


envelope = kit.empty("Envelope")

# Back panel: pink outside, plain dark inside (the face towards the viewer).
back = slab("Back", rounded([(-1.5, -1), (1.5, -1), (1.5, 1), (-1.5, 1)], 0.04), 0.012, 0.022, [inner, paper_back], envelope)

slab("SideL", rounded([(-1.5, -1), (-1.5, 1), (-0.05, 0.02)], 0.035), 0.004, -0.012, [paper_side, inner], envelope, puff=True)
slab("SideR", rounded([(1.5, -1), (1.5, 1), (0.05, 0.02)], 0.035), 0.004, -0.012, [paper_side, inner], envelope, puff=True)
slab("Bottom", rounded([(-1.5, -1), (1.5, -1), (0, 0.17)], 0.04), 0.004, -0.018, [paper_bottom, inner], envelope, puff=True)

# Flap: hinge on the top edge, rounded tip.
flap = kit.empty("Flap", (0, -0.022, 1.0), envelope)
# Sharp-ish at the hinge corners, a soft round tip.
outline = rounded([(-1.5, 1.0), (1.5, 1.0), (0, -0.12)], [0.03, 0.03, 0.3], steps=12)
leaf = slab("FlapLeaf", outline, 0.004, -0.024, [paper_flap, inner], origin=(0, -0.022, 1.0), puff=True)
kit.attach(leaf, flap)

# Wax seal: a slightly irregular disc with the logo raised out of it.
bm = bmesh.new()
rim = []
for i in range(72):
    t = 2 * math.pi * i / 72
    r = 0.2 * (1 + 0.05 * math.sin(5 * t + 1.3) + 0.03 * math.sin(11 * t) + random.uniform(-0.012, 0.012))
    rim.append((math.cos(t) * r, math.sin(t) * r))
front = [bm.verts.new((x, -0.025, z)) for x, z in rim]
backv = [bm.verts.new((x, 0.012, z)) for x, z in rim]
bm.faces.new(front)
bm.faces.new(list(reversed(backv)))
for i in range(72):
    j = (i + 1) % 72
    bm.faces.new((front[i], backv[i], backv[j], front[j]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
seal_center = (0, -0.03 - bulge(0, -0.07), 1.0 - 1.07)
seal = kit.mesh_object("Seal", bm, wax, location=seal_center)
kit.add_bevel(seal, 0.012, 4)
glyph = kit.pixel_glyph("SealMark", kit.SPARKLE, 0.048, 0.016, (seal_center[0], seal_center[1] - 0.03, seal_center[2]), emboss)
kit.add_bevel(glyph, 0.004, 1)
kit.attach(glyph, seal)
kit.attach(seal, flap)

# Stamp and address: thin planes that take canvas textures.
def label(name, size, center, mat, tilt=0.0):
    """A thin plane on the pocket that follows its bulge."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=10, y_segments=10, size=0.5)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], 0, v.co.y * size[1]))
    # UVs first, so the texture turns with the label instead of staying square to the world.
    kit.planar_uv(bm, "xz")
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(tilt, 3, "Y"))
    for v in bm.verts:
        v.co.y -= bulge(v.co.x + center[0], v.co.z + center[2])
    obj = kit.mesh_object(name, bm, mat, envelope, center)
    kit.smooth(obj, 60)
    return obj


label("Stamp", (0.42, 0.52), (1.08, -0.0215, -0.58), stamp, tilt=-0.07)
label("Address", (1.28, 0.4), (-0.72, -0.0215, -0.66), address)

# The card, between the back panel and the pocket (which bows away from it,
# so the pocket's shadow has room to fall onto the card).
card = kit.box("Card", (2.76, 0.008, 1.84), (0, 0.006, -0.08), [card_edge, card_face], bevel=0.004, uv="xz")
for poly in card.data.polygons:
    poly.material_index = 1 if poly.normal.y < -0.9 else 0

if a.glb:
    kit.export_glb(os.path.abspath(a.glb))

if a.preview:
    flap.rotation_euler.x = -a.pose * math.pi * 0.94
    if a.pose > 0.5:
        flap.location.y = 0.03
    card.location.z = a.pose * 1.2
    kit.world("#0d1f17", 0.6)
    kit.light("Key", "AREA", (-3.5, -6, 4.5), "#fff2e6", 1500, 4, rotation=(math.radians(60), 0, math.radians(-30)))
    kit.light("Rim", "POINT", (2.6, 2, 1.8), "#ff8ad4", 800, 0.5)
    kit.render_preview(os.path.abspath(a.preview), (0.6, -11, 1.2), (0, 0, 0.1), samples=a.samples, lens=50)
