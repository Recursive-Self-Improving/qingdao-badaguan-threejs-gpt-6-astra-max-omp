import "./style.css";
import * as THREE from "three";
import {
  createIcons,
  ArrowUpRight,
  ArrowRight,
  VolumeX,
  Volume2,
  SlidersHorizontal,
  Sun,
  Sunset,
  CloudFog,
  Compass,
  MapPin,
  RotateCcw,
  Camera,
  Maximize,
  Minimize,
  CircleHelp,
  Footprints,
  Play,
  Pause,
  Map,
  Expand,
  Shrink,
  Mouse,
  MoveVertical,
  X,
  Info,
  Landmark,
  Trees,
  Waves,
  MousePointer2,
  Hand,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
  RotateCw,
} from "lucide";
import { BadaguanExperience } from "./experience";
import { landmarks, type Mood } from "./world";

const iconSet = {
  ArrowUpRight,
  ArrowRight,
  VolumeX,
  Volume2,
  SlidersHorizontal,
  Sun,
  Sunset,
  CloudFog,
  Compass,
  MapPin,
  RotateCcw,
  Camera,
  Maximize,
  Minimize,
  CircleHelp,
  Footprints,
  Play,
  Pause,
  Map,
  Expand,
  Shrink,
  Mouse,
  MoveVertical,
  X,
  Info,
  Landmark,
  Trees,
  Waves,
  MousePointer2,
  Hand,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Monitor,
  RotateCw,
};
const app = document.querySelector<HTMLElement>("#app")!;
const sceneHost = document.querySelector<HTMLElement>("#scene")!;
const placeImage = document.querySelector<HTMLImageElement>(".place-image")!;
const toast = document.querySelector<HTMLElement>("#toast")!;
const explorePanel = document.querySelector<HTMLElement>("#explore-panel")!;
const settingsPanel = document.querySelector<HTMLElement>("#settings-panel")!;
const aboutDialog = document.querySelector<HTMLDialogElement>("#about-dialog")!;
const helpDialog = document.querySelector<HTMLDialogElement>("#help-dialog")!;
const mapPlayer = document.querySelector<SVGGElement>("#map-player")!;
const mapPanel = document.querySelector<HTMLElement>("#mini-map")!;
const sceneLabels = document.querySelector<HTMLElement>("#landmark-labels")!;
let experience: BadaguanExperience;
let selectedPlace = 0;
let showLabels = true;
let mode: "overview" | "walk" | "tour" = "overview";
let toastTimer = 0;
let soundEnabled = false;
let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let surfSource: AudioBufferSourceNode | null = null;
let surfLfo: OscillatorNode | null = null;
const thumbnails: string[] = ["/huashi.webp"];

function showToast(message: string) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3600);
}

function closePanels() {
  explorePanel.hidden = true;
  settingsPanel.hidden = true;
  app.classList.remove("exploring");
  document
    .querySelector("#settings-button")!
    .setAttribute("aria-expanded", "false");
  for (const button of document.querySelectorAll(".nav-link"))
    button.classList.toggle("active", button.id === "nav-roam");
}

function updateMode(nextMode: "overview" | "walk" | "tour") {
  mode = nextMode;
  app.classList.toggle("roaming", mode === "walk");
  app.classList.toggle("touring", mode === "tour");
  document.querySelector<HTMLElement>("#roam-status")!.hidden =
    mode === "overview";
  document.querySelector("#roam-status-text")!.textContent =
    mode === "tour" ? "随海风，自动游览中" : "自由漫游中";
  const tourButton = document.querySelector<HTMLButtonElement>("#tour-button")!;
  tourButton.innerHTML = `<i data-lucide="${mode === "tour" ? "pause" : "play"}"></i><span>${mode === "tour" ? "暂停游览" : "自动游览"}</span>`;
  tourButton.setAttribute("aria-pressed", String(mode === "tour"));
  tourButton.classList.toggle("active", mode === "tour");
  const freeButton = document.querySelector("#free-view")!;
  freeButton.classList.toggle("active", mode !== "tour");
  freeButton.setAttribute("aria-pressed", String(mode !== "tour"));
  createIcons({ icons: iconSet });
}

function selectPlace(index: number, fly = true) {
  selectedPlace = index;
  const place = landmarks[index];
  document.querySelector("#place-name")!.textContent = place.name;
  document.querySelector("#place-english")!.textContent = place.english;
  document.querySelector("#place-subtitle")!.textContent = place.subtitle;
  document.querySelector("#place-category")!.textContent = place.category;
  document.querySelector("#place-index")!.textContent = String(
    index + 1,
  ).padStart(2, "0");
  document.querySelector("#explore-detail")!.textContent = place.description;
  for (const [i, dot] of [
    ...document.querySelectorAll(".place-dots b"),
  ].entries())
    dot.classList.toggle("active", i === index);
  for (const [i, item] of [
    ...document.querySelectorAll(".explore-item"),
  ].entries())
    item.classList.toggle("active", i === index);
  if (experience && !thumbnails[index])
    thumbnails[index] = experience.captureLandmark(index);
  placeImage.src = thumbnails[index];
  placeImage.alt =
    index === 0
      ? "八大关花石楼的真实建筑风貌"
      : `${place.name}的三维艺术化景观`;
  if (fly) {
    experience.visit(index);
    showToast(`正在前往 · ${place.name}`);
  }
}

function openExplore() {
  closePanels();
  explorePanel.hidden = false;
  app.classList.add("exploring");
  experience.keys.clear();
  document.querySelector("#nav-roam")!.classList.remove("active");
  document.querySelector("#nav-landmarks")!.classList.add("active");
  document.querySelector("#explore-detail")!.textContent =
    landmarks[selectedPlace].description;
}

async function toggleSound() {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
      const sampleRate = audioContext.sampleRate;
      const length = sampleRate * 12;
      const buffer = audioContext.createBuffer(2, length, sampleRate);
      let seed = 23811;
      for (let channel = 0; channel < 2; channel++) {
        const samples = buffer.getChannelData(channel);
        let brown = 0;
        for (let i = 0; i < length; i++) {
          seed = (seed * 16807) % 2147483647;
          const white = (seed / 2147483647) * 2 - 1;
          brown = (brown + white * 0.025) / 1.025;
          samples[i] = brown * 2.8;
        }
        const fade = 2000;
        for (let i = 0; i < fade; i++) {
          const factor = i / fade;
          samples[i] *= factor;
          samples[length - 1 - i] *= factor;
        }
      }
      surfSource = audioContext.createBufferSource();
      surfSource.buffer = buffer;
      surfSource.loop = true;
      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1100;
      const waveGain = audioContext.createGain();
      waveGain.gain.value = 0.65;
      surfLfo = audioContext.createOscillator();
      surfLfo.frequency.value = 0.09;
      const modulation = audioContext.createGain();
      modulation.gain.value = 0.28;
      surfLfo.connect(modulation).connect(waveGain.gain);
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0;
      surfSource
        .connect(filter)
        .connect(waveGain)
        .connect(masterGain)
        .connect(audioContext.destination);
      surfSource.start();
      surfLfo.start();
    }
    await audioContext.resume();
    soundEnabled = !soundEnabled;
    const volume =
      Number(document.querySelector<HTMLInputElement>("#sound-range")!.value) /
      100;
    masterGain!.gain.setTargetAtTime(
      soundEnabled ? volume : 0,
      audioContext.currentTime,
      0.35,
    );
    const button = document.querySelector<HTMLButtonElement>("#sound-button")!;
    button.innerHTML = `<i data-lucide="${soundEnabled ? "volume-2" : "volume-x"}"></i>`;
    button.setAttribute("aria-pressed", String(soundEnabled));
    button.setAttribute(
      "aria-label",
      soundEnabled ? "关闭海浪环境音" : "开启海浪环境音",
    );
    button.title = soundEnabled ? "关闭海浪环境音" : "开启海浪环境音";
    createIcons({ icons: iconSet });
    showToast(soundEnabled ? "海浪声已开启 · 听见海的呼吸" : "海浪声已关闭");
  } catch {
    showToast("浏览器暂时无法播放声音，请检查音频权限。");
  }
}

function initialize() {
  createIcons({ icons: iconSet });
  try {
    experience = new BadaguanExperience(sceneHost);
  } catch (error) {
    console.error("Badaguan scene could not start:", error);
    document.querySelector<HTMLElement>("#loading-screen")!.hidden = true;
    document.querySelector<HTMLElement>("#render-error")!.hidden = false;
    return;
  }
  experience.onModeChange = updateMode;
  experience.onTourStop = (index) => selectPlace(index, false);
  const labels = landmarks.map((place, index) => {
    const button = document.createElement("button");
    button.className = "landmark-label";
    button.innerHTML = `<i data-lucide="${index === 2 ? "trees" : index === 3 ? "waves" : "landmark"}"></i><span>${place.name}</span><span>↗</span>`;
    button.setAttribute("aria-label", `前往${place.name}`);
    button.addEventListener("click", () => selectPlace(index));
    sceneLabels.appendChild(button);
    return {
      element: button,
      position: new THREE.Vector3(...place.position),
      projected: new THREE.Vector3(),
    };
  });
  const facing = new THREE.Vector3();
  experience.onFrame = (camera) => {
    const width = sceneHost.clientWidth;
    const height = sceneHost.clientHeight;
    for (const [index, label] of labels.entries()) {
      label.projected.copy(label.position).project(camera);
      const x = (label.projected.x * 0.5 + 0.5) * width;
      const y = (-label.projected.y * 0.5 + 0.5) * height - 38;
      const smallScreen = width < 640;
      const underIntro =
        mode === "overview" &&
        !app.classList.contains("exploring") &&
        x < (smallScreen ? 310 : 410);
      const visible =
        showLabels &&
        !underIntro &&
        label.projected.z < 1 &&
        label.projected.z > -1 &&
        x > 35 &&
        x < width - 35 &&
        y > 103 &&
        y < height - 160 &&
        (!smallScreen || index === selectedPlace);
      label.element.hidden = !visible;
      if (visible) {
        label.element.style.left = `${x}px`;
        label.element.style.top = `${y}px`;
      }
    }
    camera.getWorldDirection(facing);
    const x = THREE.MathUtils.clamp(camera.position.x * 1.205 + 130, 10, 246);
    const y = THREE.MathUtils.clamp(camera.position.z * 0.833 + 82.67, 10, 145);
    const angle = (Math.atan2(facing.x, -facing.z) * 180) / Math.PI;
    mapPlayer.setAttribute(
      "transform",
      `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`,
    );
  };
  const exploreList = document.querySelector("#explore-list")!;
  for (const [index, place] of landmarks.entries()) {
    const button = document.createElement("button");
    button.className = `explore-item${index === 0 ? " active" : ""}`;
    button.innerHTML = `<span class="explore-number">0${index + 1}</span><div><strong>${place.name}</strong><small>${place.english}</small></div><i data-lucide="arrow-up-right"></i>`;
    button.addEventListener("click", () => {
      selectPlace(index);
      if (innerWidth < 640) closePanels();
    });
    exploreList.appendChild(button);
  }
  document.querySelector("#start-button")!.addEventListener("click", () => {
    closePanels();
    experience.startWalk();
    showToast("WASD 移动 · 拖动环顾 · Q / E 升降");
  });
  document
    .querySelector("#discover-button")!
    .addEventListener("click", openExplore);
  document.querySelector("#nav-landmarks")!.addEventListener("click", () => {
    if (explorePanel.hidden) openExplore();
    else closePanels();
  });
  document.querySelector("#nav-roam")!.addEventListener("click", () => {
    closePanels();
    experience.overview();
  });
  document.querySelector("#home-link")!.addEventListener("click", (event) => {
    event.preventDefault();
    closePanels();
    experience.overview();
  });
  document.querySelector("#nav-about")!.addEventListener("click", () => {
    experience.keys.clear();
    aboutDialog.showModal();
  });
  document
    .querySelector("#place-next")!
    .addEventListener("click", () =>
      selectPlace((selectedPlace + 1) % landmarks.length),
    );
  document.querySelector("#place-detail")!.addEventListener("click", () => {
    selectPlace(selectedPlace);
    openExplore();
  });
  document.querySelector("#reset-button")!.addEventListener("click", () => {
    closePanels();
    experience.overview();
    showToast("已回到山海全景");
  });
  document
    .querySelector("#exit-roam")!
    .addEventListener("click", () => experience.overview());
  document.querySelector("#free-view")!.addEventListener("click", () => {
    closePanels();
    if (mode === "tour") experience.stopTour();
    else experience.startWalk();
  });
  document.querySelector("#tour-button")!.addEventListener("click", () => {
    closePanels();
    if (mode === "tour") {
      experience.stopTour();
      showToast("游览已暂停，拖动继续探索");
    } else {
      experience.startTour();
      showToast("跟随镜头，慢游四处风景 · 拖动可暂停");
    }
  });
  document
    .querySelector("#toggle-labels")!
    .addEventListener("click", (event) => {
      showLabels = !showLabels;
      const button = event.currentTarget as HTMLButtonElement;
      button.setAttribute("aria-pressed", String(showLabels));
      button.setAttribute(
        "aria-label",
        showLabels ? "隐藏地标标签" : "显示地标标签",
      );
      showToast(showLabels ? "地标已显示" : "地标已隐藏 · 只留风景");
    });
  document
    .querySelector("#sound-button")!
    .addEventListener("click", toggleSound);
  document.querySelector("#settings-button")!.addEventListener("click", () => {
    const shouldOpen = settingsPanel.hidden;
    closePanels();
    settingsPanel.hidden = !shouldOpen;
    document
      .querySelector("#settings-button")!
      .setAttribute("aria-expanded", String(shouldOpen));
  });
  document
    .querySelector("#quality-select")!
    .addEventListener("change", (event) => {
      experience.setQuality(
        (event.target as HTMLSelectElement).value === "high",
      );
      showToast("画面质量已更新");
    });
  document.querySelector("#speed-range")!.addEventListener("input", (event) => {
    experience.speed = Number((event.target as HTMLInputElement).value);
  });
  document.querySelector("#sound-range")!.addEventListener("input", (event) => {
    if (audioContext && masterGain && soundEnabled)
      masterGain.gain.setTargetAtTime(
        Number((event.target as HTMLInputElement).value) / 100,
        audioContext.currentTime,
        0.1,
      );
  });
  document.querySelector("#expand-map")!.addEventListener("click", (event) => {
    const expanded = mapPanel.classList.toggle("expanded");
    const button = event.currentTarget as HTMLButtonElement;
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute(
      "aria-label",
      expanded ? "收起漫游地图" : "展开漫游地图",
    );
    button.innerHTML = `<i data-lucide="${expanded ? "shrink" : "expand"}"></i>`;
    createIcons({ icons: iconSet });
  });
  for (const spot of document.querySelectorAll<SVGElement>(".map-spot")) {
    const go = () => {
      selectPlace(Number(spot.dataset.place));
      if (mapPanel.classList.contains("expanded"))
        (document.querySelector("#expand-map") as HTMLButtonElement).click();
    };
    spot.addEventListener("click", go);
    spot.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        go();
      }
    });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(".mood")) {
    button.addEventListener("click", () => {
      const mood = button.dataset.mood as Mood;
      experience.setMood(mood);
      const info = {
        afternoon: ["晴朗午后", "微风拂面，光影正好", "16:30", "sun"],
        sunset: ["落日余温", "把今天，交给晚霞", "18:20", "sunset"],
        mist: ["海雾清晨", "山海之间，轻盈呼吸", "07:00", "cloud-fog"],
      }[mood];
      document.querySelector("#weather-title")!.textContent = info[0];
      document.querySelector("#weather-description")!.textContent = info[1];
      document.querySelector("#scene-time")!.textContent = info[2];
      document.querySelector("#weather-icon")!.innerHTML =
        `<i data-lucide="${info[3]}"></i>`;
      for (const option of document.querySelectorAll(".mood")) {
        option.classList.toggle("active", option === button);
        option.setAttribute("aria-pressed", String(option === button));
      }
      app.dataset.mood = mood;
      thumbnails.splice(1);
      createIcons({ icons: iconSet });
      showToast(`氛围已切换 · ${info[0]}`);
    });
  }
  const helpButtons = ["#help-button", "#footer-help"];
  for (const selector of helpButtons)
    document.querySelector(selector)!.addEventListener("click", () => {
      experience.keys.clear();
      helpDialog.showModal();
    });
  document.querySelector("#help-start")!.addEventListener("click", () => {
    helpDialog.close();
    closePanels();
    experience.startWalk();
  });
  for (const dialog of [aboutDialog, helpDialog]) {
    dialog
      .querySelector(".dialog-close")!
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-close]",
  ))
    button.addEventListener("click", closePanels);
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Escape" || document.querySelector("dialog[open]"))
      return;
    closePanels();
    if (mode !== "overview") experience.overview();
    if (mapPanel.classList.contains("expanded"))
      (document.querySelector("#expand-map") as HTMLButtonElement).click();
  });
  document.querySelector("#photo-button")!.addEventListener("click", () => {
    try {
      const anchor = document.createElement("a");
      anchor.href = experience.capture();
      anchor.download = `八大关-${landmarks[selectedPlace].name}-${app.dataset.mood || "afternoon"}.png`;
      anchor.click();
      showToast("风景已定格 · 照片已保存");
    } catch {
      showToast("照片暂时无法保存，请重试。");
    }
  });
  document
    .querySelector("#fullscreen-button")!
    .addEventListener("click", async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (app.requestFullscreen) await app.requestFullscreen();
        else showToast("此浏览器不支持全屏，请横屏欣赏。");
      } catch {
        showToast("浏览器暂未允许全屏，当前窗口仍可自由漫游。");
      }
    });
  document.addEventListener("fullscreenchange", () => {
    const button = document.querySelector("#fullscreen-button")!;
    button.innerHTML = `<i data-lucide="${document.fullscreenElement ? "minimize" : "maximize"}"></i>`;
    button.setAttribute(
      "aria-label",
      document.fullscreenElement ? "退出全屏" : "全屏欣赏",
    );
    createIcons({ icons: iconSet });
  });
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    ".touch-controls button",
  )) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      experience.keys.add(button.dataset.key!);
      button.classList.add("pressed");
    });
    const release = () => {
      experience.keys.delete(button.dataset.key!);
      button.classList.remove("pressed");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }
  const loading = document.querySelector<HTMLElement>("#loading-screen")!;
  requestAnimationFrame(() => {
    loading.classList.add("loaded");
    window.setTimeout(() => {
      loading.hidden = true;
    }, 850);
  });
  createIcons({ icons: iconSet });
  sceneHost.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      showToast("图形连接中断，刷新页面即可重新进入。");
    },
    true,
  );
  window.addEventListener("pagehide", () => {
    experience.keys.clear();
    if (audioContext) void audioContext.suspend();
  });
  window.addEventListener("pageshow", () => {
    if (audioContext && soundEnabled) void audioContext.resume();
  });
}

document
  .querySelector("#retry-button")!
  .addEventListener("click", () => location.reload());
requestAnimationFrame(initialize);
