import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createHuashiLou, createVilla } from "./architecture";
import { createLandscape, type LandscapeEnvironment } from "./landscape";
import { buildingSites, coastZ, groundY, landmarks, type Mood } from "./world";

interface Flight {
  from: THREE.Vector3;
  to: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
  walk: boolean;
}

export class BadaguanExperience {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(43, 1, 0.3, 1800);
  readonly controls: OrbitControls;
  readonly keys = new Set<string>();
  readonly clock = new THREE.Clock();
  readonly landscape: LandscapeEnvironment;
  readonly sun = new THREE.DirectionalLight(0xffebc8, 3.2);
  readonly ambient = new THREE.HemisphereLight(0xdbe8ea, 0x899271, 2.0);
  readonly skyUniforms = {
    top: { value: new THREE.Color("#a7c5d0") },
    horizon: { value: new THREE.Color("#eceddb") },
    sunlight: { value: new THREE.Color("#fff1cd") },
    sunDirection: { value: new THREE.Vector3(-0.55, 0.65, 0.52).normalize() },
    time: { value: 0 },
  };
  readonly sky: THREE.Mesh;
  readonly defaultPosition = new THREE.Vector3(108, 65, 135);
  readonly defaultTarget = new THREE.Vector3(-13, 8, -9);
  private flight: Flight | null = null;
  private walking = false;
  private tour = false;
  private tourTime = 0;
  private tourStop = -1;
  private yaw = 0;
  private pitch = 0;
  private dragging = false;
  private pointerId: number | null = null;
  private previousPointer = new THREE.Vector2();
  private direction = new THREE.Vector3();
  private right = new THREE.Vector3();
  private movement = new THREE.Vector3();
  private destination = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();
  private rotation = new THREE.Euler(0, 0, 0, "YXZ");
  private elapsed = 0;
  private frame = 0;
  private disposed = false;
  private animationId = 0;
  speed = 10;
  onFrame?: (camera: THREE.PerspectiveCamera, frame: number) => void;
  onModeChange?: (mode: "overview" | "walk" | "tour") => void;
  onTourStop?: (index: number) => void;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "八大关三维景观；拖动环顾，WASD 移动，Q E 升降",
    );
    container.appendChild(this.renderer.domElement);
    this.camera.position.copy(this.defaultPosition);
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 320;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minPolarAngle = 0.12;
    this.controls.rotateSpeed = 0.45;
    this.controls.panSpeed = 0.6;
    this.controls.update();
    this.controls.addEventListener("start", this.cancelTourOnInteraction);

    this.scene.fog = new THREE.FogExp2(0xd6e1d7, 0.0035);
    this.sun.position.set(-85, 140, 95);
    this.sun.target.position.set(0, 0, -35);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -180;
    this.sun.shadow.camera.right = 180;
    this.sun.shadow.camera.top = 170;
    this.sun.shadow.camera.bottom = -170;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 420;
    this.sun.shadow.bias = -0.00015;
    this.sun.shadow.normalBias = 0.35;
    this.sun.shadow.radius = 3;
    this.scene.add(this.ambient, this.sun, this.sun.target);

    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: `varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `
        uniform vec3 top,horizon,sunlight,sunDirection;
        uniform float time;
        varying vec3 vDirection;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(7.1,3.2);a*=.5;}return v;}
        void main(){
          vec3 d=normalize(vDirection);
          float y=max(d.y,0.);
          vec3 col=mix(horizon,top,pow(y,.48));
          float sunDot=max(dot(d,sunDirection),0.);
          col+=sunlight*(pow(sunDot,24.)*.14+pow(sunDot,950.)*.6);
          vec2 uv=d.xz/(max(d.y,.05)+.2)*2.;
          float cloud=fbm(uv+vec2(time*.0012,0.));
          cloud=smoothstep(.52,.76,cloud)*smoothstep(.01,.16,d.y);
          col=mix(col,horizon*1.035,cloud*.52);
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1100, 32, 20),
      skyMaterial,
    );
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    this.landscape = createLandscape(this.scene);

    // All architectural details are static: merge by material into a small set of draws.
    const buildings = new THREE.Group();
    for (let i = 0; i < buildingSites.length; i++) {
      const site = buildingSites[i];
      const model = i === 0 ? createHuashiLou() : createVilla(i - 1);
      model.position.set(site.x, groundY(site.x, site.z), site.z);
      model.rotation.y = site.rotation;
      buildings.add(model);
    }
    buildings.updateMatrixWorld(true);
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    buildings.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material))
        return;
      const geometry = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      geometry.applyMatrix4(object.matrixWorld);
      for (const name of Object.keys(geometry.attributes)) {
        if (!["position", "normal", "uv"].includes(name))
          geometry.deleteAttribute(name);
      }
      if (!geometry.hasAttribute("uv"))
        geometry.setAttribute(
          "uv",
          new THREE.BufferAttribute(
            new Float32Array(geometry.getAttribute("position").count * 2),
            2,
          ),
        );
      const list = batches.get(object.material);
      if (list) list.push(geometry);
      else batches.set(object.material, [geometry]);
    });
    const originals = new Set<THREE.BufferGeometry>();
    buildings.traverse((object) => {
      if (object instanceof THREE.Mesh) originals.add(object.geometry);
    });
    for (const geometry of originals) geometry.dispose();
    for (const [material, geometries] of batches) {
      const merged = mergeGeometries(geometries);
      if (!merged) throw new Error("Unable to merge architecture geometry.");
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.name = "Batched Badaguan architecture";
      this.scene.add(mesh);
      for (const geometry of geometries) geometry.dispose();
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.clearInput);
    document.addEventListener("visibilitychange", this.visibilityChange);
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.pointerDown);
    canvas.addEventListener("pointermove", this.pointerMove);
    canvas.addEventListener("pointerup", this.pointerUp);
    canvas.addEventListener("pointercancel", this.pointerUp);
    canvas.addEventListener("wheel", this.wheel, { passive: false });
    this.animate();
  }

  private resize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.fov = width < 640 ? 55 : 43;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private cancelTourOnInteraction = () => {
    if (this.flight) {
      const walk = this.flight.walk;
      this.flight = null;
      this.setWalking(walk);
    }
    if (this.tour) this.stopTour();
  };

  private keyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement ||
      document.querySelector("dialog[open]")
    )
      return;
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "KeyQ",
        "KeyE",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ShiftLeft",
        "ShiftRight",
      ].includes(event.code)
    ) {
      event.preventDefault();
      this.cancelTourOnInteraction();
      this.keys.add(event.code);
    }
  };
  private keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };
  private clearInput = () => {
    this.keys.clear();
    this.dragging = false;
    this.pointerId = null;
  };
  private visibilityChange = () => {
    this.clearInput();
    this.clock.getDelta();
  };
  private pointerDown = (event: PointerEvent) => {
    if (!this.walking || event.button !== 0 || this.pointerId !== null) return;
    this.flight = null;
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.previousPointer.set(event.clientX, event.clientY);
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };
  private pointerMove = (event: PointerEvent) => {
    if (!this.walking || !this.dragging || this.pointerId !== event.pointerId)
      return;
    this.yaw -= (event.clientX - this.previousPointer.x) * 0.003;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - (event.clientY - this.previousPointer.y) * 0.003,
      -1.35,
      1.35,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    this.previousPointer.set(event.clientX, event.clientY);
  };
  private pointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.pointerId = null;
    if (this.renderer.domElement.hasPointerCapture(event.pointerId))
      this.renderer.domElement.releasePointerCapture(event.pointerId);
  };
  private wheel = (event: WheelEvent) => {
    if (!this.walking) return;
    event.preventDefault();
    this.flight = null;
    this.camera.getWorldDirection(this.direction);
    this.destination
      .copy(this.camera.position)
      .addScaledVector(this.direction, -Math.sign(event.deltaY) * 2.5);
    this.moveCamera(this.destination);
  };

  private moveCamera(next: THREE.Vector3) {
    next.x = THREE.MathUtils.clamp(next.x, -174, 174);
    next.z = THREE.MathUtils.clamp(next.z, -174, 260);
    const floor =
      next.z > coastZ(next.x) - 12 ? 1.8 : groundY(next.x, next.z) + 1.8;
    next.y = THREE.MathUtils.clamp(next.y, floor, 160);
    for (let i = 0; i < buildingSites.length; i++) {
      const site = buildingSites[i];
      const dx = next.x - site.x;
      const dz = next.z - site.z;
      const localX =
        dx * Math.cos(site.rotation) - dz * Math.sin(site.rotation);
      const localZ =
        dx * Math.sin(site.rotation) + dz * Math.cos(site.rotation);
      if (
        Math.abs(localX) < site.width / 2 + 1 &&
        Math.abs(localZ) < site.depth / 2 + 1 &&
        next.y < groundY(site.x, site.z) + (i === 0 ? 27 : 21)
      )
        return;
    }
    if (!this.walking)
      this.controls.target.add(
        this.movement.subVectors(next, this.camera.position),
      );
    this.camera.position.copy(next);
  }

  private setWalking(enabled: boolean) {
    this.walking = enabled;
    this.controls.enabled = !enabled;
    if (enabled) {
      this.rotation.setFromQuaternion(this.camera.quaternion, "YXZ");
      this.yaw = this.rotation.y;
      this.pitch = this.rotation.x;
    }
    this.onModeChange?.(enabled ? "walk" : "overview");
  }

  flyTo(position: readonly number[], target: readonly number[], walk = false) {
    this.tour = false;
    this.keys.clear();
    this.walking = false;
    this.controls.enabled = false;
    this.camera.getWorldDirection(this.direction);
    const fromTarget = this.camera.position
      .clone()
      .addScaledVector(
        this.direction,
        this.camera.position.distanceTo(new THREE.Vector3(...target)),
      );
    this.flight = {
      from: this.camera.position.clone(),
      to: new THREE.Vector3(...position),
      fromTarget,
      toTarget: new THREE.Vector3(...target),
      elapsed: 0,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0.1
        : 2.2,
      walk,
    };
  }

  visit(index: number) {
    const place = landmarks[index];
    this.flyTo(place.camera, place.target);
    this.onModeChange?.("overview");
  }

  startWalk() {
    const x = 64;
    const z = 30;
    this.flyTo([x, groundY(x, z) + 1.8, z], [23, 12, 22], true);
    this.onModeChange?.("walk");
  }

  overview() {
    this.flyTo(this.defaultPosition.toArray(), this.defaultTarget.toArray());
    this.onModeChange?.("overview");
  }

  startTour() {
    this.flight = null;
    this.keys.clear();
    this.walking = false;
    this.tour = true;
    this.tourTime = 0;
    this.tourStop = -1;
    this.controls.enabled = true;
    this.onModeChange?.("tour");
  }

  stopTour() {
    this.tour = false;
    this.controls.enabled = true;
    this.onModeChange?.("overview");
  }

  setMood(mood: Mood) {
    const palettes = {
      afternoon: {
        top: "#a7c5d0",
        horizon: "#eceddb",
        fog: "#d6e1d7",
        density: 0.0035,
        sun: "#ffebc8",
        intensity: 3.2,
        ambient: 2,
        exposure: 1.08,
        position: [-85, 140, 95],
      },
      sunset: {
        top: "#929fae",
        horizon: "#f6cba3",
        fog: "#d1b79d",
        density: 0.0042,
        sun: "#ffb877",
        intensity: 3.9,
        ambient: 1.15,
        exposure: 1.02,
        position: [-130, 45, 60],
      },
      mist: {
        top: "#bbcdcc",
        horizon: "#e2e5de",
        fog: "#d2ded7",
        density: 0.0095,
        sun: "#e6efdf",
        intensity: 1.3,
        ambient: 2.5,
        exposure: 1.1,
        position: [-65, 110, 95],
      },
    };
    const palette = palettes[mood];
    this.skyUniforms.top.value.set(palette.top);
    this.skyUniforms.horizon.value.set(palette.horizon);
    this.sun.color.set(palette.sun);
    this.sun.intensity = palette.intensity;
    this.sun.position.fromArray(palette.position);
    this.skyUniforms.sunDirection.value.copy(this.sun.position).normalize();
    this.ambient.intensity = palette.ambient;
    (this.scene.fog as THREE.FogExp2).color.set(palette.fog);
    (this.scene.fog as THREE.FogExp2).density = palette.density;
    this.renderer.toneMappingExposure = palette.exposure;
    this.renderer.shadowMap.needsUpdate = true;
    this.landscape.setMood(mood);
  }

  setQuality(high: boolean) {
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, high ? 1.65 : 1),
    );
    this.renderer.shadowMap.enabled = high;
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) material.needsUpdate = true;
      }
    });
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
  }

  capture() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }

  captureLandmark(index: number) {
    const place = landmarks[index];
    const camera = this.camera.clone();
    camera.position.fromArray(place.camera);
    camera.lookAt(new THREE.Vector3(...place.target));
    this.renderer.render(this.scene, camera);
    const image = this.renderer.domElement.toDataURL("image/jpeg", 0.78);
    this.renderer.render(this.scene, this.camera);
    return image;
  }

  private animate = () => {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(this.animate);
    const elapsedDelta = this.clock.getDelta();
    const delta = Math.min(elapsedDelta, 0.25);
    if (document.hidden) return;
    this.elapsed += elapsedDelta;
    if (this.flight) {
      const flight = this.flight;
      flight.elapsed += elapsedDelta;
      const t = Math.min(flight.elapsed / flight.duration, 1);
      const smooth = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(flight.from, flight.to, smooth);
      this.controls.target.lerpVectors(
        flight.fromTarget,
        flight.toTarget,
        smooth,
      );
      this.camera.lookAt(this.controls.target);
      if (t >= 1) {
        this.flight = null;
        this.setWalking(flight.walk);
      }
    } else if (this.tour) {
      this.tourTime += elapsedDelta;
      const segment = Math.floor(this.tourTime / 13) % landmarks.length;
      if (this.tourStop !== segment) {
        this.tourStop = segment;
        this.onTourStop?.(segment);
      }
      const place = landmarks[segment];
      const phase = (this.tourTime % 13) / 13;
      this.destination.fromArray(place.camera);
      this.destination.x += Math.sin(phase * Math.PI * 0.8) * 12;
      this.destination.y += 4;
      this.lookTarget.fromArray(place.target);
      this.camera.position.lerp(this.destination, 1 - Math.exp(-delta * 0.6));
      this.controls.target.lerp(this.lookTarget, 1 - Math.exp(-delta * 0.8));
      this.camera.lookAt(this.controls.target);
    } else if (this.keys.size) {
      this.camera.getWorldDirection(this.direction);
      this.direction.y = 0;
      this.direction.normalize();
      this.right.crossVectors(this.direction, this.camera.up).normalize();
      this.movement.set(0, 0, 0);
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp"))
        this.movement.add(this.direction);
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown"))
        this.movement.sub(this.direction);
      if (this.keys.has("KeyD")) this.movement.add(this.right);
      if (this.keys.has("KeyA")) this.movement.sub(this.right);
      if (this.keys.has("KeyE")) this.movement.y += 1;
      if (this.keys.has("KeyQ")) this.movement.y -= 1;
      const fast = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
      const speed = this.speed * (fast ? 2.8 : 1) * (!this.walking ? 2 : 1);
      this.destination
        .copy(this.camera.position)
        .addScaledVector(this.movement.normalize(), delta * speed);
      this.moveCamera(this.destination);
      const turn =
        (Number(this.keys.has("ArrowLeft")) -
          Number(this.keys.has("ArrowRight"))) *
        delta;
      if (turn && this.walking) {
        this.yaw += turn;
        this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
      } else if (turn) {
        this.direction
          .subVectors(this.controls.target, this.camera.position)
          .applyAxisAngle(this.camera.up, turn);
        this.controls.target.copy(this.camera.position).add(this.direction);
      }
    }
    if (!this.walking && !this.flight && !this.tour) this.controls.update();
    this.sky.position.copy(this.camera.position);
    this.skyUniforms.time.value = this.elapsed;
    this.landscape.update(this.elapsed);
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.(this.camera, this.frame++);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.clearInput);
    document.removeEventListener("visibilitychange", this.visibilityChange);
    this.controls.dispose();
    const materials = new Set<THREE.Material>();
    const geometries = new Set<THREE.BufferGeometry>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material])
          materials.add(material);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    const textures = new Set<THREE.Texture>();
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
    for (const texture of textures) texture.dispose();
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
