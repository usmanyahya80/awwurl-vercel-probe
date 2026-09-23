// Awwurl probe for Vercel (free Hobby plan). Deploy this folder as a project; set the Function Region per project
// (Settings → Functions → Function Region) to get a named location: fra1 Frankfurt, lhr1 London, sin1 Singapore,
// syd1 Sydney, gru1 São Paulo, bom1 Mumbai, hnd1 Tokyo, iad1 Washington, sfo1 San Francisco, cdg1 Paris, dub1 Dublin.
// Environment variable: TOKEN = the API token from WordPress → Awwurl → Dashboard.
// Then add to WordPress → Awwurl → Settings → General → Check locations:  Frankfurt|https://<project>.vercel.app/api/probe
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 AwwurlBot/1.0';

async function checkHost(host) {
  const t0 = Date.now();
  const tryUrl = async (u) => {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 9000);
    try { const r = await fetch(u, { redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': UA, 'accept': 'text/html,*/*;q=0.8' } }); clearTimeout(timer); return r; }
    catch (e) { clearTimeout(timer); throw e; }
  };
  let lastErr = null;
  for (const u of ['https://' + host + '/', 'https://www.' + host + '/', 'http://' + host + '/']) {
    try {
      const r = await tryUrl(u); const ms = Date.now() - t0;
      const ok = r.status > 0 && r.status < 500;   // 4xx bot walls and 404 roots are reachable; only 5xx is a failure
      return { host, ok: ok ? 1 : 0, code: r.status, ms, error: ok ? null : 'HTTP ' + r.status };
    } catch (e) { lastErr = e; }
  }
  const msg = String(lastErr && lastErr.message ? lastErr.message : lastErr).slice(0, 150);
  return { host, ok: 0, code: null, ms: Date.now() - t0, layer: /abort/i.test(msg) ? 'http' : 'http', error: /abort/i.test(msg) ? 'Timed out' : msg };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(200).json({ probe: 'awwurl', region: process.env.VERCEL_REGION || null }); return; }
  if ((req.headers['authorization'] || '') !== 'Bearer ' + process.env.TOKEN) { res.status(403).json({ error: 'forbidden' }); return; }
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const hosts = Array.isArray(body && body.hosts) ? body.hosts.slice(0, 60).filter((h) => /^[a-z0-9.-]+$/i.test(h)) : [];
  const results = [];
  for (let i = 0; i < hosts.length; i += 15) { results.push(...(await Promise.all(hosts.slice(i, i + 15).map(checkHost)))); }
  res.setHeader('cache-control', 'no-store');
  res.status(200).json({ region: process.env.VERCEL_REGION || null, results });
}
