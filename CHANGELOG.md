# Changelog D`Abi (dari BeByte)

## Kasir & Order
- Tombol **SAVE** — simpan order sebagai hold **UNPAID**, bayar belakangan tanpa dobel nomor antrian.
- Kotak **UNPAID** di bawah MY ORDER — klik hold untuk buka kembali, tombol × hapus hold, tanpa scrollbar, bayangan tidak kepotong.
- **CHECKOUT** (CASH numpad tablet + kembalian / QRIS) — tombol QRIS terkunci saat total Rp 0.
- Nama + catatan ikut tersimpan (`bebyte_form`) — tahan tutup aplikasi.
- Catatan dapur: auto-clear sehabis checkout/SAVE/CLEAR, tombol ×, shortcut toggle centang (Takeaway ↔ Dine In saling menggusur).
- Kartu menu full-tap (ketuk di mana saja), penanda emoji ➕/🔽/❌, nama lengkap + chip nickname, badge grup selaras, kartu dipadatkan.
- Nama **Server** (kasir/pramusaji) per perangkat — tombol 🧑 bundar di navbar.

## QRIS Dinamis
- `js/qris.js` — QR statis → dinamis sesuai total (EMVCo + CRC16), tanpa API perusahaan.
- QR tampil di dialog bayar (300px, sejajar keypad cash), ikut tercetak di resi QRIS selebar kolom, tanpa baris kembalian.

## Resi Thermal 58mm
- Tombol **🧾 CETAK RESI** per baris laporan (wrap 2 baris di layar sempit).
- Area cetak aman kolom 3–30, item 1 baris (`qty nickname … total`), nickname varian tanpa kurung.
- Store/queue/total tebal adaptif, `Serv:`, footer dari config, logo opsional (`RECEIPT_LOGO`, default mati).
- Penanda sudut `+`, pemisah `+++`, anti-geser emoji (`dlen`/`vslice` — Rp selalu mentok kanan 30 kolom).
- Struk UNPAID cetak `Status: BELUM BAYAR`.

## Admin & Laporan
- Badge TUNAI/QRIS/**UNPAID**, tombol 💰 BAYAR, 🏁 FINISH → centang ✅ (PANGGIL hilang).
- Ringkasan rapat & center: Total Transaksi + Selesai, Belum bayar, Hari ini, Total Omset — aman dicetak di kertas resi.
- Kolom tanda tangan `ttd Server` di cetak laporan.
- Print kompatibel Chrome/Samsung HP (visibility + halaman tunggal, tunggu gambar QR siap).

## Discord (opsional)
- Flag `DISCORD` di config — `false` = semua kiriman mati, tombol PANGGIL jadi **✖ Discord**.
- Field 🙋 Server, salam manis di notif selesai + `@here`, judul ORDER CHECKOUT / ORDER DISIMPAN.

## Tema & Tampilan
- 6 tema (BeByte, Merah Putih, Mint, Cappuccino, Ocean, Blue Matrix) — tombol 🎨 bundar, tersimpan per perangkat, merah danger ikut tema.
- Hero dari config + badge kredit `🦖 BeByte - …` yang link ke repo, fallback Inggris ala loading.
- Identitas terpusat di `data.js`: nama toko, event, tagline, versi, maskot, logo, footer resi, QRIS, Discord, webhook.

## Data & Operasional
- 27 kartu / 59 nickname (varian untuk yang seharga), foto per item terkompresi, item gratis Rp 0 (Air Putih + varian).
- Mode stok per item/varian (tombol 📦 Stok), tahan per perangkat.
- Backup/restore JSON, PWA installable + offline (`manifest.json`, `sw.js`, ikon).
- README + tautan tool editor config.
