// Helper bersama untuk fungsi serverless Vercel (file berawalan "_" tidak dijadikan endpoint).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const STD_RANGES = new Set(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']);

const RANGE_RE = /^(\d{1,2}y|\d{1,2}mo|\d{1,3}d|ytd|max)$/;
const SYMBOL_RE = /^[\^A-Z0-9.\-=]{1,20}$/i;

function isValidRange(r) {
  return RANGE_RE.test(r);
}

function isValidSymbol(s) {
  return SYMBOL_RE.test(s);
}

// Saham BEI: BBCA -> BBCA.JK ; indeks (^JKSE) dibiarkan.
function toYahooSymbol(s) {
  const u = String(s || '').trim().toUpperCase();
  if (u.startsWith('^')) return u;
  return u.replace(/\.JK$/, '') + '.JK';
}

// Yahoo hanya menerima range baku (1y, 2y, 5y, 10y, ...). Rentang seperti "3y" diubah ke period1/period2.
function chartQuery(range, p1, p2) {
  if (/^\d{9,11}$/.test(String(p1)) && /^\d{9,11}$/.test(String(p2))) return `period1=${p1}&period2=${p2}&interval=1d`;
  const m = /^(\d{1,2})y$/.exec(range);
  if (m && !STD_RANGES.has(range)) {
    const now = Math.floor(Date.now() / 1000);
    const p1 = now - Math.round(Number(m[1]) * 365.25 * 86400);
    return `period1=${p1}&period2=${now + 86400}&interval=1d`;
  }
  return `range=${range}&interval=1d`;
}

async function getOnce(host, symbol, range, timeoutMs, p1, p2) {
  const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${chartQuery(range, p1, p2)}`;
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: ctrl.signal,
    });
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}
    return { status: r.status, json };
  } finally {
    clearTimeout(tm);
  }
}

// Coba query1 lalu query2. Balasan Yahoo yang sah (termasuk "simbol tidak ditemukan") diteruskan apa adanya.
async function fetchChart(symbol, range, timeoutMs = 12000, p1, p2) {
  let lastErr = null;
  for (const host of HOSTS) {
    try {
      const { status, json } = await getOnce(host, symbol, range, timeoutMs, p1, p2);
      if (json && json.chart) {
        if (json.chart.result || (json.chart.error && status !== 429 && status < 500)) return { status, json };
      }
      lastErr = new Error('Yahoo HTTP ' + status);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Yahoo tidak dapat dijangkau');
}

// Jalankan fungsi async pada banyak item dengan batas paralel.
async function pool(items, limit, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        await fn(items[idx], idx);
      }
    })
  );
}

module.exports = { HOSTS, isValidRange, isValidSymbol, toYahooSymbol, fetchChart, pool };
