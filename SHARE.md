# How to share AppraiseOS with someone — free options

AppraiseOS is a web app, so there's no app-store submission, no Apple
Developer account, no $99/year fee. But "send it to your phone" can mean a
few different things. Here are the three free paths in order of how well
they match real-world use.

The app is **PWA-installable** — once someone opens the URL on their phone,
Safari/Chrome's "Add to Home Screen" gives it an icon on their home screen
and launches it full-screen without browser chrome. It looks and feels like
a native app.

---

## Option 1 — Cloudflare Tunnel (recommended)

**Best for**: letting a real user use the real app from their phone,
anywhere in the world, with *your* laptop acting as the server. Free, no
account, 2-minute setup. Data stays on your Mac.

### How it works
You run the app locally. `cloudflared` opens a secure outbound tunnel from
your Mac to Cloudflare and gives you a public HTTPS URL. Anyone with that
URL — including your friend on his phone, from any network — can open the
app in Safari. When you close the tunnel, the URL goes dead.

### Steps

1. Install the tunnel tool (one time):
   ```bash
   brew install cloudflared
   ```
   (Or download from https://github.com/cloudflare/cloudflared/releases if
   you don't use Homebrew.)

2. In one terminal, start the app:
   ```bash
   cd ~/Documents/appraise-os
   ./scripts/start.sh
   ```

3. In a **second** terminal, open the tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   You'll see output like:
   ```
   INF +--------------------------------------------------------------+
   INF |  Your quick Tunnel has been created! Visit it at:            |
   INF |  https://awesome-fluffy-bear-123.trycloudflare.com           |
   INF +--------------------------------------------------------------+
   ```

4. Text your friend that URL. He opens it in Safari on his iPhone. Done.

### PWA install (so it feels like an app on his phone)

1. He opens the URL in **Safari** (Chrome doesn't support install on iOS).
2. Taps the **Share** button.
3. Scrolls down → **Add to Home Screen** → **Add**.
4. Now he has an "AppraiseOS" icon. Tapping it opens full-screen, no URL
   bar, just like a native app.

On Android the equivalent is "Install app" from Chrome's menu.

### Caveats
- Your Mac has to be awake and running the app (use
  `./scripts/install-autostart-mac.sh` so it runs whenever you're logged in).
- The URL is random and changes every time you restart the tunnel. For a
  stable URL, create a free Cloudflare account and a named tunnel — see
  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/.
- If your Mac is off, the URL returns an error.

---

## Option 2 — ngrok (simplest one-time demo)

**Best for**: showing the app to someone in a call or over a short demo
session where the URL only needs to live for a few hours.

### Steps

1. Install ngrok:
   ```bash
   brew install ngrok
   ```

2. Start the app:
   ```bash
   ./scripts/start.sh
   ```

3. In a second terminal:
   ```bash
   ngrok http 3000
   ```
   You'll get a URL like `https://abcd-12-34-56-78.ngrok-free.app`. Share it.

### Caveats
- Free tier gives a different URL every time.
- Free tier shows a one-time "visit this URL" warning page to new visitors.
- Paid tier ($8/month) for a stable URL and no warning page.

---

## Option 3 — Deploy a throwaway demo to Render (no laptop needed)

**Best for**: "here's a link, click around and see if you like the idea" —
no commitment from you, no need for your Mac to be on. **Not good for real
appraisals** because Render's free tier has ephemeral storage: the
SQLite database and uploaded photos get wiped on every deploy, and free
instances sleep after 15 minutes with a ~1-minute cold start.

### Steps

1. Sign up at https://render.com (free tier, no credit card).
2. Click **New** → **Web Service** → connect your GitHub → pick
   `siju9917/Kendama_site`.
3. Settings:
   - Runtime: **Node**
   - Build command: `npm install --legacy-peer-deps && npm run build`
   - Start command: `npm run start`
   - Instance type: **Free**
4. Click **Create Web Service**. Render assigns a URL like
   `https://appraise-os-abc123.onrender.com`.
5. Share that URL.

### Caveats (important)
- **Data is ephemeral.** Every time Render redeploys (including auto-deploys
  from GitHub pushes), `data/app.db` and `uploads/` reset. Every user starts
  fresh. This is fine for a demo, bad for a real appraiser.
- **Sleeps** after 15 minutes of no traffic. First visitor after that waits
  ~60 seconds for cold start.
- **Shared database.** Every visitor using the demo sees the same data.
  There's no multi-tenant isolation in the app itself (single-user per
  account), so friends could see each other's jobs.

If you want Render with persistent data, you'd have to add a persistent disk
(paid, $1/month for 1 GB) — at that point Option 1 is strictly better.

---

## Quick comparison

| Path | Free? | Real data persists? | Friend's phone can reach it? | Your Mac needs to be on? | Stable URL? |
|------|:-----:|:-------------------:|:----------------------------:|:------------------------:|:-----------:|
| Cloudflare Tunnel | ✅ | ✅ (on your Mac) | ✅ | ✅ | Only with named tunnel |
| ngrok | ✅ | ✅ (on your Mac) | ✅ | ✅ | Only on paid tier |
| Render free demo | ✅ | ❌ (wipes on deploy) | ✅ | ❌ | ✅ |

---

## My recommendation

**Do Option 1 (Cloudflare Tunnel).** It's the only path that gives your
friend the *real* product with real data — from his phone — at no cost. Set
up the Mac autostart and the tunnel, and he's got a full working
installation without spending a dollar.

If he decides he loves it and wants something more permanent (stable URL,
doesn't need your Mac to stay on), the next step is a $5/month VPS
(Hetzner, Fly.io, Railway) which is still less than what TOTAL/ACI charge
in a week.

If he just wants to kick the tires for 10 minutes before deciding, Option
2 (ngrok) is a one-command setup.
