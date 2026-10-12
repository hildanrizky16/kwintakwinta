/* report.js — logika bisnis statistik. Semua angka dihitung dari transaksi nyata. */
window.KK = window.KK || {};
KK.Report = (() => {
  const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

  function dashboardStats() {
    const today = KK.Utils.ymd(), month = today.slice(0, 7);
    const tx = KK.Storage.all("transactions");
    const items = KK.Storage.all("transactionItems");
    const todayTx = tx.filter(t => t.date === today);
    const todayIds = new Set(todayTx.map(t => t.id));
    return {
      todayTotal: sum(todayTx, t => t.total),
      todayCount: todayTx.length,
      todayItems: sum(items.filter(i => todayIds.has(i.transactionId)), i => i.qty),
      monthTotal: sum(tx.filter(t => t.date.startsWith(month)), t => t.total),
      monthCount: tx.filter(t => t.date.startsWith(month)).length,
    };
  }

  const recentTransactions = (n = 8) =>
    KK.Storage.all("transactions").sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, n);

  const itemsOf = id => KK.Storage.all("transactionItems").filter(i => i.transactionId === id);

  /* ---------- Laporan (Phase 6) ---------- */
  const U = KK.Utils;
  const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return U.ymd(new Date(y, m - 1, d + n)); };
  const txIn = (from, to) => KK.Storage.all("transactions").filter(t => t.date >= from && t.date <= to);
  const itemsIn = tx => { const ids = new Set(tx.map(t => t.id)); return KK.Storage.all("transactionItems").filter(i => ids.has(i.transactionId)); };

  /** Kunci periode: today | 7d | month -> [dari, sampai] */
  function range(key) {
    const today = U.ymd();
    return key === "today" ? [today, today] : key === "7d" ? [addDays(today, -6), today] : [today.slice(0, 8) + "01", today];
  }

  function periodStats(from, to) {
    const tx = txIn(from, to), revenue = sum(tx, t => t.total);
    return { count: tx.length, revenue, items: sum(itemsIn(tx), i => i.qty), average: tx.length ? Math.round(revenue / tx.length) : 0 };
  }

  /** Data grafik: mode day (14 hari) | week (8 minggu, mulai Senin) | month (6 bulan) */
  function series(mode) {
    const today = U.ymd(), tx = KK.Storage.all("transactions"), b = [];
    if (mode === "day") for (let i = 13; i >= 0; i--) { const d = addDays(today, -i); b.push({ label: d.slice(8) + "/" + d.slice(5, 7), from: d, to: d }); }
    else if (mode === "week") {
      const mon = addDays(today, -((new Date().getDay() + 6) % 7));
      for (let i = 7; i >= 0; i--) { const f = addDays(mon, -7 * i); b.push({ label: f.slice(8) + "/" + f.slice(5, 7), from: f, to: addDays(f, 6) }); }
    } else {
      const now = new Date();
      for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1), ym = U.ymd(d).slice(0, 7); b.push({ label: U.MONTHS[d.getMonth()].slice(0, 3) + " " + String(d.getFullYear()).slice(2), from: ym + "-01", to: ym + "-31" }); }
    }
    return b.map(x => { const r = tx.filter(t => t.date >= x.from && t.date <= x.to); return { label: x.label, total: sum(r, t => t.total), count: r.length }; });
  }

  function topProducts(from, to, n = 5) {
    const m = new Map();
    itemsIn(txIn(from, to)).forEach(i => { const k = i.name.trim().toLowerCase(), r = m.get(k) || { name: i.name, qty: 0, revenue: 0 }; r.qty += i.qty; r.revenue += i.subtotal; m.set(k, r); });
    return [...m.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, n);
  }

  function byMethod(from, to) {
    const m = new Map();
    txIn(from, to).forEach(t => { const r = m.get(t.paymentMethod) || { method: t.paymentMethod, count: 0, total: 0 }; r.count++; r.total += t.total; m.set(t.paymentMethod, r); });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }

  return { dashboardStats, recentTransactions, itemsOf, range, periodStats, series, topProducts, byMethod };
})();
