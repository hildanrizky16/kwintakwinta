/* transaction.js — logika bisnis transaksi: hitung, validasi, simpan. Tanpa akses DOM. */
window.KK = window.KK || {};
KK.Transaction = (() => {
  const S = KK.Storage, U = KK.Utils;
  const parseMoney = v => { const d = String(v ?? "").replace(/\D/g, ""); return d ? Number(d) : 0; };
  const parseQty = v => { const n = Number(String(v ?? "").trim().replace(",", ".")); return isFinite(n) && String(v).trim() !== "" ? n : NaN; };

  /** Ubah input mentah (string) dari form menjadi angka. NaN = kosong/tidak valid. */
  const normalize = f => ({
    ...f,
    customerName: (f.customerName || "").trim(), customerPhone: (f.customerPhone || "").trim(), note: (f.note || "").trim(),
    items: f.items.map(i => ({
      name: i.name.trim(), sku: i.sku.trim(),
      price: i.price.trim() === "" ? NaN : parseMoney(i.price),
      qty: parseQty(i.qty), discount: parseMoney(i.discount),
    })),
    discount: parseMoney(f.discount), shipping: parseMoney(f.shipping),
    paid: f.paid.trim() === "" ? NaN : parseMoney(f.paid),
  });

  const itemSubtotal = i => Math.max(0, Math.round((i.price || 0) * (i.qty || 0) - (i.discount || 0)));

  function totals(n) {
    const subtotal = n.items.reduce((s, i) => s + itemSubtotal(i), 0);
    const total = Math.max(0, subtotal - n.discount + n.shipping);
    const paid = n.paid || 0;
    return { subtotal, total, paid, change: Math.max(0, paid - total), shortage: Math.max(0, total - paid) };
  }

  const nextNumber = date => U.receiptNumber(date, S.all("transactions"));

  function validate(n) {
    const e = { items: n.items.map(() => ({})), ok: true };
    const bad = () => (e.ok = false);
    if (!n.date) { e.date = "Tanggal wajib diisi."; bad(); }
    if (!n.time) { e.time = "Waktu wajib diisi."; bad(); }
    if (!n.items.length) { e.general = "Tambahkan minimal satu barang."; bad(); }
    n.items.forEach((i, k) => {
      const r = e.items[k];
      if (!i.name) { r.name = "Nama barang wajib diisi."; bad(); }
      if (isNaN(i.price)) { r.price = "Harga wajib diisi."; bad(); }
      if (!(i.qty > 0)) { r.qty = "Jumlah harus lebih dari 0."; bad(); }
      if (!isNaN(i.price) && i.qty > 0 && i.discount > i.price * i.qty) { r.discount = "Diskon melebihi harga."; bad(); }
    });
    const t = totals(n);
    if (n.discount > t.subtotal) { e.discount = "Diskon melebihi subtotal."; bad(); }
    if (isNaN(n.paid)) { e.paid = "Jumlah dibayar wajib diisi."; bad(); }
    return e;
  }

  /** Validasi -> hitung ulang -> buat nomor -> simpan transaksi + semua barang. */
  function save(form, editId) {
    const n = normalize(form), errors = validate(n);
    if (!errors.ok) return { ok: false, errors };
    const t = totals(n), old = editId ? S.findById("transactions", editId) : null, id = old ? old.id : U.uid();
    const record = {
      id, number: old ? old.number : nextNumber(n.date), date: n.date, time: n.time,
      customerName: n.customerName, customerPhone: n.customerPhone, note: n.note,
      subtotal: t.subtotal, discount: n.discount, shipping: n.shipping, total: t.total,
      paymentMethod: n.method, paid: n.paid, change: t.change,
      status: n.paid >= t.total ? "Lunas" : "Belum Lunas", createdAt: old ? old.createdAt : new Date().toISOString(),
    };
    const items = n.items.map(i => ({ id: U.uid(), transactionId: id, name: i.name, sku: i.sku, price: i.price, qty: i.qty, discount: i.discount, subtotal: itemSubtotal(i) }));
    const mine = S.all("transactionItems").filter(i => i.transactionId === id), others = S.all("transactionItems").filter(i => i.transactionId !== id);
    if (old && KK.Product) KK.Product.restoreStock(mine);          // kembalikan stok transaksi lama
    const warnings = KK.Product ? KK.Product.applyStock(items) : []; // kurangi stok transaksi baru
    const ok = S.saveAll("transactionItems", [...others, ...items]) && (old ? S.update("transactions", id, { ...record, demo: false }) : S.insert("transactions", record));
    return ok ? { ok: true, record, items, warnings } : { ok: false, errors: { ok: false, items: [], general: "Gagal menyimpan. Coba lagi." } };
  }

  /** Cari + filter + urut riwayat. range: all|today|yesterday|7d|month|custom */
  function query({ q = "", range = "all", from = "", to = "", method = "all", sort = "newest" } = {}) {
    const byTx = {};
    S.all("transactionItems").forEach(i => (byTx[i.transactionId] = byTx[i.transactionId] || []).push(i));
    const today = U.ymd(), ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return U.ymd(d); };
    let lo = "", hi = "";
    if (range === "today") lo = hi = today;
    else if (range === "yesterday") lo = hi = ago(1);
    else if (range === "7d") { lo = ago(6); hi = today; }
    else if (range === "month") { lo = today.slice(0, 8) + "01"; hi = today; }
    else if (range === "custom") { lo = from; hi = to; }
    const term = q.trim().toLowerCase();
    const rows = S.all("transactions").filter(t => (!lo || t.date >= lo) && (!hi || t.date <= hi) && (method === "all" || t.paymentMethod === method) &&
      (!term || t.number.toLowerCase().includes(term) || (t.customerName || "").toLowerCase().includes(term) || (byTx[t.id] || []).some(i => i.name.toLowerCase().includes(term))))
      .map(t => ({ ...t, itemCount: (byTx[t.id] || []).reduce((s, i) => s + i.qty, 0) }));
    const when = t => t.date + t.time + t.createdAt;
    const sorters = { newest: (a, b) => when(b).localeCompare(when(a)), oldest: (a, b) => when(a).localeCompare(when(b)), high: (a, b) => b.total - a.total, low: (a, b) => a.total - b.total };
    return rows.sort(sorters[sort] || sorters.newest);
  }

  function remove(id) {
    if (KK.Product) KK.Product.restoreStock(S.all("transactionItems").filter(i => i.transactionId === id));
    return S.remove("transactions", id) && S.saveAll("transactionItems", S.all("transactionItems").filter(i => i.transactionId !== id));
  }

  /** Data transaksi lama untuk mengisi form (duplikat / edit). */
  function toForm(id) {
    const t = S.findById("transactions", id); if (!t) return null;
    return { ...t, items: S.all("transactionItems").filter(i => i.transactionId === id) };
  }

  return { parseMoney, normalize, itemSubtotal, totals, nextNumber, validate, save, query, remove, toForm };
})();
