/* utils.js — fungsi bantu murni (tanpa akses storage / DOM) */
window.KK = window.KK || {};
KK.Utils = (() => {
  const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const rupiah = n => "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const longDate = s => { const [y, m, d] = s.split("-"); return `${+d} ${MONTHS[m - 1]} ${y}`; };
  const dayLabel = (date, time) => (date === ymd() ? "Hari ini" : longDate(date)) + ", " + time;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /** Nomor kuitansi KT-YYYYMMDD-XXX; urutan = nomor tertinggi hari itu + 1 (tetap unik walau ada yang dihapus). */
  const receiptNumber = (date, transactions) => {
    const prefix = `KT-${date.replace(/-/g, "")}-`;
    const max = transactions.filter(t => t.number.startsWith(prefix)).reduce((m, t) => Math.max(m, parseInt(t.number.slice(prefix.length), 10) || 0), 0);
    return prefix + pad(max + 1, 3);
  };
  const greeting = (h = new Date().getHours()) => h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";

  return { MONTHS, pad, rupiah, ymd, hm, longDate, dayLabel, esc, uid, receiptNumber, greeting };
})();
