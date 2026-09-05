import * as THREE from "three";
import { buildingSites, coastZ, groundY, roadZ, type Mood } from "./world";

export interface LandscapeEnvironment {
  update(time: number): void;
  setMood(mood: Mood): void;
}

const TAU = Math.PI * 2;

function rng(seed = 0x8badf00d) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 128,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function ribbonGeometry(
  center: (x: number) => number,
  width: number,
  yOffset: number,
  x0 = -185,
  x1 = 185,
  segments = 150,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = THREE.MathUtils.lerp(x0, x1, i / segments);
    const z = center(x);
    for (const side of [-1, 1]) {
      const zz = z + side * width * 0.5;
      positions.push(x, groundY(x, zz) + yOffset, zz);
      uvs.push((i / segments) * 24, side < 0 ? 0 : 1);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addRibbon(
  scene: THREE.Object3D,
  center: (x: number) => number,
  width: number,
  y: number,
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(ribbonGeometry(center, width, y), material);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function blocked(x: number, z: number, padding = 7) {
  if (
    buildingSites.some(
      (s) =>
        Math.abs(x - s.x) < s.width * 0.5 + padding &&
        Math.abs(z - s.z) < s.depth * 0.5 + padding,
    )
  )
    return true;
  if (Math.abs(z - roadZ(x)) < 7.5) return true;
  const backRoad = -94 + 7 * Math.sin((x + 25) / 53);
  if (Math.abs(z - backRoad) < 6.5) return true;
  if (x > -8 && x < 62 && z > 7 && z < 63) return true; // Huashi's southeast sea view
  return z > coastZ(x) - 5;
}

export function createLandscape(scene: THREE.Scene): LandscapeEnvironment {
  const random = rng();
  const root = new THREE.Group();
  root.name = "Badaguan landscape";
  scene.add(root);

  // A tessellated, gently rolling land sheet follows the same ground function used for building placement.
  const cols = 180;
  const rows = 110;
  const landPos: number[] = [];
  const landColor: number[] = [];
  const landIndex: number[] = [];
  const landUvs: number[] = [];
  const c = new THREE.Color();
  for (let j = 0; j <= rows; j++) {
    const z = THREE.MathUtils.lerp(-460, 90, j / rows);
    for (let i = 0; i <= cols; i++) {
      const x = THREE.MathUtils.lerp(-440, 440, i / cols);
      const shoreline = coastZ(x);
      const inlandY = groundY(x, z);
      const beachT = THREE.MathUtils.smoothstep(
        z,
        shoreline - 10,
        shoreline + 10,
      );
      const y = THREE.MathUtils.lerp(inlandY, -1.5, beachT);
      landPos.push(x, y, z);
      landUvs.push(i / cols, j / rows);
      const mottling =
        0.035 * Math.sin(x * 0.31 + z * 0.17) + 0.025 * Math.sin(z * 0.63);
      if (z > shoreline - 11) c.setHSL(0.105, 0.3, 0.51 + mottling);
      else c.setHSL(0.22 + mottling * 0.15, 0.3, 0.18 + mottling * 0.45);
      landColor.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      landIndex.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2);
    }
  const landGeo = new THREE.BufferGeometry();
  landGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(landPos, 3),
  );
  landGeo.setAttribute("color", new THREE.Float32BufferAttribute(landColor, 3));
  landGeo.setAttribute("uv", new THREE.Float32BufferAttribute(landUvs, 2));
  landGeo.setIndex(landIndex);
  landGeo.computeVertexNormals();
  const groundTexture = canvasTexture((ctx, s) => {
    ctx.fillStyle = "#d3d1bb";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 16000; i++) {
      ctx.fillStyle =
        random() > 0.5 ? "rgba(64,72,31,.12)" : "rgba(255,254,221,.25)";
      ctx.fillRect(
        random() * s,
        random() * s,
        0.5 + random() * 1.4,
        0.5 + random() * 2.1,
      );
    }
  }, 256);
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(140, 90);
  const land = new THREE.Mesh(
    landGeo,
    new THREE.MeshStandardMaterial({
      map: groundTexture,
      vertexColors: true,
      roughness: 0.96,
    }),
  );
  land.receiveShadow = true;
  root.add(land);

  const ridgeGeo = new THREE.PlaneGeometry(2400, 1400, 100, 45);
  ridgeGeo.rotateX(-Math.PI / 2);
  const ridgePositions = ridgeGeo.getAttribute("position");
  for (let i = 0; i < ridgePositions.count; i++) {
    const x = ridgePositions.getX(i),
      z = ridgePositions.getZ(i) - 915;
    const distance = THREE.MathUtils.smoothstep(-z, 215, 540);
    const hills =
      25 +
      32 * Math.sin(x * 0.003 + 0.4) ** 2 +
      16 * Math.cos(z * 0.006 + x * 0.005) ** 2;
    ridgePositions.setXYZ(i, x, groundY(x, z) - 2 + distance * hills, z);
  }
  ridgeGeo.computeVertexNormals();
  const ridge = new THREE.Mesh(
    ridgeGeo,
    new THREE.MeshStandardMaterial({ color: 0x7d8d65, roughness: 1 }),
  );
  root.add(ridge);

  const asphalt = new THREE.MeshStandardMaterial({
    color: 0x494c48,
    roughness: 0.9,
  });
  const pavingTexture = canvasTexture((ctx, s) => {
    ctx.fillStyle = "#807b6c";
    ctx.fillRect(0, 0, s, s);
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 8; col++) {
        const shade = 161 + Math.floor(random() * 35);
        ctx.fillStyle = `rgb(${shade + 9},${shade + 4},${shade - 11})`;
        ctx.fillRect(col * 19 + (row % 2) * 9, row * 17, 17, 15);
      }
  });
  pavingTexture.wrapS = pavingTexture.wrapT = THREE.RepeatWrapping;
  const paving = new THREE.MeshStandardMaterial({
    color: 0xd8cbb4,
    map: pavingTexture,
    bumpMap: pavingTexture,
    bumpScale: 0.05,
    roughness: 0.96,
  });
  const curb = new THREE.MeshStandardMaterial({
    color: 0xc8c0aa,
    roughness: 0.92,
  });
  addRibbon(root, roadZ, 7, 0.13, asphalt);
  addRibbon(root, roadZ, 10.2, 0.075, paving);
  addRibbon(root, (x) => roadZ(x) - 4.35, 0.34, 0.2, curb);
  addRibbon(root, (x) => roadZ(x) + 4.35, 0.34, 0.2, curb);

  const backRoad = (x: number) => -94 + 7 * Math.sin((x + 25) / 53);
  addRibbon(root, backRoad, 5.4, 0.11, asphalt);
  addRibbon(root, (x) => backRoad(x) + 3.45, 1.3, 0.12, paving);

  // A diagonal garden street joins the two roads without crossing any building footprint.
  const connectorPoints = [
    new THREE.Vector3(-145, 0, roadZ(-145)),
    new THREE.Vector3(-137, 0, -62),
    new THREE.Vector3(-128, 0, backRoad(-128)),
  ];
  const connectorCurve = new THREE.CatmullRomCurve3(connectorPoints);
  const diagGeo = new THREE.BufferGeometry();
  const diagP: number[] = [];
  const diagI: number[] = [];
  for (let i = 0; i <= 30; i++) {
    const p = connectorCurve.getPoint(i / 30);
    const t = connectorCurve.getTangent(i / 30);
    const nx = -t.z,
      nz = t.x;
    for (const side of [-1, 1]) {
      const x = p.x + nx * side * 3;
      const z = p.z + nz * side * 3;
      diagP.push(x, groundY(x, z) + 0.14, z);
    }
    if (i < 30) {
      const a = i * 2;
      diagI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  diagGeo.setAttribute("position", new THREE.Float32BufferAttribute(diagP, 3));
  diagGeo.setIndex(diagI);
  diagGeo.computeVertexNormals();
  root.add(new THREE.Mesh(diagGeo, asphalt));

  // Granite headland and scattered tide-worn boulders.
  const rockGeo = new THREE.IcosahedronGeometry(1, 2);
  const rockPositions = rockGeo.getAttribute("position");
  for (let i = 0; i < rockPositions.count; i++) {
    const x = rockPositions.getX(i),
      y = rockPositions.getY(i),
      z = rockPositions.getZ(i);
    const uneven =
      1 + Math.sin(x * 8 + y * 9) * 0.11 + Math.cos(z * 11 + x * 3) * 0.08;
    rockPositions.setXYZ(i, x * uneven, y * uneven, z * uneven);
  }
  rockGeo.computeVertexNormals();
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x9e8c72,
    roughness: 0.94,
  });
  const rocks: Array<{ x: number; z: number; s: number }> = [];
  for (let i = 0; i < 108; i++) {
    const headland = i < 62;
    const x = headland ? 24 + (random() - 0.5) * 35 : -175 + random() * 350;
    const z = headland
      ? coastZ(x) + random() * 13 - 3
      : coastZ(x) + random() * 9 - 1;
    rocks.push({
      x,
      z,
      s: headland ? 0.8 + random() * 2.8 : 0.45 + random() * 1.9,
    });
  }
  const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
  const dummy = new THREE.Object3D();
  rocks.forEach((r, i) => {
    dummy.position.set(r.x, 0.05 + r.s * 0.18, r.z);
    dummy.rotation.set(random() * 0.45, random() * TAU, random() * 0.35);
    dummy.scale.set(r.s * (1 + random()), r.s * (0.38 + random() * 0.3), r.s);
    dummy.updateMatrix();
    rockMesh.setMatrixAt(i, dummy.matrix);
  });
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  root.add(rockMesh);

  // Layered leaf cards form volumetric crowns; branching trunks stay visible at street level.
  const leafTexture = canvasTexture((ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      const angle = random() * TAU;
      const radius = Math.sqrt(random()) * s * 0.43;
      const x = s * 0.5 + Math.cos(angle) * radius;
      const y = s * 0.5 + Math.sin(angle) * radius * 0.83;
      const shade = 145 + Math.floor(random() * 105);
      ctx.fillStyle = `rgb(${shade},${Math.min(255, shade + 8)},${Math.round(shade * 0.72)})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 5 + random() * 8, 3 + random() * 4, angle, 0, TAU);
      ctx.fill();
    }
  }, 256);
  const barkTexture = canvasTexture((ctx, s) => {
    ctx.fillStyle = "#9b8e73";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 250; i++) {
      ctx.strokeStyle = random() > 0.5 ? "#70664d" : "#b2a48b";
      ctx.lineWidth = 0.5 + random() * 1.2;
      const x = random() * s,
        y = random() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + random() * 3, y + 5 + random() * 32);
      ctx.stroke();
    }
  });
  const trunkGeo = new THREE.CylinderGeometry(0.43, 0.7, 1, 8);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x837860,
    map: barkTexture,
    roughness: 1,
  });
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const leafColors = [0x66763f, 0x82944f, 0xa69949, 0x425f47];
  const leafTime = { value: 0 };
  const leafMats = leafColors.map((color) => {
    const material = new THREE.MeshLambertMaterial({
      color,
      map: leafTexture,
      alphaTest: 0.48,
      side: THREE.DoubleSide,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uLeafTime = leafTime;
      shader.vertexShader =
        `uniform float uLeafTime;\n${shader.vertexShader}`.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed.x += sin(uLeafTime*.75 + instanceMatrix[3].x*.07 + instanceMatrix[3].z*.08)*.065;",
        );
    };
    return material;
  });
  const trees: Array<{
    x: number;
    z: number;
    h: number;
    pine: boolean;
    tint: number;
  }> = [];
  for (let x = -176; x < 174; x += 10.5) {
    for (const side of [-1, 1]) {
      const z = roadZ(x) + side * 9;
      if (blocked(x, z, 4)) continue;
      trees.push({
        x,
        z,
        h: 15 + random() * 5,
        pine: false,
        tint: Math.floor(random() * 3),
      });
    }
  }
  let attempts = 0;
  while (trees.length < 315 && attempts++ < 7000) {
    const x = -193 + random() * 386;
    const z = -215 + random() * 218;
    if (blocked(x, z, 3.5)) continue;
    if (trees.some((tree) => Math.hypot(tree.x - x, tree.z - z) < 6)) continue;
    const pine = random() < 0.22;
    trees.push({
      x,
      z,
      h: 12 + random() * 12,
      pine,
      tint: pine ? 3 : Math.floor(random() * 3),
    });
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length * 5);
  const leavesByTint = leafMats.map(
    (m) => new THREE.InstancedMesh(planeGeo, m, trees.length * 28),
  );
  const counts = [0, 0, 0, 0];
  const branchDirection = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  trees.forEach((tree, i) => {
    const y = groundY(tree.x, tree.z);
    const trunkHeight = tree.h * 0.59;
    dummy.position.set(tree.x, y + trunkHeight * 0.5, tree.z);
    dummy.rotation.set(0, random() * TAU, 0);
    dummy.scale.set(tree.h / 20, trunkHeight, tree.h / 20);
    dummy.updateMatrix();
    trunks.setMatrixAt(i * 5, dummy.matrix);
    for (let branch = 0; branch < 4; branch++) {
      const angle = (branch * Math.PI) / 2 + i;
      const bx = Math.cos(angle) * tree.h * 0.2;
      const bz = Math.sin(angle) * tree.h * 0.2;
      branchDirection.set(bx, tree.h * 0.25, bz);
      dummy.position.set(
        tree.x + bx * 0.5,
        y + tree.h * 0.52,
        tree.z + bz * 0.5,
      );
      const branchLength = branchDirection.length();
      dummy.quaternion.setFromUnitVectors(
        up,
        branchDirection.divideScalar(branchLength),
      );
      dummy.scale.set(0.34, branchLength, 0.34);
      dummy.updateMatrix();
      trunks.setMatrixAt(i * 5 + branch + 1, dummy.matrix);
    }
    const crownRadius = tree.h * (tree.pine ? 0.37 : 0.33);
    for (let p = 0; p < 28; p++) {
      const angle = random() * TAU;
      const vertical = random() * 2 - 1;
      const radius = Math.sqrt(random()) * crownRadius;
      const ring = Math.sqrt(1 - vertical * vertical);
      dummy.position.set(
        tree.x + Math.cos(angle) * radius * ring,
        y + tree.h * 0.76 + vertical * crownRadius * (tree.pine ? 0.3 : 0.72),
        tree.z + Math.sin(angle) * radius * ring,
      );
      dummy.rotation.set(
        (random() - 0.5) * Math.PI,
        random() * TAU,
        random() * Math.PI,
      );
      const size = tree.h * (0.23 + random() * 0.12);
      dummy.scale.set(size, size * (tree.pine ? 0.7 : 1), size);
      dummy.updateMatrix();
      leavesByTint[tree.tint].setMatrixAt(counts[tree.tint]++, dummy.matrix);
    }
  });
  trunks.castShadow = trunks.receiveShadow = true;
  root.add(trunks);
  leavesByTint.forEach((mesh, i) => {
    mesh.count = counts[i];
    mesh.castShadow = true;
    root.add(mesh);
  });

  // Street furniture, hedges, lamps and flower borders share instanced meshes.
  const hedgeGeo = new THREE.BoxGeometry(1, 1, 1);
  const hedgeMat = new THREE.MeshStandardMaterial({
    color: 0x536536,
    roughness: 1,
  });
  const hedgeMesh = new THREE.InstancedMesh(hedgeGeo, hedgeMat, 80);
  let hedgeCount = 0;
  for (let i = 0; i < 40; i++) {
    const x = -165 + i * 8.4;
    const z = roadZ(x) - 6.2;
    if (
      buildingSites.some(
        (s) =>
          Math.abs(x - s.x) < s.width * 0.5 + 3 &&
          Math.abs(z - s.z) < s.depth * 0.5 + 3,
      )
    )
      continue;
    dummy.position.set(x, groundY(x, z) + 0.75, z);
    dummy.scale.set(3.4, 1.35, 0.8);
    dummy.rotation.set(0, -0.08 * Math.sin(x / 45), 0);
    dummy.updateMatrix();
    hedgeMesh.setMatrixAt(hedgeCount++, dummy.matrix);
  }
  hedgeMesh.count = hedgeCount;
  hedgeMesh.castShadow = true;
  root.add(hedgeMesh);

  const flowerGeo = new THREE.SphereGeometry(0.13, 5, 4);
  const flowerMat = new THREE.MeshStandardMaterial({
    color: 0xb66b58,
    roughness: 0.9,
  });
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 90);
  for (let i = 0; i < 90; i++) {
    const x = -160 + random() * 320;
    const z = roadZ(x) - 7.1 - random() * 1.2;
    dummy.position.set(x, groundY(x, z) + 0.42, z);
    dummy.scale.setScalar(0.75 + random() * 0.7);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
  }
  root.add(flowers);

  const fencePosts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16, 1.25, 0.16),
    curb,
    70,
  );
  const fenceRails = new THREE.InstancedMesh(
    new THREE.BoxGeometry(4.1, 0.12, 0.12),
    curb,
    34,
  );
  let postCount = 0;
  let railCount = 0;
  for (let i = 0; i < 35; i++) {
    const x = -166 + i * 9.5;
    const z = backRoad(x) - 4.2;
    if (
      buildingSites.some(
        (s) =>
          Math.abs(x - s.x) < s.width * 0.5 + 4 &&
          Math.abs(z - s.z) < s.depth * 0.5 + 4,
      )
    )
      continue;
    const y = groundY(x, z);
    for (const dx of [-2.05, 2.05]) {
      dummy.position.set(x + dx, y + 0.62, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      fencePosts.setMatrixAt(postCount++, dummy.matrix);
    }
    dummy.position.set(x, y + 0.82, z);
    dummy.updateMatrix();
    fenceRails.setMatrixAt(railCount++, dummy.matrix);
  }
  fencePosts.count = postCount;
  fenceRails.count = railCount;
  root.add(fencePosts, fenceRails);

  const lampPoleGeo = new THREE.CylinderGeometry(0.09, 0.14, 4.8, 7);
  const black = new THREE.MeshStandardMaterial({
    color: 0x171b19,
    roughness: 0.7,
    metalness: 0.35,
  });
  const poles = new THREE.InstancedMesh(lampPoleGeo, black, 24);
  const lampGlass = new THREE.MeshStandardMaterial({
    color: 0xffdca0,
    emissive: 0x8a5520,
    emissiveIntensity: 0.25,
    roughness: 0.4,
  });
  const globes = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.28, 8, 6),
    lampGlass,
    24,
  );
  for (let i = 0; i < 24; i++) {
    const x = -165 + i * 14.3;
    const z = roadZ(x) + 5.25;
    const y = groundY(x, z);
    dummy.position.set(x, y + 2.4, z);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + 4.75;
    dummy.updateMatrix();
    globes.setMatrixAt(i, dummy.matrix);
  }
  root.add(poles, globes);

  const benchGeo = new THREE.BoxGeometry(2.6, 0.18, 0.62);
  const benchMat = new THREE.MeshStandardMaterial({
    color: 0x725039,
    roughness: 0.85,
  });
  const benches = new THREE.InstancedMesh(benchGeo, benchMat, 9);
  const benchBacks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(2.6, 0.48, 0.12),
    benchMat,
    9,
  );
  const benchLegs = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.14, 0.63, 0.52),
    black,
    18,
  );
  for (let i = 0; i < 9; i++) {
    const x = -140 + i * 34;
    const z = roadZ(x) + 6.4;
    dummy.position.set(x, groundY(x, z) + 0.65, z);
    dummy.rotation.set(0, 0.05 * Math.sin(x), 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    benches.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, groundY(x, z) + 1.0, z - 0.29);
    dummy.updateMatrix();
    benchBacks.setMatrixAt(i, dummy.matrix);
    for (let side = 0; side < 2; side++) {
      dummy.position.set(x + (side === 0 ? -1 : 1), groundY(x, z) + 0.315, z);
      dummy.updateMatrix();
      benchLegs.setMatrixAt(i * 2 + side, dummy.matrix);
    }
  }
  root.add(benches, benchBacks, benchLegs);

  // Horizon-sized water: vertex displacement, depth-like horizon color, Fresnel and restrained glints.
  const waterUniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(0x276c78) },
    uShallow: { value: new THREE.Color(0x65aaa5) },
    uSky: { value: new THREE.Color(0x9bc4c6) },
    uSun: { value: new THREE.Vector3(0.35, 0.82, 0.44).normalize() },
  };
  const waterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    vertexShader: `uniform float uTime; varying vec3 vWorld; void main(){ vec3 p=position; p.y += .085*sin(p.x*.18+uTime*.7)+.05*sin(p.z*.24-uTime*.5); vWorld=(modelMatrix*vec4(p,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.); }`,
    fragmentShader: `
      uniform vec3 uDeep,uShallow,uSky,uSun;
      uniform float uTime;
      varying vec3 vWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 p=vWorld.xz;
        float t=uTime;
        float shore=24.+15.*cos((p.x+15.)/65.)+4.*sin(p.x/28.);
        float depth=p.y-shore;
        float ripple=sin(p.x*.7+p.y*.43+t*.8)*sin(p.y*.82-p.x*.25-t*.5);
        float small=noise(p*1.9+vec2(t*.23,0.));
        vec3 n=normalize(vec3(.065*sin(p.x*.38+p.y*.7+t*.8)+ripple*.045,1.,.05*cos(p.y*.54-p.x*.31+t*.6)+(small-.5)*.08));
        vec3 V=normalize(cameraPosition-vWorld);
        float fresnel=pow(1.-max(dot(n,V),0.),3.);
        float horizon=smoothstep(130.,700.,distance(cameraPosition.xz,p));
        vec3 base=mix(uShallow,uDeep,smoothstep(0.,90.,depth));
        base=mix(base,uSky,horizon*.65+fresnel*.35);
        base += (ripple*.012+(small-.5)*.025)*smoothstep(180.,25.,distance(cameraPosition.xz,p));
        float glint=pow(max(dot(n,normalize(V+uSun)),0.),180.);
        base+=vec3(1.,.89,.65)*glint*.65;
        float curl=sin(p.x*.37+t*.5)*.65+noise(p*.45)*1.6;
        float wave=sin(depth*1.75+curl-t*.85);
        float foam=smoothstep(.78,1.,wave)*smoothstep(10.,1.,depth)*smoothstep(.3,2.,depth);
        base=mix(base,vec3(.83,.88,.8),foam*.72);
        gl_FragColor=vec4(base,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthWrite: true,
  });
  const waterGeo = new THREE.PlaneGeometry(3000, 3000, 160, 160);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, -0.15, 350);
  root.add(water);

  // Distant headlands, sailboats and gulls give the bay scale.
  const headMat = new THREE.MeshBasicMaterial({
    color: 0x668580,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const headlands = new THREE.Group();
  [
    [-530, 670, 250, 48],
    [470, 820, 390, 67],
    [80, 1050, 540, 42],
  ].forEach(([x, z, sx, sy]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 8), headMat);
    m.position.set(x, -18, z);
    m.scale.set(sx, sy, 90);
    headlands.add(m);
  });
  root.add(headlands);
  const sailMat = new THREE.MeshBasicMaterial({
    color: 0xf0e7d1,
    side: THREE.DoubleSide,
  });
  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 0, 7, 0, 5, 0, 0], 3),
  );
  [
    [-85, 195, 0.8],
    [125, 285, 0.55],
  ].forEach(([x, z, s]) => {
    const boat = new THREE.Group();
    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.scale.setScalar(s);
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(7 * s, 0.7 * s, 1.7 * s),
      black,
    );
    boat.add(sail, hull);
    boat.position.set(x, 0.45, z);
    root.add(boat);
  });
  const gullMat = new THREE.MeshBasicMaterial({
    color: 0xf1f0e6,
    side: THREE.DoubleSide,
  });
  const gullGeo = new THREE.BufferGeometry();
  gullGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-1, 0, 0, 0, 0.25, 0, 1, 0, 0, 0, 0.25, 0, 0, -0.08, 0.25, -1, 0, 0],
      3,
    ),
  );
  const gulls = new THREE.InstancedMesh(gullGeo, gullMat, 8);
  const gullData = Array.from({ length: 8 }, (_, i) => ({
    r: 48 + random() * 70,
    speed: 0.025 + random() * 0.025,
    phase: (i / 8) * TAU,
    y: 18 + random() * 16,
    cx: -15 + random() * 45,
    cz: 105 + random() * 70,
  }));
  root.add(gulls);

  return {
    update(time: number) {
      waterUniforms.uTime.value = time;
      gullData.forEach((g, i) => {
        const a = g.phase + time * g.speed;
        dummy.position.set(
          g.cx + Math.cos(a) * g.r,
          g.y + Math.sin(a * 2) * 2,
          g.cz + Math.sin(a) * g.r * 0.45,
        );
        dummy.rotation.set(0, -a, Math.sin(time * 2 + i) * 0.08);
        dummy.scale.setScalar(1.1);
        dummy.updateMatrix();
        gulls.setMatrixAt(i, dummy.matrix);
      });
      gulls.instanceMatrix.needsUpdate = true;
      leafTime.value = time;
    },
    setMood(mood: Mood) {
      const palette =
        mood === "sunset"
          ? [0x356f77, 0x7fa39b, 0xd6a98b]
          : mood === "mist"
            ? [0x557b80, 0x86a8a5, 0xb6c5c3]
            : [0x276c78, 0x65aaa5, 0x9bc4c6];
      waterUniforms.uDeep.value.setHex(palette[0]);
      waterUniforms.uShallow.value.setHex(palette[1]);
      waterUniforms.uSky.value.setHex(palette[2]);
    },
  };
}
