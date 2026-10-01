# Publish Harbor Run

The game needs one persistent Node.js server with HTTP and WebSocket support.
The deployment ZIP contains the browser game and server. The larger source ZIP
also includes editable Blender models, the Unreal art-review project and designs.
These files are ready for a hosting build; they are not evidence of a live deployment.

## Free hosting: Render

The included `render.yaml` explicitly selects the **Free** web-service plan.
It runs one Docker service with HTTPS and WebSockets; no paid database is needed.

1. Put the extracted publishing package in a GitHub repository, with `render.yaml`
   and `Dockerfile` at its root.
2. Sign in to Render and create a Blueprint from that repository.
3. Check that the `harbor-run` web service is set to **Free** before deploying.
4. Once the build succeeds, open its assigned `https://....onrender.com` URL.
   Share that address with `?room=friends` so players join the same room.

Free services sleep after 15 minutes without inbound HTTP/WebSocket traffic.
Waking takes about a minute; a restart clears the game's session-only rooms and
scores. Free allowances are limited. Keep the account without a payment method
for a strict no-charge setup: Render suspends services instead of billing when
an allowance would be exceeded. If the account already has a payment method,
verify its billing limits before deployment; selecting Free compute alone does
not prevent every possible bandwidth/build charge.

Sources: [Render Free](https://render.com/docs/free),
[billing FAQ](https://render.com/docs/faq), and
[WebSockets](https://render.com/docs/websocket).

## Alternative host: Railway

Railway can build the included Dockerfile and provide an HTTPS address. Its Hobby
plan starts at $5/month, credited toward usage; higher usage costs extra. Trial/free
credits depend on the account and do not guarantee continuous hosting. Check
[current pricing](https://docs.railway.com/pricing/plans) and set a spending limit
in the hosting account before deploying.

### Publish from GitHub

1. Extract `harbor-run-publish.zip`. Put the files inside its `harbor-run` folder
   at the root of a GitHub repository. Include the entire `public` directory.
2. In Railway, choose New Project → Deploy from GitHub repo, and select that repo.
   The included `railway.json` selects Docker and checks `/health`.
3. Keep **one service replica in one region**. Rooms live in process memory;
   multiple independent replicas cannot share players. No database is required.
4. After the build succeeds, use Settings → Networking → Generate Domain.
   Railway assigns an HTTPS address. Use the port provided by Railway, or 3000
   if a target port must be selected and no PORT variable overrides it.
5. Share `https://YOUR-ASSIGNED-DOMAIN/?room=friends`. Two players must use the
   same room code. Each room accepts up to eight players.

### Publish the extracted files without GitHub

With the [Railway CLI](https://docs.railway.com/cli/deploying) installed and signed
in on your computer, open a terminal in the extracted `harbor-run` folder. Create
or link the intended Railway project and select its service, then run:

```sh
railway up
railway domain
```

Those commands upload/deploy the game and expose its public domain. Account login
and any subscription/usage authorization must be completed by the account owner.
The connected Codex Railway tools do not automatically sign in the local CLI.

## Run or test before publishing

Install Node.js 22 or newer, then run in this folder:

```sh
npm ci
npm test
npm start
```

Open http://localhost:3000. The Windows launcher `Start-Harbor-Run.cmd` can be used
after dependency installation. This is a browser game, not a standalone EXE/APK.

For a Docker-capable machine:

```sh
docker build -t harbor-run .
docker run --rm -p 3000:3000 harbor-run
```

The included container runs as the non-root `node` user. `PORT` and `HOST` can be
set by the host; defaults are 3000 and 0.0.0.0. TLS is handled by the hosting proxy.
Static-only hosts cannot run the multiplayer server.

## Voice and session behavior

Microphone permission needs HTTPS (or localhost). Voice is off until each player
enables it. Default STUN may work on some networks; dependable voice needs a TURN
relay configured through `ICE_SERVERS_JSON`. See README.md for details. No paid
TURN service is bundled. Rooms, scores and car positions reset on server restart.

After publication, verify `/health`, join the same room from two devices, drive,
and test text chat. Test voice between different networks before promising it
works for everyone. A local test does not establish public WAN connectivity.

Reference: [Railway config](https://docs.railway.com/config-as-code/reference).
