import * as THREE from "three";

interface Palette {
  huashiStone: THREE.MeshStandardMaterial;
  darkStone: THREE.MeshStandardMaterial;
  paleStone: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  window: THREE.MeshStandardMaterial;
  warmGlass: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  roofDark: THREE.MeshStandardMaterial;
  greenWall: THREE.MeshStandardMaterial;
  creamWall: THREE.MeshStandardMaterial;
  ochreWall: THREE.MeshStandardMaterial;
  roseWall: THREE.MeshStandardMaterial;
  blueWall: THREE.MeshStandardMaterial;
  shutter: THREE.MeshStandardMaterial;
  vine: THREE.MeshStandardMaterial;
}

let palette: Palette | undefined;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function canvasTexture(
  size: number,
  paint: (context: CanvasRenderingContext2D, random: () => number) => void,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  paint(context, seededRandom(7283 + size));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function makeStoneTexture(): THREE.CanvasTexture {
  return canvasTexture(
    512,
    (ctx, random) => {
      ctx.fillStyle = "#c2b59d";
      ctx.fillRect(0, 0, 512, 512);
      const rowHeight = 34;
      for (let row = -1; row < 17; row += 1) {
        const y = row * rowHeight + (random() - 0.5) * 5;
        let x = row % 2 ? -35 : -10;
        while (x < 520) {
          const width = 34 + random() * 46;
          const height = 25 + random() * 8;
          const warm = Math.floor(142 + random() * 45);
          const red = warm + Math.floor(random() * 17);
          const green = warm - 4 + Math.floor(random() * 10);
          const blue = warm - 15 + Math.floor(random() * 12);
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 4 + random() * 3);
          ctx.lineTo(x + width - 4, y + 2 + random() * 3);
          ctx.lineTo(x + width, y + height - 5);
          ctx.lineTo(x + width - 5, y + height);
          ctx.lineTo(x + 3, y + height - 1);
          ctx.lineTo(x, y + 7);
          ctx.closePath();
          ctx.fillStyle = `rgb(${red},${green},${blue})`;
          ctx.fill();
          ctx.strokeStyle = "#d6cbbb";
          ctx.lineWidth = 3.5;
          ctx.stroke();
          for (let fleck = 0; fleck < 7; fleck += 1) {
            ctx.fillStyle =
              random() > 0.5 ? "rgba(57,51,44,.13)" : "rgba(255,245,221,.16)";
            ctx.fillRect(
              x + 5 + random() * Math.max(2, width - 10),
              y + 6 + random() * Math.max(2, height - 11),
              1 + random() * 2,
              1 + random() * 2,
            );
          }
          x += width - 1;
        }
      }
    },
    2.2,
    1.8,
  );
}

function makeRoofTexture(): THREE.CanvasTexture {
  return canvasTexture(
    256,
    (ctx, random) => {
      ctx.fillStyle = "#a9472f";
      ctx.fillRect(0, 0, 256, 256);
      for (let y = -8; y < 264; y += 16) {
        const offset = (Math.floor(y / 16) & 1) * 8;
        for (let x = -16; x < 264; x += 16) {
          const shade = 128 + Math.floor(random() * 38);
          ctx.fillStyle = `rgb(${shade + 28},${54 + Math.floor(random() * 18)},${37 + Math.floor(random() * 12)})`;
          ctx.beginPath();
          ctx.moveTo(x + offset, y);
          ctx.lineTo(x + offset + 15, y);
          ctx.lineTo(x + offset + 14, y + 13);
          ctx.quadraticCurveTo(x + offset + 8, y + 18, x + offset + 2, y + 13);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(91,37,29,.55)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    },
    3,
    3,
  );
}

function makePalette() {
  const stoneMap = makeStoneTexture();
  const roofMap = makeRoofTexture();
  return {
    huashiStone: new THREE.MeshStandardMaterial({
      color: 0xd1c6b3,
      map: stoneMap,
      bumpMap: stoneMap,
      bumpScale: 0.18,
      roughness: 0.9,
    }),
    darkStone: new THREE.MeshStandardMaterial({
      color: 0x70685b,
      map: stoneMap,
      roughness: 0.95,
    }),
    paleStone: new THREE.MeshStandardMaterial({
      color: 0xd2c6ae,
      roughness: 0.86,
    }),
    trim: new THREE.MeshStandardMaterial({ color: 0xeee9db, roughness: 0.72 }),
    window: new THREE.MeshStandardMaterial({
      color: 0x17252a,
      roughness: 0.34,
      metalness: 0.08,
    }),
    warmGlass: new THREE.MeshStandardMaterial({
      color: 0x5d716f,
      emissive: 0x151d1b,
      emissiveIntensity: 0.35,
      roughness: 0.2,
    }),
    door: new THREE.MeshStandardMaterial({ color: 0x33251d, roughness: 0.72 }),
    metal: new THREE.MeshStandardMaterial({
      color: 0x313a36,
      roughness: 0.5,
      metalness: 0.45,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0xffe7cd,
      map: roofMap,
      bumpMap: roofMap,
      bumpScale: 0.13,
      roughness: 0.88,
    }),
    roofDark: new THREE.MeshStandardMaterial({
      color: 0xd9c3a2,
      map: roofMap,
      bumpMap: roofMap,
      bumpScale: 0.13,
      roughness: 0.9,
    }),
    greenWall: new THREE.MeshStandardMaterial({
      color: 0x91ad8f,
      roughness: 0.83,
    }),
    creamWall: new THREE.MeshStandardMaterial({
      color: 0xd9cba9,
      roughness: 0.84,
    }),
    ochreWall: new THREE.MeshStandardMaterial({
      color: 0xc89f69,
      roughness: 0.86,
    }),
    roseWall: new THREE.MeshStandardMaterial({
      color: 0xc6a08d,
      roughness: 0.84,
    }),
    blueWall: new THREE.MeshStandardMaterial({
      color: 0x9fb5ae,
      roughness: 0.84,
    }),
    shutter: new THREE.MeshStandardMaterial({
      color: 0x345d50,
      roughness: 0.78,
    }),
    vine: new THREE.MeshStandardMaterial({ color: 0x486640, roughness: 0.9 }),
  };
}

function materials(): Palette {
  palette ??= makePalette();
  return palette;
}

function shadow(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  const mesh = shadow(new THREE.Mesh(new THREE.BoxGeometry(...size), material));
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function cylinder(
  group: THREE.Group,
  radius: number,
  height: number,
  position: [number, number, number],
  material: THREE.Material,
  segments = 24,
): THREE.Mesh {
  const mesh = shadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, segments),
      material,
    ),
  );
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function archGeometry(
  width: number,
  height: number,
  depth: number,
): THREE.ExtrudeGeometry {
  const spring = height - width * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, spring);
  shape.absarc(0, spring, width / 2, 0, Math.PI, false);
  shape.lineTo(-width / 2, 0);
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 12,
  });
}

function archedWindow(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  rotationY = 0,
  shutters = false,
): THREE.Group {
  const m = materials();
  const assembly = new THREE.Group();
  const recess = shadow(
    new THREE.Mesh(archGeometry(width + 0.45, height + 0.42, 0.14), m.trim),
  );
  recess.position.set(0, -height / 2, 0);
  assembly.add(recess);
  const glass = shadow(
    new THREE.Mesh(archGeometry(width, height, 0.09), m.window),
  );
  glass.position.set(0, -height / 2 + 0.03, 0.15);
  assembly.add(glass);
  box(assembly, [0.09, height - 0.25, 0.08], [0, 0, 0.29], m.trim);
  box(assembly, [width - 0.18, 0.08, 0.08], [0, -height * 0.08, 0.29], m.trim);
  box(assembly, [width - 0.18, 0.08, 0.08], [0, -height * 0.34, 0.29], m.trim);
  if (shutters) {
    const left = box(
      assembly,
      [width * 0.33, height * 0.72, 0.11],
      [-width * 0.72, -height * 0.13, 0.18],
      m.shutter,
    );
    const right = box(
      assembly,
      [width * 0.33, height * 0.72, 0.11],
      [width * 0.72, -height * 0.13, 0.18],
      m.shutter,
    );
    left.rotation.y = -0.18;
    right.rotation.y = 0.18;
  }
  assembly.position.set(x, y, z);
  assembly.rotation.y = rotationY;
  group.add(assembly);
  return assembly;
}

function rectangularWindow(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  width = 1.55,
  height = 2.25,
  shutters = true,
): void {
  const m = materials();
  const frame = box(
    group,
    [width + 0.34, height + 0.34, 0.16],
    [x, y, z],
    m.trim,
  );
  const pane = box(group, [width, height, 0.11], [x, y, z + 0.13], m.warmGlass);
  box(group, [0.08, height, 0.08], [x, y, z + 0.22], m.trim);
  box(group, [width, 0.08, 0.08], [x, y, z + 0.22], m.trim);
  if (shutters) {
    const l = box(
      group,
      [0.42, height, 0.12],
      [x - width * 0.78, y, z + 0.1],
      m.shutter,
    );
    const r = box(
      group,
      [0.42, height, 0.12],
      [x + width * 0.78, y, z + 0.1],
      m.shutter,
    );
    l.rotation.y = -0.22;
    r.rotation.y = 0.22;
  }
  frame.castShadow = pane.castShadow = false;
}

function crenellations(
  group: THREE.Group,
  center: THREE.Vector3,
  radius: number,
  count: number,
  y: number,
  material: THREE.Material,
): void {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const merlon = box(
      group,
      [1.15, 1.15, 0.72],
      [
        center.x + Math.sin(angle) * radius,
        y,
        center.z + Math.cos(angle) * radius,
      ],
      material,
    );
    merlon.rotation.y = angle;
  }
}

function balcony(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
): void {
  const m = materials();
  box(group, [width, 0.38, depth], [x, y, z], m.paleStone);
  const railY = y + 1;
  box(
    group,
    [width, 0.16, 0.18],
    [x, railY + 0.55, z + depth / 2 - 0.12],
    m.trim,
  );
  for (let bx = -width / 2 + 0.3; bx <= width / 2 - 0.25; bx += 0.48) {
    cylinder(
      group,
      0.09,
      1.08,
      [x + bx, railY, z + depth / 2 - 0.12],
      m.trim,
      8,
    );
  }
}

function addVines(group: THREE.Group): void {
  const m = materials();
  const random = seededRandom(92);
  for (let branch = 0; branch < 5; branch += 1) {
    const curve: THREE.Vector3[] = [];
    const rootX = 5.4 + branch * 0.28;
    for (let i = 0; i < 8; i += 1)
      curve.push(
        new THREE.Vector3(
          rootX + Math.sin(i * 1.7 + branch) * 0.32,
          1 + i * 1.25,
          10.15,
        ),
      );
    const stem = shadow(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(curve),
          18,
          0.045,
          5,
          false,
        ),
        m.vine,
      ),
    );
    group.add(stem);
    for (let i = 1; i < 8; i += 2) {
      const leaf = shadow(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.24 + random() * 0.14, 6, 4),
          m.vine,
        ),
      );
      leaf.scale.set(1.45, 0.55, 0.3);
      leaf.position
        .copy(curve[i])
        .add(new THREE.Vector3((random() - 0.5) * 0.55, 0, 0.12));
      group.add(leaf);
    }
  }
}

export function createHuashiLou(): THREE.Group {
  const group = new THREE.Group();
  group.name = "Huashi Lou";
  const m = materials();

  box(group, [25, 0.7, 20], [0, 0.35, 0], m.darkStone);
  box(group, [23.8, 1.0, 18.8], [0, 1.15, -0.15], m.huashiStone);
  box(group, [14.2, 12.2, 15.2], [0.6, 7.65, -0.8], m.huashiStone);
  box(group, [13.1, 0.5, 16.0], [0.6, 13.78, -0.55], m.paleStone);
  box(group, [14.0, 1.25, 15.4], [0.6, 14.45, -0.75], m.huashiStone);

  cylinder(group, 4.25, 19.4, [-7.7, 10.4, 3.25], m.huashiStone, 40);
  cylinder(group, 4.52, 0.42, [-7.7, 19.88, 3.25], m.paleStone, 40);
  cylinder(group, 3.7, 0.55, [-7.7, 21.05, 3.25], m.huashiStone, 40);
  crenellations(
    group,
    new THREE.Vector3(-7.7, 0, 3.25),
    3.52,
    12,
    20.65,
    m.huashiStone,
  );

  // Open arched belvedere: slender piers and a flat crenellated crown, matching Huashi Lou's lookout.
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    cylinder(
      group,
      0.28,
      3.3,
      [-7.7 + Math.sin(angle) * 2.62, 22.45, 3.25 + Math.cos(angle) * 2.62],
      m.paleStone,
      10,
    );
    const archTop = shadow(
      new THREE.Mesh(
        new THREE.TorusGeometry(1.0, 0.25, 7, 16, Math.PI),
        m.paleStone,
      ),
    );
    archTop.position.set(
      -7.7 + Math.sin(angle) * 2.62,
      23.0,
      3.25 + Math.cos(angle) * 2.62,
    );
    archTop.rotation.set(0, angle, 0);
    group.add(archTop);
  }
  cylinder(group, 3.18, 0.45, [-7.7, 24.2, 3.25], m.paleStone, 32);
  crenellations(
    group,
    new THREE.Vector3(-7.7, 0, 3.25),
    2.82,
    10,
    24.82,
    m.huashiStone,
  );

  cylinder(group, 3.3, 15.8, [8.0, 8.9, 3.4], m.huashiStone, 8);
  cylinder(group, 3.58, 0.42, [8.0, 16.75, 3.4], m.paleStone, 8);
  crenellations(
    group,
    new THREE.Vector3(8.0, 0, 3.4),
    3.12,
    8,
    17.38,
    m.huashiStone,
  );

  // Central columned entrance porch and the characteristic balcony.
  box(group, [7.4, 0.45, 3.3], [0.1, 1.2, 9.45], m.paleStone);
  for (let s = 0; s < 3; s += 1)
    box(
      group,
      [6.4 - s * 0.65, 0.32, 1.1],
      [0.1, 0.16 + s * 0.31, 10.5 + s * 0.48],
      m.paleStone,
    );
  for (const x of [-2.45, 2.65]) {
    cylinder(group, 0.36, 4.8, [x, 4.0, 9.0], m.paleStone, 16);
    cylinder(group, 0.48, 0.24, [x, 1.7, 9.0], m.trim, 16);
    cylinder(group, 0.48, 0.25, [x, 6.3, 9.0], m.trim, 16);
  }
  box(group, [6.3, 0.55, 2.4], [0.1, 6.55, 9.0], m.paleStone);
  balcony(group, 0.1, 7.05, 9.45, 6.9, 2.8);
  const doorTrim = shadow(new THREE.Mesh(archGeometry(2.1, 3.7, 0.22), m.trim));
  doorTrim.position.set(0.1, 1.45, 10.07);
  group.add(doorTrim);
  const door = shadow(new THREE.Mesh(archGeometry(1.65, 3.3, 0.18), m.door));
  door.position.set(0.1, 1.56, 10.31);
  group.add(door);

  for (const x of [-4.0, 4.15]) {
    archedWindow(group, x, 5.0, 7.03, 1.65, 3.0);
    archedWindow(group, x, 10.35, 7.03, 1.65, 2.8);
  }
  archedWindow(group, 0.1, 10.45, 7.04, 1.85, 3.1);
  for (const angle of [-0.7, 0, 0.7]) {
    archedWindow(
      group,
      -7.7 + Math.sin(angle) * 4.16,
      6.1,
      3.25 + Math.cos(angle) * 4.16,
      1.45,
      3.0,
      angle,
    );
    archedWindow(
      group,
      -7.7 + Math.sin(angle) * 4.16,
      13.0,
      3.25 + Math.cos(angle) * 4.16,
      1.45,
      3.0,
      angle,
    );
  }
  for (const angle of [-0.62, 0, 0.62])
    archedWindow(
      group,
      8 + Math.sin(angle) * 3.22,
      8.8,
      3.4 + Math.cos(angle) * 3.22,
      1.25,
      2.75,
      angle,
    );

  // Side windows and strong horizontal masonry bands remain visible from the aerial approach.
  for (const y of [3.2, 8.1, 12.6])
    box(group, [14.65, 0.22, 0.38], [0.6, y, 7.0], m.paleStone);
  for (const z of [-4.7, 0.1]) {
    archedWindow(group, 7.72, 5.1, z, 1.5, 2.8, Math.PI / 2);
    archedWindow(group, 7.72, 10.4, z, 1.5, 2.8, Math.PI / 2);
  }
  addVines(group);
  return group;
}

function hippedRoof(
  width: number,
  depth: number,
  height: number,
  material: THREE.Material,
): THREE.Mesh {
  const vertices = new Float32Array([
    -width / 2,
    0,
    -depth / 2,
    width / 2,
    0,
    -depth / 2,
    width / 2,
    0,
    depth / 2,
    -width / 2,
    0,
    depth / 2,
    -width * 0.28,
    height,
    -depth * 0.22,
    width * 0.28,
    height,
    -depth * 0.22,
    width * 0.28,
    height,
    depth * 0.22,
    -width * 0.28,
    height,
    depth * 0.22,
  ]);
  const indices = [
    0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 4,
    5, 6, 4, 6, 7,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return shadow(new THREE.Mesh(geometry, material));
}

function gabledRoof(
  width: number,
  depth: number,
  height: number,
  material: THREE.Material,
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(width / 2, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -depth / 2);
  return shadow(new THREE.Mesh(geometry, material));
}

function dormer(group: THREE.Group, x: number, y: number, z: number): void {
  const m = materials();
  box(group, [2.25, 1.8, 1.7], [x, y, z], m.creamWall);
  const roof = gabledRoof(2.7, 2.1, 1.25, m.roofDark);
  roof.position.set(x, y + 0.9, z + 0.05);
  group.add(roof);
  rectangularWindow(group, x, y, z + 0.91, 0.8, 1.12, false);
}

function chimney(group: THREE.Group, x: number, y: number, z: number): void {
  const m = materials();
  box(group, [1.0, 3.3, 1.0], [x, y, z], m.darkStone);
  box(group, [1.25, 0.25, 1.25], [x, y + 1.68, z], m.paleStone);
}

export function createVilla(variant: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `Badaguan Villa ${variant}`;
  const m = materials();
  const style = ((Math.floor(variant) % 5) + 5) % 5;
  const wall = [m.greenWall, m.creamWall, m.ochreWall, m.roseWall, m.blueWall][
    style
  ];
  const width = style === 0 ? 17.8 : style === 3 ? 18.5 : 17;
  const depth = style === 2 ? 15.5 : 14;

  box(group, [width + 0.8, 0.7, depth + 0.7], [0, 0.35, 0], m.darkStone);
  box(group, [width, 2.0, depth], [0, 1.35, 0], m.huashiStone);
  box(group, [width - 0.5, 8.6, depth - 0.5], [0, 6.65, -0.1], wall);
  box(group, [width, 0.28, depth], [0, 10.92, -0.1], m.trim);

  const mainRoof =
    style === 2
      ? gabledRoof(width + 2, depth + 2, 5.0, m.roof)
      : hippedRoof(width + 2, depth + 2, style === 0 ? 6.0 : 4.5, m.roof);
  mainRoof.position.set(0, 11.05, -0.1);
  group.add(mainRoof);

  const windowXs = style === 3 ? [-6.0, -2.0, 2.0, 6.0] : [-5.2, 0, 5.2];
  for (const y of [4.5, 8.35])
    for (const x of windowXs)
      rectangularWindow(group, x, y, depth / 2 - 0.15, 1.35, 2.15, style !== 4);

  // Porch, columns, pediment, and recessed entrance.
  box(group, [5.5, 0.4, 2.7], [0, 1.25, depth / 2 + 1.2], m.paleStone);
  for (const x of [-2.15, 2.15])
    cylinder(group, 0.25, 3.7, [x, 3.25, depth / 2 + 1.65], m.trim, 12);
  box(group, [5.1, 0.4, 2.0], [0, 5.15, depth / 2 + 1.35], m.trim);
  const porchRoof = gabledRoof(6.0, 2.5, 2.0, m.roofDark);
  porchRoof.position.set(0, 5.35, depth / 2 + 1.35);
  group.add(porchRoof);
  const villaDoor = shadow(
    new THREE.Mesh(archGeometry(1.55, 3.05, 0.16), m.door),
  );
  villaDoor.position.set(0, 1.35, depth / 2 + 0.2);
  group.add(villaDoor);

  chimney(group, -width * 0.32, 14.0, -depth * 0.2);

  if (style === 0) {
    // Princess Villa: jade walls and a small square stair tower with a steep pointed roof.
    box(group, [4.5, 12.5, 4.8], [-6.5, 7.0, 3.6], m.greenWall);
    box(group, [4.9, 0.35, 5.2], [-6.5, 13.3, 3.6], m.trim);
    const towerRoof = shadow(
      new THREE.Mesh(new THREE.ConeGeometry(4.0, 6.2, 4), m.roofDark),
    );
    towerRoof.position.set(-6.5, 16.5, 3.6);
    towerRoof.rotation.y = Math.PI / 4;
    group.add(towerRoof);
    rectangularWindow(group, -6.5, 7.3, 6.06, 1.25, 2.15, false);
    rectangularWindow(group, -6.5, 11.0, 6.06, 1.1, 1.8, false);
    dormer(group, 2.5, 13.15, depth / 2 + 0.15);
  } else if (style === 1) {
    dormer(group, -3.7, 12.9, depth / 2 + 0.25);
    dormer(group, 3.7, 12.9, depth / 2 + 0.25);
    balcony(group, 0, 8.0, depth / 2 + 0.7, 4.6, 1.45);
  } else if (style === 2) {
    // Broad ochre cross-gabled villa.
    const cross = gabledRoof(8.5, depth + 3.0, 4.2, m.roofDark);
    cross.rotation.y = Math.PI / 2;
    cross.position.set(4.2, 11.1, 0);
    group.add(cross);
    box(group, [6.2, 6.8, 2.2], [4.1, 7.5, depth / 2 + 0.8], wall);
    archedWindow(group, 4.1, 9.0, depth / 2 + 2.0, 1.7, 2.8);
  } else if (style === 3) {
    // Asymmetric rose villa with a rounded corner bay and wrap balcony.
    cylinder(group, 3.0, 10.0, [6.5, 6.2, 3.7], wall, 24);
    cylinder(group, 3.25, 0.35, [6.5, 11.22, 3.7], m.trim, 24);
    const bayRoof = shadow(
      new THREE.Mesh(new THREE.ConeGeometry(3.7, 3.0, 24), m.roofDark),
    );
    bayRoof.position.set(6.5, 12.8, 3.7);
    group.add(bayRoof);
    for (const a of [-0.55, 0, 0.55])
      archedWindow(
        group,
        6.5 + Math.sin(a) * 2.92,
        7.0,
        3.7 + Math.cos(a) * 2.92,
        1.1,
        2.1,
        a,
      );
    balcony(group, -1.4, 8.2, depth / 2 + 0.65, 5.8, 1.4);
  } else {
    // Restrained blue-green villa with a central Flemish-inspired stepped gable.
    box(group, [6.0, 4.8, 1.0], [0, 12.2, depth / 2 - 0.05], wall);
    for (let i = 0; i < 3; i += 1)
      box(
        group,
        [5.2 - i * 1.25, 0.55, 1.25],
        [0, 14.8 + i * 0.52, depth / 2 + 0.05],
        m.trim,
      );
    archedWindow(group, 0, 13.0, depth / 2 + 0.52, 1.45, 2.45);
    dormer(group, -4.6, 12.75, depth / 2 + 0.2);
    dormer(group, 4.6, 12.75, depth / 2 + 0.2);
  }

  return group;
}
