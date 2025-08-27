const http = require('http');
const https = require('https');
const { improvedWarcraftResources } = require('./improved-dark-portal-links');

function checkUrl(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, (res) => {
        const result = {
          url,
          statusCode: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 400,
          redirected: res.statusCode >= 300 && res.statusCode < 400,
          location: res.headers.location || null,
        };
        // Drain data to allow socket reuse and then end
        res.resume();
        res.on('end', () => resolve(result));
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ url, statusCode: 0, ok: false, error: 'timeout' });
      });
      req.on('error', (err) => resolve({ url, statusCode: 0, ok: false, error: err.message }));
      req.setTimeout(timeoutMs);
    } catch (e) {
      resolve({ url, statusCode: 0, ok: false, error: e.message });
    }
  });
}

(async () => {
  const urls = improvedWarcraftResources.map(r => r.url);
  const uniqueUrls = Array.from(new Set(urls));
  console.log(`Verifying ${uniqueUrls.length} URLs...`);
  const results = [];
  for (const url of uniqueUrls) {
    // eslint-disable-next-line no-await-in-loop
    const res = await checkUrl(url);
    results.push(res);
    const status = res.ok ? 'OK' : `FAIL${res.redirected ? ' (redirect)' : ''}`;
    console.log(`${status.padEnd(10)} ${res.statusCode.toString().padEnd(4)} ${url}${res.location ? ' -> ' + res.location : ''}${res.error ? ' [' + res.error + ']' : ''}`);
  }
  const okCount = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;
  console.log(`\nSummary: OK=${okCount}, FAIL=${failCount}`);
})();
