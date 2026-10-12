/* app.js — kerangka bersama: navigasi, toast, modal. Dipakai semua halaman. */
window.KK = window.KK || {};
KK.UI = (() => {
  const { esc } = KK.Utils;
  const svg = (p) => `<svg class="ic" viewBox="0 0 24 24">${p}</svg>`;
  const ICONS = {
    dashboard: svg(
      '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    ),
    transaksi: svg(
      '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    ),
    riwayat: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    produk: svg(
      '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    ),
    laporan: svg('<path d="M4 20V11M10 20V4M16 20v-8M21 20H3"/>'),
    pengaturan: svg(
      '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    ),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    trash: svg(
      '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    ),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
  };
  // ready:false = halaman belum dibuat (fase berikutnya)
  const NAV = [
    {
      id: "dashboard",
      label: "Dashboard",
      href: "dashboard.html",
      ready: true,
    },
    {
      id: "transaksi",
      label: "Buat Transaksi",
      short: "Transaksi",
      href: "transaksi.html",
      ready: true,
    },
    {
      id: "riwayat",
      label: "Riwayat Penjualan",
      short: "Riwayat",
      href: "riwayat.html",
      ready: true,
    },
    { id: "produk", label: "Produk", href: "produk.html", ready: true },
    { id: "laporan", label: "Laporan", href: "laporan.html", ready: true },
    {
      id: "pengaturan",
      label: "Pengaturan",
      short: "Atur",
      href: "pengaturan.html",
      ready: true,
    },
  ];

  function navLink(n, label, cls = "") {
    const active = document.body.dataset.page === n.id ? " active" : "";
    const attrs = n.ready
      ? `href="${n.href}"`
      : `href="#" data-soon="${esc(n.label)}"`;
    return `<a ${attrs} class="${cls}${active}" ${active ? 'aria-current="page"' : ""}>${ICONS[n.id]}<span>${label}</span></a>`;
  }

  function mountShell() {
    const store = KK.Storage.getStore();
    const mark = store.logo ? `<img src="${esc(store.logo)}" alt="">` : "K";
    document.getElementById("sidebar").innerHTML = `
      <div class="brand"><span class="brand-mark">${mark}</span>kwintakwinta</div>
      <nav class="nav" aria-label="Menu utama">${NAV.map((n) => navLink(n, n.label)).join("")}</nav>
      <div class="side-foot"><strong>${esc(store.name || "Toko Saya")}</strong><span><i class="dot"></i>Data tersimpan secara lokal</span><button class="logout" id="btn-logout" type="button">Keluar</button></div>`;
    const lo = document.getElementById("btn-logout");
    if (lo)
      lo.onclick = () =>
        confirmBox(
          "Keluar dari aplikasi?",
          "Anda perlu login lagi untuk membuka kwintakwinta. Data penjualan tetap tersimpan.",
          "Keluar",
          () => KK.Auth.logout(),
        );
    document.getElementById("bottomnav").innerHTML = NAV.map((n) =>
      navLink(n, n.short || n.label),
    ).join("");

    // Halaman fase berikutnya: beri tahu, jangan 404.
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-soon]");
      if (!el) return;
      e.preventDefault();
      toast(`${el.dataset.soon} akan aktif di fase berikutnya.`, "info");
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (document.body.dataset.page !== "transaksi")
          location.href = "transaksi.html";
      }
    });
  }

  function toast(message, type = "success") {
    const box = document.getElementById("toasts");
    if (!box) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="tick">${type === "error" ? "!" : type === "info" ? "i" : ICONS.check}</span><span>${esc(message)}</span>`;
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 260);
    }, 3200);
  }

  /** modal({title, body(html), actions:[{label, kind, onClick}]}) */
  function modal({ title, body = "", actions = [] }) {
    const wrap = document.createElement("div");
    wrap.className = "backdrop";
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2></div><div class="modal-body">${body}</div><div class="modal-foot"></div></div>`;
    const close = () => {
      wrap.remove();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => e.key === "Escape" && close();
    const foot = wrap.querySelector(".modal-foot");
    actions.forEach((a) => {
      const b = document.createElement("button");
      b.className = `btn ${a.kind || "btn-ghost"}`;
      b.textContent = a.label;
      b.onclick = () => {
        const r = a.onClick && a.onClick();
        if (r !== false) close();
      };
      foot.appendChild(b);
    });
    wrap.addEventListener("click", (e) => e.target === wrap && close());
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    const first =
      foot.querySelector(".btn-primary,.btn-danger") || foot.lastElementChild;
    first && first.focus();
    return close;
  }

  const confirmBox = (title, text, okLabel, onOk) =>
    modal({
      title,
      body: `<p class="muted" style="margin:0">${esc(text)}</p>`,
      actions: [
        { label: "Batal" },
        { label: okLabel, kind: "btn-danger", onClick: onOk },
      ],
    });

  document.addEventListener("DOMContentLoaded", () => {
    KK.Storage.init();
    mountShell();
  });
  return { toast, modal, confirm: confirmBox, ICONS };
})();
