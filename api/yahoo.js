// GET /api/yahoo?url=<URL chart Yahoo ter-encode>
// Meneruskan satu permintaan chart Yahoo Finance (menggantikan proxy CORS publik).
const { HOSTS, isValidRange, isValidSymbol, fetchChart } = require('./_yahoo');

module.exports = async (req, res) => {
  try {
    const raw = req.query && req.query.url;
    if (!raw) return res.status(400).json({ error: 'parameter url wajib' });

    let u;
    try {
      u = new URL(String(raw));
    } catch (e) {
      return res.status(400).json({ error: 'url tidak valid' });
    }
    const prefix = '/v8/finance/chart/';
    if (u.protocol !== 'https:' || !HOSTS.includes(u.hostname) || !u.pathname.startsWith(prefix)) {
      return res.status(400).json({ error: 'hanya chart Yahoo Finance yang diizinkan' });
    }
    const symbol = decodeURIComponent(u.pathname.slice(prefix.length));
    const range = u.searchParams.get('range') || '5d';
    const p1 = u.searchParams.get('period1');
    const p2 = u.searchParams.get('period2');
    if (!isValidSymbol(symbol) || !isValidRange(range)) {
      return res.status(400).json({ error: 'simbol atau range tidak valid' });
    }

    const { status, json } = await fetchChart(symbol, range, 12000, p1, p2);
    const ttl = (range === '1d' || range === '5d') && !p1 ? 15 : 1800;
    res.setHeader('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`);
    return res.status(status).json(json);
  } catch (e) {
    return res.status(502).json({ error: 'Yahoo tidak dapat dijangkau: ' + (e && e.message ? e.message : e) });
  }
};
