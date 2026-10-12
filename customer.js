/* customer.js — database customer, dihitung otomatis dari transaksi (selalu sinkron). */
window.KK = window.KK || {};
KK.Customer = (() => {
  function list() {
    const map = new Map();
    KK.Storage.all("transactions").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).forEach(t => {
      const name = (t.customerName || "").trim(); if (!name) return;
      const k = name.toLowerCase(), c = map.get(k) || { name, whatsapp: "", count: 0, total: 0 };
      c.name = name; if (t.customerPhone) c.whatsapp = t.customerPhone;
      c.count++; c.total += t.total; c.lastDate = t.date; c.lastTime = t.time; c.lastTotal = t.total;
      map.set(k, c);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }
  const waLink = p => { let d = String(p || "").replace(/\D/g, ""); if (!d) return ""; if (d.startsWith("0")) d = "62" + d.slice(1); return "https://wa.me/" + d; };
  return { list, waLink };
})();
