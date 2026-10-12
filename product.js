/* product.js — logika produk & stok (tanpa DOM). */
window.KK = window.KK || {};
KK.Product = (() => {
  const S = KK.Storage, U = KK.Utils;
  const all = () => S.all("products");
  const norm = s => String(s || "").trim().toLowerCase();
  const num = v => (String(v ?? "").trim() === "" ? 0 : Number(String(v).replace(",", ".")));
  const money = v => { const d = String(v ?? "").replace(/\D/g, ""); return d ? Number(d) : 0; };
  const r3 = x => Math.round(x * 1000) / 1000;

  /** Cocokkan barang transaksi dengan produk: SKU dulu, lalu nama. */
  function match(item, list = all()) {
    const sku = norm(item.sku), name = norm(item.name);
    return (sku && list.find(p => norm(p.sku) === sku)) || (name && list.find(p => norm(p.name) === name)) || null;
  }

  function validate(f, editId) {
    const e = {}, sku = norm(f.sku);
    if (!f.name.trim()) e.name = "Nama produk wajib diisi.";
    if (String(f.price).trim() === "") e.price = "Harga jual wajib diisi.";
    const st = num(f.stock);
    if (!isFinite(st) || st < 0) e.stock = "Stok harus berupa angka 0 atau lebih.";
    if (sku && all().some(p => p.id !== editId && norm(p.sku) === sku)) e.sku = "SKU sudah dipakai produk lain.";
    return e;
  }

  function save(f, editId) {
    const errors = validate(f, editId);
    if (Object.keys(errors).length) return { ok: false, errors };
    const data = { name: f.name.trim(), sku: f.sku.trim(), price: money(f.price), cost: money(f.cost), stock: r3(num(f.stock)), unit: f.unit.trim() || "pcs" };
    const ok = editId ? S.update("products", editId, { ...data, demo: false }) : S.insert("products", { id: U.uid(), ...data });
    return { ok, errors: {} };
  }
  const remove = id => S.remove("products", id);

  /** Kurangi stok sesuai barang terjual. Mencatat jumlah yang benar-benar dikurangi di item (stockApplied). */
  function applyStock(items) {
    const list = all(), low = [];
    items.forEach(i => {
      const p = match(i, list); if (!p) return;
      const d = Math.min(p.stock, i.qty);
      if (i.qty > p.stock) low.push(p.name);
      p.stock = r3(p.stock - d); i.productId = p.id; i.stockApplied = d;
    });
    S.saveAll("products", list);
    return low;
  }
  /** Kembalikan stok dari transaksi yang diedit/dihapus. */
  function restoreStock(items) {
    const list = all();
    items.forEach(i => { if (!i.stockApplied) return; const p = list.find(x => x.id === i.productId); if (p) p.stock = r3(p.stock + i.stockApplied); });
    S.saveAll("products", list);
  }
  return { all, match, validate, save, remove, applyStock, restoreStock };
})();
