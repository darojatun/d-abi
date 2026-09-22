export const CONFIG = {
  STORE_NAME: 'D`Abi Coffee & Resto',
  EVENT_NAME: 'BERSAMA BEBYTE VERSI D`ABI',
  TAG_LINE: 'Bangun! semangat baru setiap hari 💪',
  VERSION: 'D`Abi',
  MASCOT: 'assets/qr.dc.d-abi.png',
  LOGO: 'assets/d-abi-logo.png',
  RECEIPT_LOGO: false, // true = tampilkan logo di resi (khusus printer yg dukung cetak gambar)
  RECEIPT_FOOTER: '-= Terima Kasih =-',
  QRIS_STATIC: '00020101021126590013ID.CO.BNI.WWW011893600009150433543102096015339410303UME51440014ID.CO.QRIS.WWW0215ID10254422482050303UME5204581453033605802ID5922D ABI COFFEE AND RESTO6015PADANGSIDIMPUAN61052272762070703A01630467B2',
  DISCORD: true, // false = matikan semua kiriman ke Discord (opsional, seperti README creator)
  WEBHOOK_URL: 'https://discordapp.com/api/webhooks/1549712999718064189/OruERz20gxzaYDHGLzBl6iDPa0tvtDhPCyrQTST_Q9Uuyx_XLJ9ioNjsxpcdcPyfFOPQ', 
  ROLE_ID_DAPUR: '1549712082122055760' 
};
export const MENU = [
  // ===== SUP =====
  { id: 1, name: 'Sup Ayam Mantap', nickname: 'SUPTAP 🍲', desc: 'Sup ayam mantap, kuah gurih nagih', price: 20000, category: 'Sup', img: 'assets/sup.jpg', variants: null, active: true },
  {
    id: 52, name: 'Sup Sehat', desc: 'Sup sehat bergizi', price: 30000, category: 'Sup', img: 'assets/sup-sehat.jpg', active: true,
    variants: [
      { name: 'Ayam Sehat', nickname: 'SUPHAT 💪', desc: 'Sup ayam sehat, isi komplit', active: true },
      { name: 'Daging Sehat', nickname: 'SUPGING 🥩', desc: 'Sup daging sehat, empuk bergizi', active: true }
    ]
  },
  // ===== NASI =====
  { id: 4, name: 'Nasi Putih', nickname: 'NASPUT 🍚', desc: 'Nasi putih hangat', price: 3000, category: 'Nasi', img: 'assets/nasi.jpg', variants: null, active: true },
  { id: 5, name: 'Nasi Tumpeng', nickname: 'TUMPENG 🎉', desc: 'Nasi tumpeng komplit buat acara', price: 300000, category: 'Nasi', img: 'assets/nasi-tumpeng.jpg', variants: null, active: true },
  { id: 55, name: 'Nasi Tumpeng Jumbo', nickname: 'TUMPENG JMB 🎉', desc: 'Nasi tumpeng jumbo porsi besar', price: 500000, category: 'Nasi', img: 'assets/nasi-tumpeng-jumbo.jpg', variants: null, active: true },
  { id: 6, name: 'Nasi Goreng', nickname: 'NASGOR 🔥', desc: 'Nasi goreng spesial', price: 17000, category: 'Nasi', img: 'assets/nasi-goreng.jpg', variants: null, active: true },
  // ===== AYAM =====
  {
    id: 46, name: 'Ayam', desc: 'Aneka olahan ayam', price: 18000, category: 'Ayam', img: 'assets/ayam.jpg', active: true,
    variants: [
      { name: 'Penyet', nickname: 'PENYET 🍗', desc: 'Ayam penyet sambal pedas', active: true },
      { name: 'Geprek', nickname: 'GEPREK 🌶️', desc: 'Ayam geprek sambal bawang', active: true }
    ]
  },
  // ===== IKAN =====
  { id: 9, name: 'Ikan Asam Manis', nickname: 'ASMAN 🐟', desc: 'Ikan asam manis segar', price: 25000, category: 'Ikan', img: 'assets/ikan.jpg', variants: null, active: true },
  { id: 10, name: 'Pecel Lele', nickname: 'PECLE 🐠', desc: 'Pecel lele + sambal + lalapan', price: 18000, category: 'Ikan', img: 'assets/pecel-lele.jpg', variants: null, active: true },
  // ===== MIE =====
  {
    id: 47, name: 'Mie', desc: 'Aneka mie', price: 15000, category: 'Mie', img: 'assets/mie.jpg', active: true,
    variants: [
      { name: 'Tiaw', nickname: 'TIAW 🍜', desc: 'Mie tiaw gurih', active: true },
      { name: 'Ifu Mie', nickname: 'IFUMIE 🍜', desc: 'Ifu mie siram kental', active: true },
      { name: 'Mihun', nickname: 'MIHUN 🍜', desc: 'Mihun goreng lembut', active: true },
      { name: 'Bangladesh', nickname: 'BANGLA 🍜', desc: 'Mie Bangladesh rempah khas', active: true },
      { name: 'Indomie Goreng', nickname: 'INDOGOR 🍝', desc: 'Indomie goreng favorit sejuta umat', active: true },
      { name: 'Indomie Rebus', nickname: 'INDOREBUS 🍲', desc: 'Indomie rebus hangat', active: true }
    ]
  },
  // ===== SNACKS =====
  {
    id: 53, name: 'Snacks Sultan', desc: 'Snack sultan favorit', price: 10000, category: 'Snacks', img: 'assets/snacks.jpg', active: true,
    variants: [
      { name: 'Ceker Pedas', nickname: 'CEKER 🔥', desc: 'Ceker pedas nampol', active: true },
      { name: 'Tahu Pong', nickname: 'TAHUPONG', desc: 'Tahu pong kopong gurih', active: false },
      { name: 'Bola-bola Tahu Puyu', nickname: 'TAHUPUYU', desc: 'Bola-bola tahu isi telur puyuh', active: true },
      { name: 'Risol', nickname: 'RISOL 🥐', desc: 'Risol isi creamy', active: true }
    ]
  },
  { id: 19, name: 'Perkedel Kentang', nickname: 'PERKEDEL 🥔', desc: 'Perkedel kentang gurih', price: 3000, category: 'Snacks', img: 'assets/perkedel.jpg', variants: null, active: true },
  { id: 20, name: 'Tempe Bacem', nickname: 'BACEM 🍯', desc: 'Tempe bacem manis legit', price: 5000, category: 'Snacks', img: 'assets/tempe-bacem.jpg', variants: null, active: true },
  // ===== JAJANAN =====
  {
    id: 56, name: 'Jajanan', desc: 'Aneka jajanan', price: 1000, category: 'Jajanan', img: 'assets/jajanan.jpg', active: true,
    variants: [
      { name: 'Emping Melinjo', nickname: 'EMPING', desc: 'Emping melinjo gurih', active: true },
      { name: 'Keripik Sambal', nickname: 'KRIPIK 🌶️', desc: 'Keripik sambal pedas', active: true },
      { name: 'Kerupuk Udang', nickname: 'KRUPUK 🍤', desc: 'Kerupuk udang renyah', active: true },
      { name: 'Rempeyek', nickname: 'REMPEYEK 🥜', desc: 'Rempeyek kacang renyah', active: true },
      { name: 'Kacang Goreng', nickname: 'KACANG 🥜', desc: 'Kacang goreng gurih', active: true },
      { name: 'Kue Bawang', nickname: 'KUEBAWANG 🧅', desc: 'Kue bawang renyah', active: true },
      { name: 'Kerupuk Jangek', nickname: 'JANGEK', desc: 'Kerupuk jangek gurih', active: true }
    ]
  },
  // ===== GRATIS =====
  {
    id: 57, name: 'Air Putih', desc: 'Air putih gratis', price: 0, category: 'Gratis', img: 'assets/air-putih.jpg', active: true,
    variants: [
      { name: 'Dingin', nickname: 'AIRPUTIH 🧊', desc: 'Air putih dingin', active: true },
      { name: 'Panas', nickname: 'AIRPANAS 🍵', desc: 'Air putih panas', active: true },
      { name: 'Es Kosong', nickname: 'ESKOSONG 🧊', desc: 'Es kosong', active: true }
    ]
  },
  // ===== GORENGAN =====
  { id: 22, name: 'Gorengan', nickname: 'GORENGAN 🍤', desc: 'Gorengan aneka, hitung per biji', price: 1000, category: 'Gorengan', img: 'assets/gorengan.jpg', variants: null, active: false, custom_qty: true },
  // ===== TEH =====
  { id: 23, name: 'Teh Manis Panas', nickname: 'TEHPAN 🍵', desc: 'Teh manis panas', price: 5000, category: 'Teh', img: 'assets/teh.jpg', variants: null, active: true },
  { id: 24, name: 'Teh Manis Dingin', nickname: 'TEHDING 🧊', desc: 'Teh manis dingin segar', price: 6000, category: 'Teh', img: 'assets/teh-dingin.jpg', variants: null, active: true },
  {
    id: 51, name: 'Teh Kekinian', desc: 'Teh kekinian segar', price: 10000, category: 'Teh', img: 'assets/teh-kekinian.jpg', active: true,
    variants: [
      { name: 'Serai Rempah', nickname: 'SEREH 🌿', desc: 'Teh serai rempah hangat', active: true },
      { name: 'Lemon Tea', nickname: 'LEMONTEA 🍋', desc: 'Lemon tea segar', active: true },
      { name: 'Hijau Sanger', nickname: 'SANGER 🍵', desc: 'Teh hijau sanger', active: true }
    ]
  },
  { id: 27, name: 'Teh Susu Telor', nickname: 'TST 🥛', desc: 'Teh susu telor khas', price: 15000, category: 'Teh', img: 'assets/tst.jpg', variants: null, active: true },
  { id: 28, name: 'TST Pinang Muda', nickname: 'PINANG 🥥', desc: 'TST + pinang muda berkhasiat', price: 30000, category: 'Teh', img: 'assets/tst-pinang-muda.jpg', variants: null, active: true },
  // ===== KOPI =====
  { id: 30, name: 'Kopi Hitam', nickname: 'KOPIHIT ☕', desc: 'Kopi hitam pekat', price: 5000, category: 'Kopi', img: 'assets/kopi.jpg', variants: null, active: true },
  { id: 31, name: 'Kopi Dingin', nickname: 'KOPDING 🧊', desc: 'Kopi dingin segar', price: 7000, category: 'Kopi', img: 'assets/kopi-dingin.jpg', variants: null, active: true },
  // ===== ES KEKINIAN =====
  {
    id: 48, name: 'Es Kekinian', desc: 'Es kekinian segar', price: 10000, category: 'Es Kekinian', img: 'assets/es.jpg', active: true,
    variants: [
      { name: 'Matcha', nickname: 'MATCHA 🍵', desc: 'Es matcha kekinian', active: true },
      { name: 'Chocolatos Coklat', nickname: 'CHOLATOS 🍫', desc: 'Es chocolatos coklat', active: true },
      { name: 'Es Teler Sultan', nickname: 'TELER 👑', desc: 'Es teler sultan komplit', active: true },
      { name: 'Pisang Ijo', nickname: 'PIJO 🍌', desc: 'Es pisang ijo kekinian', active: true }
    ]
  },
  // ===== JUS BUAH =====
  {
    id: 49, name: 'Jus Buah', desc: 'Jus buah murni', price: 10000, category: 'Jus Buah', img: 'assets/jus.jpg', active: true,
    variants: [
      { name: 'Jeruk', nickname: 'JUSJER 🍊', desc: 'Jus jeruk murni', active: true },
      { name: 'Alpukat', nickname: 'JUSPUKAT 🥑', desc: 'Jus alpukat creamy', active: true },
      { name: 'Wortel', nickname: 'JUSWORT 🥕', desc: 'Jus wortel segar', active: true },
      { name: 'Mangga', nickname: 'JUSMANGGA 🥭', desc: 'Jus mangga manis', active: true },
      { name: 'Terong Belanda', nickname: 'JUSTER 🧃', desc: 'Jus terong belanda', active: false },
      { name: 'Sirsak', nickname: 'JUSSIRSAK 🧃', desc: 'Jus sirsak segar', active: false }
    ]
  },
  // ===== SUP BUAH =====
  {
    id: 50, name: 'Sup Buah', desc: 'Sup buah segar', price: 15000, category: 'Sup Buah', img: 'assets/sup-buah.jpg', active: true,
    variants: [
      { name: 'Apel', nickname: 'SUPAPEL 🍎', desc: 'Sup buah apel segar', active: true },
      { name: 'Anggur', nickname: 'SUPANGGUR 🍇', desc: 'Sup buah anggur segar', active: true },
      { name: 'Strawberry', nickname: 'SUPSTRO 🍓', desc: 'Sup buah strawberry segar', active: true }
    ]
  },
  // ===== MINUMAN PANAS =====
  {
    id: 54, name: 'Minuman Panas', desc: 'Minuman panas penghangat', price: 10000, category: 'Minuman Panas', img: 'assets/minuman-panas.jpg', active: true,
    variants: [
      { name: 'Bandrek', nickname: 'BANDREK 🫖', desc: 'Bandrek hangat rempah', active: true },
      { name: 'Cappuccino', nickname: 'CAPPU ☕', desc: 'Cappuccino creamy', active: true },
      { name: 'Kopi Susu', nickname: 'KOPSUS 🥛', desc: 'Kopi susu lembut', active: true }
    ]
  },
];
