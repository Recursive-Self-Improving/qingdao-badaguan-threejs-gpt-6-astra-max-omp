# Project conventions

- This is a Vite + TypeScript + Three.js application. Use `npm run dev` for the live app and `npm run build` for TypeScript checking and production output.
- Scene geography and landmark data live in `src/world.ts`; architecture, landscape, navigation/rendering, and UI are separated into their existing modules.

## Lessons

- Installed versions: Three.js and its types 0.180.0, Vite 7.3.6, TypeScript 5.9.3, and Lucide 0.468.0. Keep the Three.js runtime and types aligned.
- The scene is an artistic interpretation of real Badaguan characteristics, not a surveyed reconstruction. Preserve this disclosure and the Wikimedia photograph attribution in the About dialog.
- World +Z faces the sea. Terrain, roads, furniture, and navigation must share `coastZ`, `groundY`, and `roadZ`; the boulevard curves north around Huashi Villa rather than crossing its footprint. Beach geometry must descend below water, otherwise its rectangular mesh edge becomes the visible shoreline.
- Use actual elapsed time for camera-flight duration and guided-tour progression. Capping that clock makes transitions stall on slow GPUs. Clamp only movement integration, and synchronize projected landmark and minimap positions every rendered frame.
- Static architectural meshes are batched by material; foliage, trunks, and street furniture are instanced. Leaf cards use Lambert lighting, and static shadow maps only need refreshing when lighting or quality changes.
- Verify the real WebGL surface, including touch press/release and short fullscreen viewports. Browser fullscreen can resize to 800×600; the short-screen toolbar must remain above the collapsed minimap. Verified responsive layouts include 1440×900, 390×844, and 375×667.
