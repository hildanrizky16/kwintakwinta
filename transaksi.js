/* transaksi.js — tampilan halaman Buat Transaksi. */
(() => {
  const U = KK.Utils, T = KK.Transaction;
  const $ = id => document.getElementById(id);
  const METHODS = ["Cash", "Transfer", "QRIS", "E-Wallet", "Debit", "Kredit", "Lainnya"];
  let method = "Cash", paidTouched = false, editId = null;
  const fmt = n => (n ? Number(n).toLocaleString("id-ID") : "");

  const rowHTML = () => `
    <div class="item">
      <label class="field f-name">Nama barang<input class="in-name" list="product-list" placeholder="Mis. Parfum A" autocomplete="off"><small class="err"></small><small class="hint"></small></label>
      <label class="field f-sku">SKU (opsional)<input class="in-sku" autocomplete="off"></label>
      <label class="field f-price">Harga (Rp)<input class="in-price money" inputmode="numeric" placeholder="0"><small class="err"></small></label>
      <label class="field f-qty">Jumlah<input class="in-qty" inputmode="decimal" value="1"><small class="err"></small></label>
      <label class="field f-disc">Diskon (Rp)<input class="in-disc money" inputmode="numeric" placeholder="0"><small class="err"></small></label>
      <div class="f-sub"><span class="muted small">Subtotal<br><strong class="sub">Rp0</strong></span>
        <button type="button" class="icon-btn del" aria-label="Hapus barang">${KK.UI.ICONS.trash}</button></div>
    </div>`;

  function addRow(focus = true) {
    $("items").insertAdjacentHTML("beforeend", rowHTML());
    const row = $("items").lastElementChild;
    if (focus) row.querySelector(".in-name").focus();
    recalc();
  }

  function read() {
    return {
      date: $("f-date").value, time: $("f-time").value, method,
      customerName: $("f-customer").value, customerPhone: $("f-phone").value, note: $("f-note").value,
      items: [...document.querySelectorAll(".item")].map(r => ({
        name: r.querySelector(".in-name").value, sku: r.querySelector(".in-sku").value,
        price: r.querySelector(".in-price").value, qty: r.querySelector(".in-qty").value, discount: r.querySelector(".in-disc").value,
      })),
      discount: $("f-discount").value, shipping: $("f-shipping").value, paid: $("f-paid").value,
    };
  }

  function recalc() {
    const n = T.normalize(read());
    document.querySelectorAll(".item").forEach((r, k) => { r.querySelector(".sub").textContent = U.rupiah(T.itemSubtotal(n.items[k])); });
    const plist = KK.Product ? KK.Product.all() : [];
    document.querySelectorAll(".item").forEach((r, k) => { // petunjuk stok (tidak memblokir penjualan)
      const it = n.items[k], p = !editId && it.name ? KK.Product.match(it, plist) : null, h = r.querySelector(".hint");
      h.className = "hint" + (p && it.qty > p.stock ? " warn" : "");
      h.textContent = p ? (it.qty > p.stock ? `Stok hanya ${p.stock} ${p.unit} — jumlah melebihi stok` : `Stok tersisa ${p.stock} ${p.unit}`) : "";
    });
    const t = T.totals(n);
    if (!paidTouched) $("f-paid").value = fmt(t.total);
    const paid = paidTouched ? t.paid : t.total;
    $("s-subtotal").textContent = U.rupiah(t.subtotal);
    $("s-total").textContent = $("p-total").textContent = U.rupiah(t.total);
    const short = paid < t.total;
    $("pay-label").textContent = short ? "Kekurangan" : "Kembalian";
    $("pay-value").textContent = U.rupiah(short ? t.total - paid : paid - t.total);
    $("pay-result").classList.toggle("short", short);
  }

  const setErr = (input, msg) => {
    const small = input.closest("label").querySelector(".err");
    input.classList.toggle("invalid", !!msg); if (small) small.textContent = msg || "";
  };
  const clearErrors = () => { document.querySelectorAll(".invalid").forEach(i => i.classList.remove("invalid")); document.querySelectorAll(".err").forEach(s => (s.textContent = "")); };

  function showErrors(e) {
    clearErrors();
    $("err-general").textContent = e.general || "";
    setErr($("f-date"), e.date); setErr($("f-time"), e.time);
    setErr($("f-discount"), e.discount); setErr($("f-paid"), e.paid);
    document.querySelectorAll(".item").forEach((r, k) => {
      const x = e.items[k] || {};
      setErr(r.querySelector(".in-name"), x.name); setErr(r.querySelector(".in-price"), x.price);
      setErr(r.querySelector(".in-qty"), x.qty); setErr(r.querySelector(".in-disc"), x.discount);
    });
    const first = document.querySelector(".invalid"); if (first) first.focus();
  }

  function updateNumber() { if (editId) return; $("f-number").value = $("f-date").value ? T.nextNumber($("f-date").value) : ""; }

  function resetForm() {
    ["f-customer", "f-phone", "f-note", "f-discount", "f-shipping"].forEach(id => ($(id).value = ""));
    $("f-date").value = U.ymd(); $("f-time").value = U.hm();
    $("items").innerHTML = ""; method = "Cash"; paidTouched = false; $("f-paid").value = "";
    clearErrors(); renderMethods(); updateNumber(); addRow(false);
  }

  function save() {
    const res = T.save(read(), editId);
    if (!res.ok) { showErrors(res.errors); KK.UI.toast("Periksa kembali data yang berwarna merah.", "error"); return; }
    if (res.warnings && res.warnings.length) sessionStorage.setItem("kk:flash", "Stok tidak cukup untuk: " + res.warnings.join(", ") + ". Stok diset ke 0.");
    location.href = "kuitansi.html?id=" + encodeURIComponent(res.record.id) + (editId ? "&edited=1" : "&new=1");
  }

  /** ?dup=ID -> salin transaksi (nomor & waktu baru). ?edit=ID -> ubah transaksi yang ada. */
  function prefill() {
    const q = new URLSearchParams(location.search), id = q.get("edit") || q.get("dup");
    if (!id) return;
    const t = T.toForm(id);
    if (!t) { KK.UI.toast("Transaksi asal tidak ditemukan.", "error"); return; }
    const isEdit = !!q.get("edit");
    if (isEdit) { editId = id; $("f-number").value = t.number; $("f-date").value = t.date; $("f-time").value = t.time; }
    $("f-customer").value = t.customerName; $("f-phone").value = t.customerPhone; $("f-note").value = t.note;
    $("f-discount").value = fmt(t.discount); $("f-shipping").value = fmt(t.shipping);
    method = t.paymentMethod; renderMethods();
    $("items").innerHTML = "";
    t.items.forEach(i => {
      addRow(false); const r = $("items").lastElementChild;
      r.querySelector(".in-name").value = i.name; r.querySelector(".in-sku").value = i.sku || "";
      r.querySelector(".in-price").value = fmt(i.price); r.querySelector(".in-qty").value = String(i.qty).replace(".", ","); r.querySelector(".in-disc").value = fmt(i.discount);
    });
    if (isEdit) { $("f-paid").value = fmt(t.paid); paidTouched = true; }
    recalc();
    $("page-title").textContent = isEdit ? "Edit Transaksi" : "Duplikat Transaksi";
    if (isEdit) $("btn-save").textContent = "Simpan Perubahan";
    KK.UI.toast(isEdit ? "Mengubah " + t.number : "Daftar barang disalin. Ubah customer & pembayaran bila perlu.", "info");
  }

  function renderMethods() {
    $("methods").innerHTML = METHODS.map(m => `<button type="button" class="chip-btn" aria-pressed="${m === method}" data-m="${m}">${m}</button>`).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("product-list").innerHTML = KK.Storage.all("products").map(p => `<option value="${U.esc(p.name)}">${U.esc(p.sku || "")} · ${U.rupiah(p.price)} · stok ${p.stock}</option>`).join("");
    $("customer-list").innerHTML = KK.Customer.list().map(c => `<option value="${U.esc(c.name)}">`).join("");
    resetForm();
    prefill();

    document.addEventListener("input", e => {
      const el = e.target;
      if (el.classList.contains("money")) el.value = fmt(T.parseMoney(el.value));
      if (el.id === "f-paid") paidTouched = true;
      if (el.id === "f-date") updateNumber();
      if (el.id === "f-customer") { // isi WhatsApp otomatis untuk customer lama
        const c = KK.Customer.list().find(x => x.name.toLowerCase() === el.value.trim().toLowerCase());
        if (c && c.whatsapp && !$("f-phone").value) $("f-phone").value = c.whatsapp;
      }
      if (el.classList.contains("in-name")) { // isi harga & SKU otomatis dari produk tersimpan
        const p = KK.Storage.all("products").find(x => x.name.toLowerCase() === el.value.trim().toLowerCase());
        const row = el.closest(".item");
        if (p && row) { row.querySelector(".in-sku").value = p.sku || ""; const pr = row.querySelector(".in-price"); pr.value = fmt(p.price); setErr(pr, ""); }
      }
      if (el.matches("input")) { const s = el.closest("label"); if (s) setErr(el, ""); }
      recalc();
    });
    $("items").addEventListener("click", e => {
      const del = e.target.closest(".del"); if (!del) return;
      del.closest(".item").remove();
      if (!document.querySelector(".item")) addRow(false);
      recalc();
    });
    $("btn-add").onclick = () => addRow();
    $("btn-exact").onclick = () => { paidTouched = false; recalc(); };
    $("methods").onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; method = b.dataset.m; renderMethods(); };
    $("btn-save").onclick = save;
    document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } });
  });
})();
