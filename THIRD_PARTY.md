# Third-party components and artwork

- Three.js 0.180.0: MIT, copyright three.js authors. https://github.com/mrdoob/three.js
- ws 8.21.3: MIT, copyright Einar Otto Stangvik and contributors. https://github.com/websockets/ws

`public/vendor/GLTFLoader.js`, `BufferGeometryUtils.js`, and the modules under `public/vendor/effects/` are copied from Three.js 0.180.0, with local import paths. Their license is included in `public/vendor/LICENSE`. Keep the installed dependency licenses when redistributing packages.

## Photo textures

- Poly Haven Asphalt 03: https://polyhaven.com/a/asphalt_03
- Poly Haven Red Brick: https://polyhaven.com/a/red_brick
- License: **CC0**, https://polyhaven.com/license

The four 1K JPG files in `public/assets/` are the two assets' diffuse (`diff`) and OpenGL normal (`nor_gl`) photo-derived textures, downloaded from the official Poly Haven asset API/CDN on 28 September 2026. The same textures are imported into Unreal `.uasset` containers; the underlying artwork remains CC0. Attribution is not required by CC0; these links document provenance. All textures are served locally with no runtime CDN dependency.

The eight original cars, courier character and garden kiosk were built with this project's Blender Python scripts and exported to GLB and FBX. Custom car, city, avatar geometry and project code are MIT licensed. Blender and Unreal Engine are development tools and are not bundled. Unreal engine content is referenced by the review map rather than redistributed. No music, downloaded brand assets, or GTA content is included. Fonts use the device's system font stack.

Engine and road audio are synthesized by the original Web Audio code in `public/car-audio.mjs`. No downloaded engine samples or music are included. The fallback reflection texture, window textures and headlight pool are original procedural canvas assets generated at runtime.

## Street graphics update (0.8)

- [Poly Haven Venice Sunset](https://polyhaven.com/a/venice_sunset), Greg Zaal: `venice_sunset_1k.hdr`, used for environment lighting/reflections.
- [Poly Haven Concrete Wall 006](https://polyhaven.com/a/concrete_wall_006), Charlotte Baglioni and Dario Barresi: 1K diffuse and OpenGL normal JPGs, used on building plaster and paving.
- Both assets are [CC0](https://polyhaven.com/license). They are served locally. Exact official CDN URLs and SHA-256 digests are recorded in `art-source/street-texture-provenance.json`.

The v0.8 photo assets are used by the browser. The existing Unreal art-review map still contains the earlier four imported textures. Three.js postprocessing and HDR loader modules retain their MIT license in `public/vendor/LICENSE`. The bloom module's upstream name does not change the browser game's renderer to Unreal Engine.
