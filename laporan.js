/* laporan.js — tampilan halaman Laporan: kartu, grafik (Chart.js), produk terlaris, metode bayar. */
(() => {
  const U = KK.Utils, R = KK.Report, e = U.esc, $ = id => document.getElementById(id);
  let mode = "day", chart = null;
  if (window.Chart) Chart.defaults.font.family = "Poppins, system-ui, sans-serif";
  const NOTE = { day: "Omzet per hari, 14 hari terakhir.", week: "Omzet per minggu (mulai Senin), 8 minggu terakhir.", month: "Omzet per bulan, 6 bulan terakhir." };
  const short = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + " jt" : n >= 1e3 ? Math.round(n / 1e3) + " rb" : String(n);

  function renderCards() {
    const [t0, t1] = R.range("today"), [m0, m1] = R.range("month"), t = R.periodStats(t0, t1), m = R.periodStats(m0, m1);
    $("t-count").textContent = t.count + " transaksi"; $("t-revenue").textContent = U.rupiah(t.revenue); $("t-items").textContent = t.items + " item";
    $("m-count").textContent = m.count + " transaksi"; $("m-revenue").textContent = U.rupiah(m.revenue); $("m-avg").textContent = U.rupiah(m.average);
  }

  function renderChart() {
    const data = R.series(mode), box = $("chart-box");
    $("chart-note").textContent = NOTE[mode];
    document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-selected", b.dataset.mode === mode));
    if (chart) { chart.destroy(); chart = null; }
    if (!window.Chart) { // cadangan bila CDN tidak termuat (offline)
      const max = Math.max(1, ...data.map(d => d.total));
      box.className = "chart-fallback";
      box.innerHTML = data.map(d => `<div class="bar-row"><span>${e(d.label)}</span><div class="bar"><i style="width:${(d.total / max) * 100}%"></i></div><b>${U.rupiah(d.total)}</b></div>`).join("");
      return;
    }
    box.className = "chart-box"; box.innerHTML = '<canvas id="chart" aria-label="Grafik penjualan"></canvas>';
    chart = new Chart($("chart"), {
      type: "bar",
      data: { labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.total), borderRadius: 6, maxBarThickness: 36, backgroundColor: data.map((_, i) => (i === data.length - 1 ? "#f2b134" : "#0b5d57")) }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${U.rupiah(c.parsed.y)} · ${data[c.dataIndex].count} transaksi` } } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => short(v) }, grid: { color: "#e6eaee" } }, x: { grid: { display: false } } },
      },
    });
  }

  function renderLists() {
    const [from, to] = R.range($("f-period").value), top = R.topProducts(from, to, 5), pay = R.byMethod(from, to);
    const bars = (rows, label, value, sub, max) => rows.map(r => `<div class="bar-row"><span>${e(label(r))}</span><div class="bar"><i style="width:${(value(r) / max) * 100}%"></i></div><b>${sub(r)}</b></div>`).join("");
    $("top").innerHTML = top.length ? bars(top, r => r.name, r => r.qty, r => `${r.qty} terjual`, top[0].qty) : '<p class="muted">Belum ada penjualan pada periode ini.</p>';
    const total = pay.reduce((s, p) => s + p.total, 0) || 1;
    $("methods").innerHTML = pay.length ? bars(pay, r => r.method, r => r.total, r => `${Math.round((r.total / total) * 100)}% · ${U.rupiah(r.total)}`, pay[0].total) : '<p class="muted">Belum ada penjualan pada periode ini.</p>';
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-mode]").forEach(b => (b.onclick = () => { mode = b.dataset.mode; renderChart(); }));
    $("f-period").onchange = renderLists;
    renderCards(); renderChart(); renderLists();
  });
})();
