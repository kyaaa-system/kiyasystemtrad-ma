// GET /api/batch?range=5d&symbols=BBCA,BBRI,...
// Mengambil banyak saham sekaligus. Balasan: { "BBCA": <chart JSON Yahoo>, ... } (hanya yang berhasil).
const { isValidRange, isValidSymbol, toYahooSymbol, fetchChart, pool } = require('./_yahoo');

module.exports = async (req, res) => {
  try {
    const range = String((req.query && req.query.range) || '5d');
    const list = String((req.query && req.query.symbols) || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40);

    if (!list.length) return res.status(400).json({ error: 'parameter symbols wajib' });
    if (!isValidRange(range) || !list.every(isValidSymbol)) {
      return res.status(400).json({ error: 'simbol atau range tidak valid' });
    }

    const out = {};
    await pool(list, 8, async (sym) => {
      try {
        const { json } = await fetchChart(toYahooSymbol(sym), range, 12000);
        if (json && json.chart && json.chart.result && json.chart.result[0]) out[sym] = json;
      } catch (e) {
        /* saham yang gagal dilewati; frontend akan mencoba lewat /api/yahoo */
      }
    });

    const ttl = range === '1d' || range === '5d' ? 15 : 1800;
    res.setHeader('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}`);
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ error: String(e && e.message ? e.message : e) });
  }
};
