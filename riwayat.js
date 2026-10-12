/* riwayat.js — halaman Riwayat Penjualan: cari, filter, urut, aksi. */
(() => {
  const U = KK.Utils, T = KK.Transaction, $ = id => document.getElementById(id);
  const IDS = ["f-q", "f-range", "f-from", "f-to", "f-method", "f-sort"];
  const filters = () => ({ q: $("f-q").value, range: $("f-range").value, from: $("f-from").value, to: $("f-to").value, method: $("f-method").value, sort: $("f-sort").value });

  function render() {
    const f = filters(); $("custom-range").hidden = f.range !== "custom";
    const all = KK.Storage.all("transactions").length, rows = T.query(f), list = $("list");
    $("summary").textContent = all ? `${rows.length} dari ${all} transaksi · ${U.rupiah(rows.reduce((s, t) => s + t.total, 0))}` : "";
    if (!all) {
      list.innerHTML = `<div class="empty"><div class="empty-art">${KK.UI.ICONS.transaksi}</div><h3>Belum ada transaksi</h3><p>Mulai catat penjualan pertama Anda.</p><a class="btn btn-primary" href="transaksi.html">${KK.UI.ICONS.plus} Buat Transaksi</a></div>`;
      return;
    }
    if (!rows.length) {
      list.innerHTML = `<div class="empty"><div class="empty-art">${KK.UI.ICONS.riwayat}</div><h3>Tidak ada hasil</h3><p>Coba kata kunci atau filter yang lain.</p><button class="btn btn-ghost" id="btn-clear">Reset filter</button></div>`;
      $("btn-clear").onclick = () => { IDS.forEach(id => ($(id).value = id === "f-range" || id === "f-method" ? "all" : id === "f-sort" ? "newest" : "")); render(); };
      return;
    }
    const e = U.esc;
    list.innerHTML = `<table><thead><tr><th>No. Kuitansi</th><th>Tanggal</th><th>Customer</th><th class="num">Item</th><th class="num">Total</th><th>Metode</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(t => `<tr>
      <td data-label="No. Kuitansi" class="code">${e(t.number)}</td>
      <td data-label="Tanggal">${U.dayLabel(t.date, t.time)}</td>
      <td data-label="Customer">${t.customerName ? e(t.customerName) : '<span class="muted">Umum</span>'}</td>
      <td data-label="Item" class="num">${t.itemCount}</td>
      <td data-label="Total" class="num">${U.rupiah(t.total)}</td>
      <td data-label="Metode">${e(t.paymentMethod)}</td>
      <td data-label="Status"><span class="chip ${t.status === "Lunas" ? "ok" : "warn"}">${e(t.status)}</span></td>
      <td class="act"><div class="row-actions">
        <a class="btn btn-ghost btn-sm" href="kuitansi.html?id=${e(t.id)}">Lihat</a>
        <a class="btn btn-ghost btn-sm" href="kuitansi.html?id=${e(t.id)}&print=1">Cetak</a>
        <a class="btn btn-ghost btn-sm" href="transaksi.html?dup=${e(t.id)}">Duplikat</a>
        <button class="btn btn-ghost btn-sm btn-del" data-del="${e(t.id)}">Hapus</button></div></td></tr>`).join("")}</tbody></table>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    IDS.forEach(id => $(id).addEventListener(id === "f-q" ? "input" : "change", render));
    $("list").addEventListener("click", ev => {
      const b = ev.target.closest("[data-del]"); if (!b) return;
      const t = KK.Storage.findById("transactions", b.dataset.del); if (!t) return;
      KK.UI.confirm("Hapus transaksi?", `Kuitansi ${t.number} akan dihapus permanen dari riwayat.`, "Hapus", () => { T.remove(t.id); KK.UI.toast("Transaksi berhasil dihapus."); render(); });
    });
    document.addEventListener("keydown", ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); $("f-q").focus(); } });
    const pq = new URLSearchParams(location.search).get("q"); if (pq) $("f-q").value = pq;
    render();
    if (new URLSearchParams(location.search).get("deleted")) { KK.UI.toast("Transaksi berhasil dihapus."); history.replaceState(null, "", "riwayat.html"); }
  });
})();
