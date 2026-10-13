"""
Helpers shared by the scene scripts. Run the scripts headless, e.g.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        -P blender/door.py -- --glb public/story/door.glb --preview /tmp/door.png

Blender is Z-up; glTF export converts to three.js' Y-up. In Blender the
viewer stands at -Y looking towards +Y.

Object and material names matter: the three.js side finds parts by name
(to animate them, or to put a generated texture on them).
"""

import argparse
import math
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector


def args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--glb")
    parser.add_argument("--preview")
    parser.add_argument("--samples", type=int, default=48)
    parser.add_argument("--pose", type=float, default=0.0, help="0–1 animation pose for the preview")
    return parser.parse_args(argv)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    return scene


_materials = {}


def material(name, color, rough=0.5, metal=0.0, emission=None, strength=0.0, alpha=1.0):
    """Principled material; reused by name. Colours are sRGB hex."""
    if name in _materials:
        return _materials[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*srgb(color), 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*srgb(emission), 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
    _materials[name] = mat
    return mat


def srgb(hex_color):
    hex_color = hex_color.lstrip("#")
    channels = [int(hex_color[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels)


def link(obj, parent=None):
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def planar_uv(bm, axes="xz", scale=None, offset=(0, 0, 0)):
    """
    Projects every face's UVs onto two axes. Normalised to the mesh bounds
    (one texture across the whole part), or with `scale`, in texture repeats
    per metre — so neighbouring parts share one continuous texture.
    """
    layer = bm.loops.layers.uv.verify()
    a, b = ("xyz".index(axes[0]), "xyz".index(axes[1]))
    if scale:
        for face in bm.faces:
            n = face.normal
            # Walls get their side faces projected sensibly too.
            axes_here = (a, b) if abs(n[3 - a - b]) >= max(abs(n[a]), abs(n[b])) else ((a, 3 - a - b) if abs(n[b]) > abs(n[a]) else (3 - a - b, b))
            for loop in face.loops:
                co = loop.vert.co + Vector(offset)
                loop[layer].uv = (co[axes_here[0]] * scale, co[axes_here[1]] * scale)
        return
    lo_a = min(v.co[a] for v in bm.verts)
    hi_a = max(v.co[a] for v in bm.verts)
    lo_b = min(v.co[b] for v in bm.verts)
    hi_b = max(v.co[b] for v in bm.verts)
    for face in bm.faces:
        for loop in face.loops:
            co = loop.vert.co
            loop[layer].uv = ((co[a] - lo_a) / ((hi_a - lo_a) or 1), (co[b] - lo_b) / ((hi_b - lo_b) or 1))


def attach(child, parent):
    """Parents without moving: the child keeps its world placement."""
    bpy.context.view_layer.update()  # matrix_world is stale until the scene updates
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    return child


def mesh_object(name, bm, mat=None, parent=None, location=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    if mat is not None:
        for m in mat if isinstance(mat, (list, tuple)) else [mat]:
            obj.data.materials.append(m)
    obj.location = location
    return link(obj, parent)


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    return link(obj, parent)


def box(name, size, center=(0, 0, 0), mat=None, bevel=0.0, segments=3, parent=None, origin=None, uv=None, uv_scale=None):
    """
    Axis-aligned box of `size` (x, y, z) centred on `center`. With `origin`
    the object's pivot sits there instead (e.g. a door's hinge), which is
    what three.js rotates around.
    """
    pivot = Vector(origin if origin is not None else center)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    offset = Vector(center) - pivot
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + offset
    if uv:
        planar_uv(bm, uv, uv_scale, pivot)
    obj = mesh_object(name, bm, mat, parent, pivot)
    if bevel:
        add_bevel(obj, bevel, segments)
    return obj


def add_bevel(obj, width, segments=3):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.harden_normals = True
    smooth(obj)
    return mod


def smooth(obj, angle=35):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    try:
        obj.data.set_sharp_from_angle(angle=math.radians(angle))
    except AttributeError:
        pass


def cylinder(name, radius, depth, center=(0, 0, 0), axis="Z", mat=None, segments=48, bevel=0.0, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=depth)
    rot = {"X": Matrix.Rotation(math.pi / 2, 4, "Y"), "Y": Matrix.Rotation(math.pi / 2, 4, "X"), "Z": Matrix.Identity(4)}[axis]
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts)
    obj = mesh_object(name, bm, mat, parent, center)
    smooth(obj, 40)
    if bevel:
        add_bevel(obj, bevel, 3)
    return obj


def rounded_rect_slab(name, width, height, depth, radius, center=(0, 0, 0), mat=None, parent=None, axis="Y", bevel=0.0):
    """A flat plate with rounded corners: width along X, height along Z, depth along Y."""
    bm = bmesh.new()
    points = []
    steps = 8
    corners = [
        (width / 2 - radius, height / 2 - radius, 0),
        (-width / 2 + radius, height / 2 - radius, math.pi / 2),
        (-width / 2 + radius, -height / 2 + radius, math.pi),
        (width / 2 - radius, -height / 2 + radius, 3 * math.pi / 2),
    ]
    for cx, cz, start in corners:
        for i in range(steps + 1):
            a = start + (math.pi / 2) * i / steps
            points.append((cx + math.cos(a) * radius, cz + math.sin(a) * radius))
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in points]
    back = [bm.verts.new((x, depth / 2, z)) for x, z in points]
    bm.faces.new(list(reversed(front)))
    bm.faces.new(back)
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = mesh_object(name, bm, mat, parent, center)
    smooth(obj, 30)
    if bevel:
        add_bevel(obj, bevel, 2)
    return obj


def pixel_glyph(name, rows, cell, depth, center, mat, parent=None, gap=0.0):
    """Brand pixel glyph from small boxes, in the XZ plane, sticking out towards -Y."""
    bm = bmesh.new()
    h, w = len(rows), len(rows[0])
    for y, row in enumerate(rows):
        for x, on in enumerate(row):
            if on != "1":
                continue
            geom = bmesh.ops.create_cube(bm, size=1)
            s = cell - gap
            for v in geom["verts"]:
                v.co = Vector(
                    (
                        v.co.x * s + (x - (w - 1) / 2) * cell,
                        v.co.y * depth - depth / 2,
                        v.co.z * s + ((h - 1) / 2 - y) * cell,
                    )
                )
    return mesh_object(name, bm, mat, parent, center)


# The logo mark: the sparkle with its extra pixel at the top left.
SPARKLE = ["10100", "01110", "11111", "01110", "00100"]
ONE = ["010", "110", "010", "010", "111"]


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_texcoords=True,
        export_normals=True,
    )


def render_preview(path, camera_loc, target, samples=48, lens=40, size=(1280, 800)):
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = lens
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    link(cam)
    cam.location = camera_loc
    direction = Vector(target) - Vector(camera_loc)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    try:
        scene.cycles.device = "GPU"
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
    except Exception:
        pass
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = path
    scene.view_settings.view_transform = "AgX"
    bpy.ops.render.render(write_still=True)


def world(color="#05080a", strength=0.3):
    w = bpy.data.worlds.new("World")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*srgb(color), 1)
    bg.inputs["Strength"].default_value = strength
    bpy.context.scene.world = w


def light(name, kind, location, color="#ffffff", energy=100, size=0.2, rotation=(0, 0, 0), spot=None):
    data = bpy.data.lights.new(name, kind)
    data.color = srgb(color)
    data.energy = energy
    if hasattr(data, "shadow_soft_size"):
        data.shadow_soft_size = size
    if kind == "AREA":
        data.size = size
    if kind == "SPOT" and spot:
        data.spot_size = spot
        data.spot_blend = 0.6
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler = rotation
    return link(obj)
