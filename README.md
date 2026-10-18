# Dashboard Backtest MA 50/100/200 — Kompas100

Dashboard statis (`index.html`) + dua fungsi serverless Vercel yang mengambil harga live dari Yahoo Finance,
jadi tidak perlu proxy publik dan tidak perlu menjalankan server sendiri.

```
index.html        # dashboard (semua CSS/JS/data tertanam)
api/yahoo.js      # GET /api/yahoo?url=...            -> satu chart Yahoo
api/batch.js      # GET /api/batch?range=5d&symbols=  -> banyak saham sekaligus
api/_yahoo.js     # helper bersama (bukan endpoint)
vercel.json       # region Singapura, maxDuration 30 dtk
```

## Deploy

### 1. Push ke GitHub
```bash
cd uts-dashboard
git init
git add .
git commit -m "Dashboard UTS MA trend + harga live"
git branch -M main
git remote add origin https://github.com/<username>/<nama-repo>.git
git push -u origin main
```

### 2. Hubungkan ke Vercel
1. Buka https://vercel.com/new, pilih repo tadi lewat **Import Git Repository**.
2. **Framework Preset: Other**. Kosongkan Build Command dan Output Directory.
3. Klik **Deploy**. Setiap `git push` berikutnya otomatis ter-deploy ulang.

Alternatif tanpa GitHub: `npx vercel --prod` dari folder ini.

## Cek setelah deploy
- `https://<domain-kamu>.vercel.app/api/yahoo?url=https%3A%2F%2Fquery1.finance.yahoo.com%2Fv8%2Ffinance%2Fchart%2FBBCA.JK%3Frange%3D5d%26interval%3D1d`
  harus menampilkan JSON berisi `"chart"`.
- `https://<domain-kamu>.vercel.app/api/batch?range=5d&symbols=BBCA,BBRI`
  harus menampilkan `{"BBCA":{...},"BBRI":{...}}`.
- Buka halaman utama, klik **🌐 Refresh Yahoo**. Chip di kanan atas berubah menjadi **LIVE Yahoo**.

## Catatan
- **Rentang riwayat** dipilih lewat dropdown "Rentang" di panel Harga Saham: 1, 2, 3, 5, 7, atau 10 tahun (default 10 tahun, sesuai desain backtest).
  Setelah ganti rentang, klik **▶ Hitung ulang metrik**. Backtest hanya memakai N tahun terakhir.
  Walk-forward butuh minimal 6 tahun; dengan 1 tahun, MA200 baru memberi sinyal di ujung periode sehingga trade sangat sedikit.
- Pemuatan pertama (10 tahun, 100 saham) bisa memakan 1–3 menit. Setelah itu riwayat disimpan di browser.
- Tanggal pembekuan forward test: **14 September 2026**. Ubah di `index.html` (cari `freeze_date`, ada 2 tempat).
- Jika Yahoo menolak (HTTP 429) dari server, halaman otomatis mencoba proxy CORS publik sebagai cadangan.
- Kalau region `sin1` bermasalah, hapus baris `"regions"` di `vercel.json`.
- Data Yahoo gratis untuk keperluan pribadi/akademik dan bisa tidak akurat pada sebagian saham BEI.
