"""
The closing scene's disco ball: mirror tiles in latitude rows, each tile
tilted a hair at random the way real ones are (that's what makes them
sparkle rather than reflect like one smooth sphere), on a dark core, with a
ceiling rod and a little mount.

Centred on the origin, radius 0.5. Names the three.js side relies on:
  DiscoBall   spun in place (the mount and rod don't spin)
"""

import math
import os
import random
import sys

import bmesh
from mathutils import Euler, Vector

sys.path.append(os.path.dirname(__file__))
import kit  # noqa: E402

a = kit.args()
kit.reset()
random.seed(11)

mirror = kit.material("Mirror", "#f4f6f8", rough=0.04, metal=1.0)
core_mat = kit.material("BallCore", "#0b0b0d", rough=0.7)
steel = kit.material("Steel", "#c9ccd1", rough=0.3, metal=1.0)

R = 0.5
TILE = 0.052  # tile pitch on the sphere
GAP = 0.86  # tile size relative to pitch: the dark grout between tiles

bm = bmesh.new()
rows = int((math.pi * R) / TILE)
for i in range(1, rows):
    phi = -math.pi / 2 + math.pi * i / rows
    ring = 2 * math.pi * R * math.cos(phi)
    count = max(6, round(ring / TILE))
    for j in range(count):
        theta = 2 * math.pi * (j + (i % 2) * 0.5) / count
        normal = Vector((math.cos(phi) * math.cos(theta), math.cos(phi) * math.sin(theta), math.sin(phi)))
        # Tiny random tilt per tile.
        tilt = Euler((random.uniform(-0.05, 0.05), random.uniform(-0.05, 0.05), 0))
        tangent = Vector((-math.sin(theta), math.cos(theta), 0))
        bitangent = normal.cross(tangent)
        tangent.rotate(tilt)
        bitangent.rotate(tilt)
        width = min(TILE, ring / count) * GAP / 2
        height = (math.pi * R / rows) * GAP / 2
        center = normal * (R + 0.004)
        verts = [
            bm.verts.new(center + tangent * sx * width + bitangent * sy * height)
            for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))
        ]
        bm.faces.new(verts)
# Give every tile a little thickness, so edges catch light too.
bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=-0.006)
ball = kit.mesh_object("DiscoBall", bm, mirror)
for poly in ball.data.polygons:
    poly.use_smooth = False

core = bmesh.new()
bmesh.ops.create_uvsphere(core, u_segments=48, v_segments=24, radius=R)
inner = kit.mesh_object("DiscoBallCore", core, core_mat)
kit.smooth(inner)
kit.attach(inner, ball)

# Mount: a cap on top of the ball (spins with it) and a rod up out of frame (doesn't).
cap = kit.cylinder("DiscoCap", 0.05, 0.04, (0, 0, R + 0.01), "Z", steel, bevel=0.006)
kit.attach(cap, ball)
kit.cylinder("DiscoRod", 0.008, 4.0, (0, 0, R + 2.0), "Z", steel)

if a.glb:
    kit.export_glb(os.path.abspath(a.glb))

if a.preview:
    kit.world("#000000", 0.0)
    kit.light("Key", "AREA", (1.5, -3, 2), "#ffffff", 300, 1)
    kit.light("Pink", "POINT", (-2, -1, 0.5), "#ff8ad4", 200, 0.3)
    kit.light("Green", "POINT", (2, -1.5, -1), "#4ce6a5", 150, 0.3)
    kit.render_preview(os.path.abspath(a.preview), (0, -4, 0.3), (0, 0, 0), samples=a.samples, lens=60, size=(900, 900))
