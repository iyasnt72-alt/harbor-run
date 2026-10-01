# Harbor Run — Sunset Streets

A 3D multiplayer browser prototype for up to eight friends per room. Explore South Quay, find eight shared cars around the city, race on foot, hunt stars, deliver parcels, and hang out with text and optional voice chat.

## New in Street Detail (0.8)

- **Deeper city facades:** weathered photo-based plaster, framed reflective windows, curtains, floor ledges, selected balconies and air conditioners, downpipes, ground-floor glazing and original storefront signs facing the avenues.
- **Streets and landscape:** pavement joints, road repair patches, manhole detail, curved palm trunks with feathered leaves, fuller tree crowns, layered mountain ridges and finer animated water ripples.
- **Lighting:** locally served sunset HDR reflections, retuned sun/sky light, sharper 2048px High shadows, half-resolution ambient occlusion and subtle bloom. High/desktop Auto use multisampled HDR rendering and filmic tone mapping; Low and mobile Auto use direct rendering. Shadow maps update once per frame rather than once per effect pass.
- **Camera:** a lower, closer third-person street view. Other players keep name labels; your own label is omitted to keep the view clear.
- **Quality controls:** Crew → Graphics cycles High → Auto → Low. The selection is saved on this device. New desktop sessions default to High; coarse-pointer devices default to Auto. All profiles retain the new scenery and materials. Auto omits ambient occlusion and uses 1024px shadows on desktop; Low turns off the effect buffers and moving shadows. High costs more GPU time: use Auto or Low if movement is not smooth.

This update improves the original browser game's classic coastal-city art direction. It is not a GTA asset pack or a native Unreal gameplay port.

## New in City Fleet (0.7)

Eight original cars now spawn across all five districts. Each car has one seat, so all eight players in a full room can drive simultaneously. The **Play → Pick your ride** garage shows current district, distance, availability and engine character. Colored squares on the map show their live positions; these are starting locations, and cars stay where players leave them until the room resets.

| Car | Starting location | Engine character |
|---|---|---|
| Quay Coupe | Civic Center | Warm growl |
| Comet Sport | Civic Center | Turbo rasp, gear-shift dip and throttle-release hiss |
| Sunbeam Taxi | Civic Center | Soft hum |
| Coast SUV | Civic Center | Diesel rumble |
| Palm Roadster | Palm Gardens, eastern avenue (104, 78) | High-rev bark |
| Old Town Hatch | Old Town, western avenue (-104, 78) | Compact buzz |
| Mariner Van | Mariner Quarter service road (-104, -130) | Heavy diesel |
| Harbor Wagon | South Quay waterfront road (52, -170) | Smooth low note |

The four new Blender models have distinct silhouettes: open-top roadster, short hatchback, high-roof cargo van and long-roof wagon. All include rotating wheels, steering pivots, reflective materials and lights. Every car supports parcel delivery and taxi work, with different acceleration and handling.

Engine audio now uses a different harmonic waveform per car, layered bass, intake/road noise and speed-dependent transmission tones instead of a shared sawtooth tone. Original procedural audio is synthesized locally; it is stylized, not a recording of a real vehicle. **Crew → engine preview buttons** play a short idle/rev/coast demonstration without moving your car. Previews temporarily replace driving sound, honor mute/volume, and stop when the tab is hidden. Microphone controls remain separate.

## New in Driving Edition (0.6)

- **Four drivable cars:** Quay Coupe, Comet Sport, Sunbeam Taxi and Coast SUV. Each has a distinct original Blender model and handling. Four friends can drive at once; each car currently seats one driver. Up to eight players still share a room.
- **Shared garage:** Play shows car names, colors, distances and occupied status. Walk within five metres and use **E / CAR** to enter the nearest free vehicle. The minimap shows every car. All four support taxi fares and parcel deliveries. Cars stop when they meet another car; damage and passengers are not implemented.
- **Car sound:** original synthesized engine tones respond to throttle, speed and simulated gear changes. Tire/road sound grows with speed and braking. Nearby occupied cars have distance attenuation and stereo positioning. Sound starts after a user gesture, stops for empty cars and pauses in hidden tabs. **Crew → Car sound / Engine volume** controls mute and volume, saved locally on this device. These controls do not enable or mute the microphone.
- **Graphics:** clearcoat paint, sky reflections on car glass and building windows, brighter headlights/tail lamps, brake lights, projected headlight pools, and a forward light for the local driver's car on desktop Auto/High. Named Blender wheel pivots provide rotating wheels and steering; subtle body lean respects reduced-motion preference. Low omits headlight pools and the forward light. The existing photo textures, sunset atmosphere and moving shadows remain.
- **Blender and Unreal:** four editable vehicle sources now include separate wheel pivots and spoke geometry. Six FBX models (four cars, courier, kiosk) and four textures are imported into the Unreal art-review scene. Native driving or online UE gameplay is not implemented by that scene.
- **Activity design:** [56 original multiplayer activities](design/ACTIVITIES.md), [shared systems and UE5 architecture](design/SYSTEMS.md), [MVP/later/post-launch roadmap](design/ROADMAP.md), and [machine-readable JSON](design/activity-catalog.json). These are future designs, not 56 newly playable modes. Larger 16–32-player events are targets requiring new engineering and testing.

## New in Sunset Streets (0.4)

The art direction now uses a closer third-person street camera, warm sunset light, distant hills and haze, curved palm fronds, textured plaster, detailed street furniture, and moving shadows. This is an original stylized browser game inspired by classic open-world city games, with no GTA assets or branding.

- **Taxi shift:** get into any free car, choose Taxi shift in Play, drive to the cyan pickup marker, stop and press **Q / ACT**, then drop off within 90 seconds for +100. Three routes rotate after successful fares. Leaving the car ends the fare.
- **Harbor fishing:** choose Go fishing, travel to the north waterfront deck, and use **Q / ACT** to cast. Wait for **REEL NOW**, then respond within 4.5 seconds. Three catches rotate for +30, +40 and +60. Early/late reeling misses; moving away resets the cast. Visible tackle appears while casting. This has no real-money rewards.
- **City trail:** choose City trail and discover the garden fountain, Old Town clock, and Quay lookout in order. Press **Q / ACT** near each for a landmark note; completing all three earns +80.
- Activities show a cyan 3D marker and minimap destination bearing. Cancel in Play before choosing another activity or joining a footrace. Existing races, stars, deliveries, emotes, chat and voice remain available.
- A new **Blender-built courier** has rounded body geometry, facial details, jeans, sneakers and animated limbs. Blender-built market kiosks dress the parks. Editable `.blend`, `.fbx`, `.glb`, and reproducible scripts are included.
- **Unreal 5.7.4** imports the courier, kiosk, car and four photo textures into its separate Review scene. Its ground uses an asphalt material with the normal map converted to Unreal's convention. Browser multiplayer still uses Three.js; the Unreal scene is for art review, not a native gameplay port.

The basketball court, kiosks and street furniture are scenery. Basketball gameplay and shop transactions are not implemented. Scores are session-only and all rewards are server-controlled.

## What changed in Coastal Edition

- Playable bounds expanded from 188 × 188 to 372 × 372 game metres: about 3.9 times the original area.
- 64 buildings, four garden blocks, and five named areas: Civic Center, Old Town, Palm Gardens, Mariner Quarter, and South Quay.
- A longer delivery from the central depot to the north waterfront, over 200 metres away in a straight line.
- Detailed facades, striped shop awnings, rooftop utilities, palms, street lights, crosswalks, a fountain, piers, boats, and a harbor crane. Boats and piers are scenery beyond the playable boundary.
- Animated sea, warm lighting, a gradient sky, inexpensive projected shadows, animated walking, and a more detailed orange car.
- Full city map (click/tap minimap or press M), destination bearing, district display, and selectable graphics resolution in Crew.
- Building geometry and collision rectangles come from the same shared world data. Streets and the harbor delivery route are checked by automated tests.

## New in Friends Festival (0.3)

- **Civic Sprint:** join from Play, move to the starting line, and race through four ordered purple gates. Eight-second countdown, two-minute time limit, solo practice supported. Race entry requires leaving the car. Finish awards 100 / 75 / 50 points for first / second / later places.
- **Harbor Hunt:** 16 shared gold stars, +10 points per collection, 30-second respawn. Collect 12 together to trigger a crew celebration. A star can only be claimed once before respawning.
- Room leaderboard, recent activity feed, player name labels, wave/dance/cheer emotes, festival park stage and lanterns, and pooled confetti. Deliveries now give +50 points. Points and activities reset when the room is emptied or the server restarts.
- Original rounded **Quay Coupe built and exported in Blender 5.2.2**. The browser loads its compact GLB model; editable `.blend`, FBX, and generation script are in `art-source/`.
- Locally served **Poly Haven CC0 photo textures**: asphalt and red brick, including surface normal maps. Desktop antialiasing improves edges; the city remains a stylized lightweight scene.
- An **Unreal Engine 5.7.4 art-review project** imports the Blender car and four textures and includes a saved review level. See `unreal-review/README.md` for exact scope and rebuild instructions.

The playable game still uses Three.js directly in the browser. The Unreal project is an asset-review scene, not a port of multiplayer gameplay, a packaged native game, or a Pixel Streaming deployment. Blender and Unreal are not required to play the browser version.

## Start locally

Requires Node.js 22 or newer and npm (or pnpm).

```sh
npm install
npm start
```

Open http://localhost:3000 in a current WebGL 2 browser. On this computer, dependencies are already installed and the server was left running at that address. If it has stopped, run `Start-Harbor-Run.cmd`, or use the commands above. The Windows launcher also detects the bundled Node runtime used during development.

For reproducible installation, use `pnpm install --frozen-lockfile` with the included pnpm lockfile. No build step is needed. All browser dependencies are served locally; there is no runtime CDN dependency.

### Play with friends

Everyone opens the **same server URL** and enters the **same room code**. The URL also carries `?room=your-code`, so you can share it. Each room has its own eight-car fleet and allows eight players. Names are display labels, not accounts. Default room `harbor` is public to anyone with the server address. Use an unguessable room code for casual private sessions; it is not access control.

On the same Wi-Fi, use `http://HOST-LAN-IP:3000` on phones/computers, and allow the Node server through the host firewall if needed. The localhost URL only works on the host itself. Plain HTTP LAN play supports movement and text chat; microphone access requires HTTPS. Do not disable certificate checks.

## Controls

| Action | Desktop | Phone / narrow display |
|---|---|---|
| Walk | WASD or arrow keys | Left joystick |
| Run | Shift | RUN toggle |
| Enter / exit nearest free car | E, within 5 metres | CAR |
| Drive | W/S throttle/reverse, A/D steer | Joystick up/down and left/right |
| Brake | Space | Hold BRAKE |
| Pick up / deliver | F near a beacon | DELIVER |
| Camera | Drag city view; wheel to zoom | Drag city view |
| Text and voice | Crew, or Enter for text | Crew |
| City map | M or click minimap | Tap minimap |
| Graphics resolution | Crew → Graphics | Crew → Graphics |
| Race, star goal, leaderboard | Play | Play |
| City activity interaction | Q or ACT button | ACT button |
| Wave / dance / cheer | 1 / 2 / 3, or Play | Play → emote |

Walking directions are fixed to the minimap (W/up is north), even when the camera is orbited. Car steering is relative to the car. Pick up a parcel at the **gold depot**, then deliver it at the **blue harbor beacon**. Follow the minimap and distance counter. The mission can be repeated and completed on foot or by car. Each car has one driver seat. All eight players can drive simultaneously when every car is available. Passenger seats are not implemented. It is a peaceful driving/courier sandbox, with no weapons, traffic, police, interiors, or pedestrians.

## Voice and block controls

Open Crew, then explicitly enable the microphone. Each player must enable voice to participate; voice-off players do not receive voice audio. The browser asks for microphone permission. Self-mute disables outgoing audio; per-player Mute silences that person's incoming audio only. Block disconnects voice in both directions and filters text messages and signaling at the server. Unblock allows communication again. If autoplay is restricted, tap the screen to resume audio.

Blocking and mute selections are session-only, tied to a connection ID, and reset on reconnect. Blocking does not hide a player or prevent them using available cars. There is no persistent moderation, login, or ban system. Voice is a small-room WebRTC audio mesh; text and game state use WebSockets. No media is recorded by this application. Direct WebRTC connections can reveal network addresses to other participants. Use with trusted friends.

## Publishing files and Internet hosting

Use [DEPLOY.md](DEPLOY.md) for the publishing steps. `render.yaml` explicitly
selects a **Free** Render web service; `railway.json` is an alternative for a
Railway account. The fixed Dockerfile includes the graphics module manifest and
uses `npm ci` with the included npm lockfile. `harbor-run-publish.zip` contains
just the web game, server, tests, licenses and deployment files. The source ZIP
also contains Blender and Unreal development assets.

The publishing package passed a real-server integration test in an isolated
folder with freshly installed production dependencies. Docker itself was not
available locally, so a container build and the hosted HTTPS/WebSocket path still
need to be verified during deployment.

This delivery is **local and runnable, not deployed online**. To play across the Internet:

1. Run one persistent Node process on an Internet-reachable host. Use Node 22+, install dependencies, and run `npm start`. Set `PORT` if your host assigns one. Default bind is `0.0.0.0:3000`; `HOST` can override it. A static-only host cannot run this server.
2. Put it behind a trusted HTTPS reverse proxy or a platform with managed TLS. Proxy both HTTP and WebSocket upgrades to the same process. Preserve the original `Host` header for the origin check. Use a domain with a valid certificate. Share `https://your-domain/?room=your-code`.
3. Configure a TURN relay for dependable voice across restrictive networks. The default public Google STUN server may work for direct peer connections but is **not a TURN relay and cannot guarantee voice connectivity**. Set `ICE_SERVERS_JSON` to an array accepted by RTCPeerConnection, for example:

```json
[{"urls":"stun:stun.l.google.com:19302"},{"urls":["turn:turn.example.com:3478?transport=udp","turns:turn.example.com:5349?transport=tcp"],"username":"temporary-user","credential":"temporary-credential"}]
```

This JSON must be supplied as one environment variable before starting the server. `/config` exposes these ICE credentials to browser clients by design; never put account API keys or long-lived administrative secrets there. A production release should mint short-lived TURN credentials on an authenticated backend. You can run your own TURN server or configure a service you already have; no service was purchased or created.

A Dockerfile and sample Caddyfile are included as starting points. Replace the sample domain and configure DNS before running Caddy. Neither Docker nor Caddy was installed or started for this delivery. Do not deploy multiple independent replicas: rooms are kept in one process's memory and are not synchronized across processes. Restarting the server clears everything; an empty room is deleted immediately.

## Implementation

- Three.js 0.180.0, plain ES modules, instanced procedural city and avatars, eight Blender cars, courier and kiosks loaded through the locally vendored GLTFLoader, and CC0 photo textures.
- Node HTTP server and ws 8.21.3; same-origin static files and WebSockets.
- Server-authoritative 20 Hz movement, car control, approximate collisions, missions, race checkpoints, star respawns, city activities, scores, and emote cooldowns. Client renders interpolated snapshots; no latency prediction.
- Repeated scenery is instanced by geometry and material; moving 1024px sun shadows are enabled on desktop Auto and 2048px shadows on High; Low and coarse-pointer Auto use inexpensive projected ground shadows. Auto pixel ratio is capped at 1.25 for coarse-pointer devices and 1.5 elsewhere. Low uses 1; High caps at 1.75. Touch input has pointer capture and release cleanup.
- Inputs expire after 600 ms; disconnect releases only that player's car. Server enforces room size, payload size, message rate, chat cooldown, and same-origin browser connections.
- 32-room and 128-joined-player caps are protective defaults, **not load-tested capacity claims**. Intended use is a few trusted friends.

## Accessibility and performance controls

Menus use labeled native buttons, visible keyboard focus, and Enter/Space activation. Escape closes panels. Text-chat and toast updates have live-region semantics. Game movement shortcuts do not intercept chat typing or the native activation keys of menu buttons. Touch movement is analog, with pointer-cancel cleanup. Operating-system reduced-motion preference stops decorative water/beacon animation and welcome-camera orbit; movement and camera following still animate as necessary for gameplay.

Crew includes a saved graphics-quality toggle and an informational FPS/draw-call counter. These are useful tuning controls, not a guarantee of a particular frame rate. The 3D gameplay and minimap still require vision and spatial navigation: this is not a fully screen-reader-accessible game. Key remapping, captions/transcription for live voice, and a formal accessibility audit are not included.

## Validation

```sh
npm test
```

Automated tests use a separate real server and real WebSocket clients. They cover room isolation, player movement replication, car exclusivity and release, text delivery, blocking, voice signaling isolation, HTTP assets and MIME types, collisions and boundaries, stale input, normalized walking, repeatable missions, race replication/checkpoint order/countdown/deadline/disconnect cleanup, score authority, exclusive star collection and respawn, crew goals, and emote replication/cooldown/expiry.

All **22 automated tests pass** (30 September 2026). Tests cover eight independent drivers across five districts, ownership and room isolation, safe exits and car-to-car collision, per-car taxi/race behavior, real two-client fleet replication, static model/module routes (including every new HDR/postprocessing dependency), stale throttle/steering/brake feedback, audio attenuation, eight distinct waveforms, bounded previews, gear shifts and turbo release, mute/source cleanup and context lifecycle. Existing race, city-job, movement and communication tests remain green.

Browser checks confirmed the eight-car garage, driver status, upgraded scene, engine preview activation, mute/unmute and volume adjustment, with no reported JavaScript errors or warnings. At 390×844 the sound panel and slider fit without horizontal overflow. Desktop and phone preview images accompany the source archive. Sound synthesis and control behavior were checked; speaker output and subjective sound quality on physical devices have not been independently audited. Blender exported all eight vehicle models. Unreal 5.7.4 imported ten FBX models and four textures and saved its review level; rendering was disabled, so the Unreal scene's rendered appearance is not claimed as verified.

The 0.8 graphics pass was inspected in the actual in-app browser on 30 September and 1 October 2026. High, Auto and Low render successfully; switching quality releases/recreates the effect buffers, and Low persists across reload. The compact touch layout remains usable. The final browser run reported no JavaScript or shader warnings/errors. High-mode readings varied around 18–27 FPS in the tested app views, so it is an optional visual-quality tradeoff, not a 60 FPS claim. Auto and Low retain the new scenery with fewer effects. Physical phone/GPU performance has not been measured.

Viewport testing is not a physical phone performance test. Real microphone audio between two devices, TURN traversal, WAN latency, and Safari/mobile hardware performance still need a hosted multi-device playtest. Voice signaling is tested; audible end-to-end voice is not claimed as verified.

Prototype limitations: simple collision shapes, no vehicle damage or player-to-player collisions, no persistence or authentication, no reconnect recovery, no moderation beyond session blocks, and decorative props have no collision. The camera shortens its follow distance near buildings but can still feel tight in alleys. A tab in the background may be throttled by the browser. If voice fails, check HTTPS, microphone permissions, both participants' voice settings, and TURN configuration.

## Sources and licenses

The custom source and geometry are MIT licensed; see LICENSE. Poly Haven textures retain CC0 terms; Unreal Engine itself is not included or relicensed. Dependencies retain their own MIT licenses in node_modules/three/LICENSE and node_modules/ws/LICENSE. See THIRD_PARTY.md. Implementation references: [Three.js renderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html), [MDN microphone security requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), and [MDN WebRTC signaling](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling).
