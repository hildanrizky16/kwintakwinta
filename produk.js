/* produk.js — halaman Produk (CRUD + stok) dan tab Customer. */
(() => {
  const U = KK.Utils, P = KK.Product, C = KK.Customer, e = U.esc, $ = id => document.getElementById(id);
  const fmt = n => (n ? Number(n).toLocaleString("id-ID") : "");
  let tab = "produk";
  const stockChip = p => p.stock <= 0 ? '<span class="chip bad">Habis</span>' : `<span class="chip ${p.stock <= 5 ? "warn" : "ok"}">${p.stock} ${e(p.unit)}</span>`;
  const empty = (icon, title, text, btn = "") => `<div class="empty"><div class="empty-art">${KK.UI.ICONS[icon]}</div><h3>${title}</h3><p>${text}</p>${btn}</div>`;

  function renderProducts(term) {
    const all = P.all(), rows = all.filter(p => !term || (p.name + " " + p.sku).toLowerCase().includes(term));
    $("summary").textContent = all.length ? `${all.length} produk · ${all.filter(p => p.stock <= 5).length} stok menipis/habis` : "";
    if (!all.length) return empty("produk", "Belum ada produk", "Tambahkan produk yang sering Anda jual agar transaksi lebih cepat.", `<button class="btn btn-primary" data-add>+ Tambah Produk</button>`);
    if (!rows.length) return empty("riwayat", "Tidak ada hasil", "Coba kata kunci yang lain.");
    return `<table><thead><tr><th>Produk</th><th>SKU</th><th class="num">Harga jual</th><th class="num">Harga modal</th><th>Stok</th><th></th></tr></thead><tbody>${rows.map(p => `<tr>
      <td data-label="Produk" class="code">${e(p.name)}</td><td data-label="SKU">${e(p.sku) || '<span class="muted">–</span>'}</td>
      <td data-label="Harga jual" class="num">${U.rupiah(p.price)}</td><td data-label="Harga modal" class="num">${p.cost ? U.rupiah(p.cost) : "–"}</td>
      <td data-label="Stok">${stockChip(p)}</td>
      <td class="act"><div class="row-actions"><button class="btn btn-ghost btn-sm" data-edit="${e(p.id)}">Edit</button><button class="btn btn-ghost btn-sm btn-del" data-del="${e(p.id)}">Hapus</button></div></td></tr>`).join("")}</tbody></table>`;
  }

  function renderCustomers(term) {
    const all = C.list(), rows = all.filter(c => !term || (c.name + " " + c.whatsapp).toLowerCase().includes(term));
    $("summary").textContent = all.length ? `${all.length} customer · tercatat otomatis dari transaksi` : "";
    if (!all.length) return empty("riwayat", "Belum ada customer", "Customer tercatat otomatis saat Anda mengisi nama pada transaksi.");
    if (!rows.length) return empty("riwayat", "Tidak ada hasil", "Coba kata kunci yang lain.");
    return `<table><thead><tr><th>Customer</th><th>WhatsApp</th><th class="num">Transaksi</th><th class="num">Total pembelian</th><th>Pembelian terakhir</th><th></th></tr></thead><tbody>${rows.map(c => {
      const wa = C.waLink(c.whatsapp);
      return `<tr><td data-label="Customer" class="code">${e(c.name)}</td>
      <td data-label="WhatsApp">${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="link">${e(c.whatsapp)}</a>` : '<span class="muted">–</span>'}</td>
      <td data-label="Transaksi" class="num">${c.count}</td><td data-label="Total" class="num">${U.rupiah(c.total)}</td>
      <td data-label="Terakhir">${U.longDate(c.lastDate)} · ${U.rupiah(c.lastTotal)}</td>
      <td class="act"><div class="row-actions"><a class="btn btn-ghost btn-sm" href="riwayat.html?q=${encodeURIComponent(c.name)}">Lihat riwayat</a></div></td></tr>`; }).join("")}</tbody></table>`;
  }

  function render() {
    const term = $("f-q").value.trim().toLowerCase(), isP = tab === "produk";
    document.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
    $("title").textContent = isP ? "Produk" : "Customer"; $("btn-add").hidden = !isP;
    $("f-q").placeholder = isP ? "Cari nama produk atau SKU…" : "Cari nama atau nomor WhatsApp…";
    $("list").innerHTML = isP ? renderProducts(term) : renderCustomers(term);
  }

  const setErr = (el, msg) => { el.classList.toggle("invalid", !!msg); const s = el.closest("label").querySelector(".err"); if (s) s.textContent = msg || ""; };

  function openForm(p) {
    const v = p || { name: "", sku: "", price: "", cost: "", stock: "", unit: "pcs" };
    const body = `<div class="form-grid">
      <label class="field full">Nama produk<input id="p-name" value="${e(v.name)}" autocomplete="off"><small class="err"></small></label>
      <label class="field">SKU (opsional)<input id="p-sku" value="${e(v.sku)}" autocomplete="off"><small class="err"></small></label>
      <label class="field">Satuan<input id="p-unit" list="unit-list" value="${e(v.unit)}"></label>
      <label class="field">Harga jual (Rp)<input id="p-price" class="money" inputmode="numeric" value="${fmt(v.price)}"><small class="err"></small></label>
      <label class="field">Harga modal (opsional)<input id="p-cost" class="money" inputmode="numeric" value="${fmt(v.cost)}"></label>
      <label class="field full">Stok<input id="p-stock" inputmode="decimal" value="${v.stock === "" ? "" : e(String(v.stock).replace(".", ","))}" placeholder="0"><small class="err"></small></label></div>`;
    KK.UI.modal({ title: p ? "Edit Produk" : "Tambah Produk", body, actions: [{ label: "Batal" }, { label: p ? "Simpan Perubahan" : "Simpan Produk", kind: "btn-primary", onClick: () => {
      const g = id => $(id).value, r = P.save({ name: g("p-name"), sku: g("p-sku"), unit: g("p-unit"), price: g("p-price"), cost: g("p-cost"), stock: g("p-stock") }, p && p.id);
      ["name", "sku", "price", "stock"].forEach(k => setErr($("p-" + k), r.errors[k]));
      if (!r.ok) { const f = document.querySelector(".modal .invalid"); f && f.focus(); return false; }
      KK.UI.toast(p ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan."); render();
    } }] });
    $("p-name").focus();
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (new URLSearchParams(location.search).get("tab") === "customer") tab = "customer";
    $("btn-add").onclick = () => openForm();
    $("f-q").addEventListener("input", render);
    document.querySelectorAll("[data-tab]").forEach(b => (b.onclick = () => { tab = b.dataset.tab; $("f-q").value = ""; render(); }));
    $("list").addEventListener("click", ev => {
      if (ev.target.closest("[data-add]")) return openForm();
      const ed = ev.target.closest("[data-edit]"), del = ev.target.closest("[data-del]");
      if (ed) openForm(KK.Storage.findById("products", ed.dataset.edit));
      if (del) { const p = KK.Storage.findById("products", del.dataset.del); if (p) KK.UI.confirm("Hapus produk?", `${p.name} akan dihapus dari daftar produk. Riwayat transaksi tidak terpengaruh.`, "Hapus", () => { P.remove(p.id); KK.UI.toast("Produk berhasil dihapus."); render(); }); }
    });
    document.addEventListener("input", ev => { const el = ev.target; if (el.classList.contains("money")) el.value = fmt(Number(el.value.replace(/\D/g, "")) || 0) || ""; });
    render();
  });
})();
