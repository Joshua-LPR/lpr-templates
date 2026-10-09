// Minimal Chrome DevTools Protocol driver for headless Microsoft Edge.
// No npm dependencies: Node 22+ (global fetch + WebSocket) and an Edge install.
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE_PATHS = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

let nextPort = 9400 + Math.floor(Math.random() * 400);

// Nothing a test run starts is left behind: every test browser is shut down
// and every throwaway profile deleted — in close(), and again when Node
// exits (covers crashed / interrupted tests).
//
// On Windows the msedge.exe we spawn is only a launcher (it hands off to the
// real browser and exits), so killing "its" process tree stops nothing. The
// reliable handles are (1) asking the browser to close itself (CDP
// Browser.close) and (2) the unique --user-data-dir every one of its
// processes carries on its command line.
const live = new Set();
const profiles = new Set();
function stopByProfile(paths) {
  if (!paths.length) return;
  const list = paths.map(p => "'" + p.replace(/'/g, "''") + "'").join(',');
  const ps = `$ps=@(${list}); Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | ` +
    `Where-Object { $c = $_.CommandLine; $c -and ($ps | Where-Object { $c.Contains($_) }) } | ` +
    `ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }`;
  try { spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore', timeout: 20000 }); } catch {}
}
function removeProfile(prof) {
  try { rmSync(prof, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }); } catch {}
  if (!existsSync(prof)) profiles.delete(prof);
}
process.on('exit', () => {
  const left = [...profiles];
  if (live.size || left.some(p => existsSync(p))) stopByProfile(left);
  left.forEach(removeProfile);
});
// Sweep profiles left by runs that crashed before this safety net existed.
try {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const d of readdirSync(tmpdir())) {
    if (!/^lpr-test-[A-Za-z0-9]{6}$/.test(d)) continue;
    const p = join(tmpdir(), d);
    if (statSync(p).mtimeMs < cutoff) removeProfile(p);
  }
} catch {}

// Flags: no background services (component updates, sync, shopping…) — a
// small, quiet profile that exits quickly and deletes cleanly.
const QUIET = ['--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--no-default-browser-check', '--disable-default-apps', '--disable-extensions', '--disable-breakpad',
  '--disable-crash-reporter', '--disable-features=msEdgeShopping,EdgeCollections,msUndersideButton,Translate'];

// Open a fresh browser profile on `url`. user.js redirects to users.html when
// no user is active, so a test user is signed in first.
export async function open(url, { width = 1100, height = 1400, user = 'joshua' } = {}) {
  const edge = EDGE_PATHS.find(p => existsSync(p));
  if (!edge) throw new Error('Microsoft Edge not found — set EDGE_PATH');
  const port = nextPort++;
  const prof = mkdtempSync(join(tmpdir(), 'lpr-test-'));
  profiles.add(prof);
  const proc = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', ...QUIET,
    `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`,
    `--window-size=${width},${height}`, '--allow-file-access-from-files', 'about:blank'],
    { stdio: 'ignore' });
  const entry = { proc, prof };
  live.add(entry);

  let page;
  for (let i = 0; i < 75 && !page; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {}
    if (!page) await new Promise(r => setTimeout(r, 200));
  }
  if (!page) { stopByProfile([prof]); throw new Error('Edge did not start'); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      logs.push('EXCEPTION ' + (d.exception?.description || d.text));
    } else if (m.method === 'Page.javascriptDialogOpening') {
      // A dialog (alert / confirm / "Leave site?") would block the page and
      // every later command — accept it and record it.
      logs.push('dialog ' + m.params.type + ': ' + m.params.message);
      ws.send(JSON.stringify({ id: ++id, method: 'Page.handleJavaScriptDialog', params: { accept: true } }));
    } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      const text = m.params.args.map(a => a.value ?? a.description).join(' ');
      if (!IGNORED_LOGS.some(re => re.test(text))) logs.push(m.params.type + ' ' + text);
    }
  });
  // Every command times out (default 60 s) with a clear error instead of stalling a whole run.
  const send = (method, params = {}, ms = 60000) => new Promise((r, j) => {
    const i = ++id;
    const timer = setTimeout(() => { pending.delete(i); j(new Error(`CDP ${method} timed out after ${ms / 1000}s`)); }, ms);
    pending.set(i, m => { clearTimeout(timer); r(m); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const wait = ms => new Promise(r => setTimeout(r, ms));

  await send('Runtime.enable');
  await send('Page.enable');
  // NEVER save anything to the real Downloads folder (and so never open it
  // in a PDF viewer). Exports are captured in memory by the tests (see
  // site.mjs hookBlobs), so the download itself is never needed:
  // 1. Before any page script runs, a "download" link click does nothing.
  //    Every download path on the site (template-tools triggerDownload,
  //    jsPDF save, P-touch .lbt, Yard Sign PNG, index backup) is an <a
  //    download> that gets .click()ed or sent a click event.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const isDl = el => el instanceof HTMLAnchorElement && el.hasAttribute('download');
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (isDl(this)) { window.__lprBlockedDownloads = (window.__lprBlockedDownloads || 0) + 1; return; } return click.call(this); };
    const dispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (ev) { if (ev && ev.type === 'click' && isDl(this)) { window.__lprBlockedDownloads = (window.__lprBlockedDownloads || 0) + 1; return false; } return dispatch.call(this, ev); };
  })();` });
  // 2. Belt and braces: the browser itself denies downloads. This setting
  //    lasts only while the session that set it stays connected.
  await send('Page.setDownloadBehavior', { behavior: 'deny' });
  let browserWs = null;
  try {
    const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    browserWs = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise((r, j) => { browserWs.addEventListener('open', r, { once: true }); browserWs.addEventListener('error', j, { once: true }); });
    await new Promise(r => { browserWs.addEventListener('message', r, { once: true }); browserWs.send(JSON.stringify({ id: 1, method: 'Browser.setDownloadBehavior', params: { behavior: 'deny' } })); });
  } catch (e) { /* step 1 still applies */ }
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  if (user) {
    await send('Page.navigate', { url: url.replace(/[^/]*(\?.*)?$/, 'users.html') });
    await wait(1000);
    await send('Runtime.evaluate', { expression: `localStorage.setItem('lpr_active_user', ${JSON.stringify(user)})` });
  }
  await send('Page.navigate', { url });
  await wait(2200);

  return {
    logs, send, wait,
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
      return r.result?.result?.value;
    },
    async goto(u, ms = 2200) { await send('Page.navigate', { url: u }); await wait(ms); },
    async reload(ms = 2200) { await send('Page.reload'); await wait(ms); },
    async shot(file, clip) {
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
      writeFileSync(file, Buffer.from(r.result.data, 'base64'));
    },
    // Browser print → PDF (uses @page CSS). Returns the page count.
    async printPdf(file) {
      const r = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
      const buf = Buffer.from(r.result.data, 'base64');
      if (file) writeFileSync(file, buf);
      return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    },
    async viewport(w, h) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); },
    // Ask the browser to shut itself down (this stops all its processes),
    // then delete the profile — retrying while its helpers let go of files.
    async close() {
      try { await send('Browser.close', {}, 5000); } catch {}
      try { if (browserWs) browserWs.close(); } catch {}
      try { ws.close(); } catch {}
      for (let i = 0; i < 40 && existsSync(prof); i++) {
        try { rmSync(prof, { recursive: true, force: true }); } catch {}
        if (existsSync(prof)) await wait(250);
      }
      if (existsSync(prof)) { stopByProfile([prof]); await wait(500); removeProfile(prof); }
      else profiles.delete(prof);
      live.delete(entry);
    }
  };
}

// Noise from the browser itself, not from the templates.
const IGNORED_LOGS = [/Hotjar/i];
