# AppraiseOS — Quick Start

> This is a personal copy of AppraiseOS that runs on your own Mac. Your data
> never leaves your machine. No subscription, no cloud fees, no account
> elsewhere. You can still reach the app from your phone or iPad as long as
> they're on the same WiFi as your laptop — useful in the field.

---

## Step 1 — Install Node.js 20 (one time, ~2 minutes)

AppraiseOS needs Node.js 20 or newer.

**Check if you already have it:**
Open **Terminal** (press ⌘-Space, type "Terminal", hit return). Run:

```bash
node -v
```

If you see `v20.x.x` or higher, skip to Step 2. Otherwise:

**Option A — Official installer (easiest):**
Download the LTS installer from https://nodejs.org/en/download, double-click
the `.pkg` file, and follow the prompts. Close and re-open Terminal when
done, then re-run `node -v`.

**Option B — If you already use Homebrew:**
```bash
brew install node@20
brew link --overwrite node@20
```

---

## Step 2 — Download AppraiseOS (one time)

In Terminal, pick a folder and clone the repo:

```bash
cd ~/Documents       # or wherever you want it
git clone https://github.com/siju9917/Kendama_site.git appraise-os
cd appraise-os
```

If you don't have git, install the **Xcode Command Line Tools** when macOS
prompts you (it's ~200 MB and free). Or download the repo as a zip from the
GitHub page and `cd` into the unzipped folder.

---

## Step 3 — Install (one time, ~2 minutes)

```bash
./scripts/install.sh
```

This checks your Node version, installs everything, builds the production
bundle, and prepares the `data/` and `uploads/` folders. On first run you may
see a popup asking to install Xcode command line tools — accept it.

---

## Step 4 — Start the app

```bash
./scripts/start.sh
```

You'll see a banner like:

```
On this computer:  http://localhost:3000
From phone / iPad: http://192.168.1.42:3000
```

Open that URL in Safari or Chrome. Create your account, then follow the
on-screen checklist: Settings → Adjustment rules → Clients → first job.

**Press Ctrl-C in Terminal to stop the app.** Your data is saved; starting
again picks up where you left off.

---

## Step 5 — (Optional) Start automatically at login

So you don't have to open Terminal every morning:

```bash
./scripts/install-autostart-mac.sh
```

Now AppraiseOS runs quietly in the background from login. To stop it running
on startup:

```bash
launchctl unload ~/Library/LaunchAgents/com.appraiseos.plist
```

---

## Step 6 — Back up your data

The app stores everything in the `data/` (database) and `uploads/` (photos)
folders. **Back them up.** The fastest way:

```bash
./scripts/backup.sh
```

That writes a timestamped zip to `backups/`. Keep the last few on an external
drive or iCloud. You can also schedule this to run nightly:

```bash
crontab -e
```

and add (press `i` to edit, `Esc` then `:wq` to save):

```
0 2 * * *  cd /Users/YOU/Documents/appraise-os && ./scripts/backup.sh >>backups/backup.log 2>&1
```

---

## Using the app on your phone on-site

As long as your phone is on the **same WiFi** as your laptop, open the URL
from the banner (`http://192.168.x.x:3000`) in Safari. You can then use the
inspection page to capture photos and fill the checklist from a phone.

If your laptop is asleep or on a different network, the phone can't reach
it. That's the tradeoff for keeping everything on-device.

---

## Updating to a newer version

```bash
cd ~/Documents/appraise-os
git pull
./scripts/install.sh    # rebuilds if there are changes
```

Your `data/` and `uploads/` directories are never touched by updates.

---

## Troubleshooting

**"Address already in use" when starting**
Something else is on port 3000. Start on a different port:
```bash
PORT=3002 ./scripts/start.sh
```

**"Could not locate the bindings file"**
The native SQLite binding didn't compile. Run:
```bash
(cd node_modules/better-sqlite3 && npx prebuild-install)
./scripts/start.sh
```

**Forgot your password**
Passwords are stored locally, hashed. Easiest fix: delete `data/app.db` and
sign up again (you'll lose data — restore from a backup instead if you have one).

**The app is running but the browser says "Can't connect"**
Make sure you opened the URL from the start banner, not just `localhost:3000`
if the app is running under launchd (see Step 5). Also check that your
firewall isn't blocking Node: System Settings → Network → Firewall → allow
incoming connections for Node if prompted.

**Where's my data?**
- Database: `data/app.db`
- Uploaded photos: `uploads/<jobId>/…`
- Signed PDFs are generated on demand, not stored on disk.

---

## Security notes

- Data is on your Mac. If your Mac is lost or stolen, whoever has it has the
  data. Use FileVault full-disk encryption.
- The app binds to `0.0.0.0` so it's reachable from your LAN. If you're on
  a public network and don't want that, start with
  `HOST=127.0.0.1 ./scripts/start.sh` (localhost-only).
- Session cookies are stored in your browser for 30 days.
- Your session secret lives in `data/.session-secret` — don't share it.

---

## Getting help

- Full product roadmap: `DEVELOPMENT_ROADMAP.md`
- Detailed code review (for the technically curious): `CODE_REVIEW.md`
- Product README: `README.md`
