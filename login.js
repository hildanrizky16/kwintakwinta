/* login.js — halaman login / pembuatan akun pertama. */
(() => {
  const A = KK.Auth, $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search).get("next") || "";
  const next = /^[a-z0-9_-]+\.html(\?[^#]*)?$/i.test(q) ? q : "dashboard.html"; // hanya halaman internal
  if (A.isLoggedIn()) { location.replace(next); return; }

  let mode = A.hasAccount() ? "login" : "register";
  const setErr = (id, msg) => { const el = $(id), s = el.closest("label").querySelector(".err"); el.classList.toggle("invalid", !!msg); s.textContent = msg || ""; };
  const clear = () => { ["a-name", "a-user", "a-pass", "a-pass2"].forEach(id => setErr(id, "")); $("a-err").hidden = true; };
  function banner(msg) { const b = $("a-err"); b.textContent = msg; b.hidden = false; b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); }

  function setMode(m) {
    mode = m; clear(); $("reset-box").hidden = true;
    document.querySelectorAll("[data-for]").forEach(el => (el.hidden = el.dataset.for !== m));
    const a = A.account();
    $("a-title").textContent = m === "register" ? "Buat akun toko Anda" : "Selamat datang kembali";
    $("a-sub").textContent = m === "register" ? "Langkah pertama: buat akun untuk melindungi data penjualan Anda." : `Halo${a ? ", " + a.name : ""}. Masuk untuk melanjutkan mencatat penjualan.`;
    $("a-submit").firstElementChild.textContent = m === "register" ? "Buat Akun & Masuk" : "Masuk";
    $("a-pass").autocomplete = m === "register" ? "new-password" : "current-password";
    $("a-user").focus();
  }

  const score = p => (p.length >= 6) + (p.length >= 10) + (/[A-Z]/.test(p) && /\d/.test(p)) + (/[^A-Za-z0-9]/.test(p));
  function meter() { const s = score($("a-pass").value), m = $("meter").firstElementChild; m.style.width = s * 25 + "%"; m.style.background = s <= 1 ? "#e5594b" : s === 2 ? "#f2b134" : "#2f9e7a"; }

  async function submit(ev) {
    ev.preventDefault(); clear();
    const btn = $("a-submit"), v = id => $(id).value;
    btn.disabled = true; btn.classList.add("loading");
    try {
      let r;
      if (mode === "register") {
        r = await A.register({ name: v("a-name"), username: v("a-user"), password: v("a-pass"), confirm: v("a-pass2") });
        if (r.ok) r = await A.login(v("a-user"), v("a-pass"), true);
      } else r = await A.login(v("a-user"), v("a-pass"), $("a-remember").checked);
      if (r.ok) { btn.firstElementChild.textContent = "Berhasil…"; location.replace(next); return; }
      const f = { name: "a-name", user: "a-user", pass: "a-pass", pass2: "a-pass2" }[r.field];
      if (f && mode === "register") setErr(f, r.error); else banner(r.error);
      if (f) $(f).focus();
    } catch (e) { banner("Terjadi kesalahan. Muat ulang halaman lalu coba lagi."); }
    btn.disabled = false; btn.classList.remove("loading");
  }

  document.addEventListener("DOMContentLoaded", () => {
    setMode(mode);
    $("a-form").addEventListener("submit", submit);
    $("a-form").addEventListener("input", ev => { if (ev.target.id) { setErr(ev.target.id, ""); $("a-err").hidden = true; } if (ev.target.id === "a-pass") meter(); });
    $("pw-toggle").onclick = () => { const p = $("a-pass"), show = p.type === "password"; p.type = show ? "text" : "password"; $("pw-toggle").setAttribute("aria-label", show ? "Sembunyikan password" : "Tampilkan password"); $("pw-toggle").classList.toggle("on", show); };
    $("a-forgot").onclick = () => ($("reset-box").hidden = false);
    $("a-cancel").onclick = () => ($("reset-box").hidden = true);
    $("a-reset").onclick = () => { A.resetAccount(); setMode("register"); };
  });
})();
