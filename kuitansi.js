/* kuitansi.js — halaman kuitansi: tampil, cetak, PDF, bagikan. */
(() => {
  const $ = id => document.getElementById(id);
  const busy = (btn, label, fn) => async () => {
    const old = btn.innerHTML; btn.disabled = true; btn.textContent = label;
    try { await fn(); } catch (err) { console.error(err); KK.UI.toast("Gagal. Periksa koneksi internet (PDF memakai pustaka jsPDF) lalu coba lagi.", "error"); }
    btn.disabled = false; btn.innerHTML = old;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const q = new URLSearchParams(location.search);
    const t = KK.Storage.findById("transactions", q.get("id") || "");
    if (!t) {
      $("rc-root").innerHTML = `<div class="panel empty"><div class="empty-art">${KK.UI.ICONS.transaksi}</div><h3>Kuitansi tidak ditemukan</h3><p>Transaksi ini mungkin sudah dihapus.</p><a class="btn btn-primary" href="dashboard.html">Ke Dashboard</a></div>`;
      return;
    }
    const items = KK.Report.itemsOf(t.id), store = KK.Storage.getStore();
    $("rc-number").textContent = t.number;
    $("rc-paper").innerHTML = KK.Receipt.html(t, items, store);
    $("rc-root").hidden = false;

    $("btn-edit").href = "transaksi.html?edit=" + encodeURIComponent(t.id);
    $("btn-dup").href = "transaksi.html?dup=" + encodeURIComponent(t.id);
    $("btn-delete").onclick = () => KK.UI.confirm("Hapus transaksi?", `Kuitansi ${t.number} akan dihapus permanen dari riwayat.`, "Hapus", () => { KK.Transaction.remove(t.id); location.href = "riwayat.html?deleted=1"; });
    $("btn-print").onclick = () => window.print();
    $("btn-pdf").onclick = busy($("btn-pdf"), "Membuat PDF…", async () => { await KK.Receipt.download(t, items, store); KK.UI.toast("PDF berhasil dibuat."); });
    $("btn-share").onclick = busy($("btn-share"), "Menyiapkan…", async () => {
      const r = await KK.Receipt.share(t, items, store);
      if (r === "shared") KK.UI.toast("Kuitansi dibagikan."); else if (r === "copied") KK.UI.toast("Perangkat tidak mendukung berbagi. Teks kuitansi disalin.", "info");
    });

    const flash = sessionStorage.getItem("kk:flash"); if (flash) { sessionStorage.removeItem("kk:flash"); setTimeout(() => KK.UI.toast(flash, "info"), 800); }
    if (q.get("edited")) KK.UI.toast("Perubahan berhasil disimpan.");
    if (q.get("print")) setTimeout(() => window.print(), 450);
    if (q.get("new")) {
      KK.UI.toast("Transaksi berhasil disimpan."); setTimeout(() => KK.UI.toast("Kuitansi berhasil dibuat."), 350);
      }
    history.replaceState(null, "", "kuitansi.html?id=" + encodeURIComponent(t.id));
  });
})();
