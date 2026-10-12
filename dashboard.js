/* dashboard.js — tampilan halaman Dashboard (Phase 1). */
(() => {
  const { rupiah, esc, dayLabel, longDate, greeting } = KK.Utils;
  const $ = id => document.getElementById(id);
  const customer = t => t.customerName ? esc(t.customerName) : '<span class="muted">Umum</span>';
  const chip = s => `<span class="chip ${s === "Lunas" ? "ok" : "warn"}">${esc(s)}</span>`;

  function renderStats() {
    const s = KK.Report.dashboardStats();
    const total = $("stat-today-total");
    total.classList.remove("skeleton");
    total.textContent = rupiah(s.todayTotal);
    $("slip-meta").textContent = s.todayCount ? `Dari ${s.todayCount} transaksi hari ini` : "Belum ada penjualan hari ini";
    $("stat-today-count").textContent = `${s.todayCount} transaksi`;
    $("stat-today-items").textContent = `${s.todayItems} item`;
    $("stat-month-total").textContent = rupiah(s.monthTotal);
  }

  function renderRecent() {
    const rows = KK.Report.recentTransactions(8);
    const wrap = $("recent-wrap");
    $("recent-note").textContent = rows.length ? `${rows.length} terakhir` : "";
    if (!rows.length) {
      wrap.innerHTML = `<div class="empty">
        <div class="empty-art">${KK.UI.ICONS.transaksi}</div>
        <h3>Belum ada transaksi</h3><p>Mulai catat penjualan pertama Anda.</p>
        <a class="btn btn-primary" href="transaksi.html">${KK.UI.ICONS.plus} Buat Transaksi</a>
        <button class="btn btn-ghost" id="btn-load-demo">Muat data demo</button></div>`;
      const b = $("btn-load-demo");
      if (b) b.onclick = () => { KK.Storage.seedDemo(true); render(); KK.UI.toast("Data demo dimuat."); };
      return;
    }
    wrap.innerHTML = `<table>
      <thead><tr><th>No. Kuitansi</th><th>Customer</th><th class="num">Total</th><th>Metode Pembayaran</th><th>Waktu</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map(t => `<tr>
        <td data-label="No. Kuitansi" class="code">${esc(t.number)}</td>
        <td data-label="Customer">${customer(t)}</td>
        <td data-label="Total" class="num">${rupiah(t.total)}</td>
        <td data-label="Metode">${esc(t.paymentMethod)}</td>
        <td data-label="Waktu">${dayLabel(t.date, t.time)}</td>
        <td data-label="Status">${chip(t.status)}</td>
        <td class="act"><button class="btn btn-ghost btn-sm" data-detail="${esc(t.id)}">Detail</button></td>
      </tr>`).join("")}</tbody></table>`;
    wrap.querySelectorAll("[data-detail]").forEach(b => b.onclick = () => showDetail(b.dataset.detail));
  }

  function showDetail(id) {
    const t = KK.Storage.findById("transactions", id);
    if (!t) return KK.UI.toast("Transaksi tidak ditemukan.", "error");
    const items = KK.Report.itemsOf(id);
    const row = (l, v, cls = "") => `<div class="detail-row ${cls}"><span>${l}</span><span>${v}</span></div>`;
    const body = `
      ${row("Kuitansi", `<strong>${esc(t.number)}</strong>`)}
      ${row("Customer", t.customerName ? esc(t.customerName) : "Umum")}
      ${row("Tanggal", `${longDate(t.date)}, ${t.time}`)}
      <div class="detail-items">${items.map(i => row(`${esc(i.name)}<br><span class="muted small">${i.qty} × ${rupiah(i.price)}${i.discount ? ` (diskon ${rupiah(i.discount)})` : ""}</span>`, rupiah(i.subtotal))).join("")}</div>
      ${row("Subtotal", rupiah(t.subtotal))}
      ${t.discount ? row("Diskon", "−" + rupiah(t.discount)) : ""}
      ${t.shipping ? row("Ongkir", rupiah(t.shipping)) : ""}
      ${row("Total", rupiah(t.total), "total")}
      ${row("Pembayaran", esc(t.paymentMethod))}
      ${row("Dibayar", rupiah(t.paid))}
      ${t.paid >= t.total ? row("Kembalian", rupiah(t.change)) : row("Kekurangan", rupiah(t.total - t.paid))}
      ${row("Status", chip(t.status))}`;
    KK.UI.modal({ title: "Detail Transaksi", body, actions: [{ label: "Tutup" }, { label: "Lihat Kuitansi", kind: "btn-primary", onClick: () => (location.href = "kuitansi.html?id=" + encodeURIComponent(t.id)) }] });
  }

  function render() {
    const store = KK.Storage.getStore();
    $("greeting").textContent = `${greeting()}, ${store.name || "Toko Saya"}`;
    $("subtitle").textContent = longDate(KK.Utils.ymd());
    renderStats();
    renderRecent();
    $("demo-bar").hidden = !KK.Storage.hasDemo();
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    $("btn-reset-demo").onclick = () => KK.UI.confirm(
      "Reset data demo?",
      "Semua transaksi dan produk contoh akan dihapus. Data yang Anda buat sendiri tidak ikut terhapus.",
      "Hapus data demo",
      () => { KK.Storage.resetDemo(); render(); KK.UI.toast("Data demo berhasil dihapus."); }
    );
  });
})();
