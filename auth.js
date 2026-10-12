/* auth.js — login lokal. Dimuat di <head> semua halaman; halaman terproteksi otomatis diarahkan ke login.html.
   CATATAN: tanpa server, ini pengaman tingkat aplikasi (mencegah orang awam membuka aplikasi), bukan keamanan tingkat bank. */
window.KK = window.KK || {};
KK.Auth = (() => {
  const P = "kwintakwinta:",
    AK = P + "account",
    SK = P + "session",
    DAYS = 30;
  const rd = (st, k) => {
    try {
      return JSON.parse(st.getItem(k));
    } catch (e) {
      return null;
    }
  };
  const wr = (st, k, v) => {
    try {
      st.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  };
  const rm = (st, k) => {
    try {
      st.removeItem(k);
    } catch (e) {
      /* abaikan */
    }
  };
  const rand = () => {
    const a = new Uint8Array(16),
      c = window.crypto;
    if (c && c.getRandomValues) c.getRandomValues(a);
    else a.forEach((_, i) => (a[i] = Math.random() * 256));
    return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
  };
  const cyrb53 = (s) => {
    let h1 = 0xdeadbeef,
      h2 = 0x41c6ce57;
    for (let i = 0, ch; i < s.length; i++) {
      ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 =
      Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
      Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 =
      Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
      Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  };

  /** Password tidak disimpan polos: PBKDF2-SHA256 + salt (cadangan sederhana bila browser tidak mendukung WebCrypto). */
  async function hash(pw, salt, ver) {
    if (ver === "p1") {
      if (!(window.crypto && crypto.subtle))
        throw new Error(
          "Browser ini tidak mendukung verifikasi password. Buka lewat http://127.0.0.1 atau localhost.",
        );
      const enc = new TextEncoder(),
        key = await crypto.subtle.importKey(
          "raw",
          enc.encode(pw),
          "PBKDF2",
          false,
          ["deriveBits"],
        );
      const bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: enc.encode(salt),
          iterations: 100000,
          hash: "SHA-256",
        },
        key,
        256,
      );
      return [...new Uint8Array(bits)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    return cyrb53(salt + pw);
  }

  const acct = () => rd(localStorage, AK);
  const hasAccount = () => !!acct();
  const account = () => {
    const a = acct();
    return a ? { name: a.name, username: a.username } : null;
  };
  const readSession = () => rd(sessionStorage, SK) || rd(localStorage, SK);

  function isLoggedIn() {
    const s = readSession(),
      a = acct();
    return !!(
      s &&
      a &&
      s.accountId === a.id &&
      (!s.expires || s.expires > Date.now())
    );
  }

  async function register({ name, username, password, confirm }) {
    const u = (username || "").trim().toLowerCase();
    if (!(name || "").trim())
      return { ok: false, field: "name", error: "Nama wajib diisi." };
    if (!/^[a-z0-9._]{3,}$/.test(u))
      return {
        ok: false,
        field: "user",
        error:
          "Username minimal 3 karakter: huruf, angka, titik, atau garis bawah.",
      };
    if ((password || "").length < 6)
      return {
        ok: false,
        field: "pass",
        error: "Password minimal 6 karakter.",
      };
    if (password !== confirm)
      return {
        ok: false,
        field: "pass2",
        error: "Konfirmasi password tidak sama.",
      };
    const ver = window.crypto && crypto.subtle ? "p1" : "w1",
      salt = rand();
    const ok = wr(localStorage, AK, {
      id: rand(),
      name: name.trim(),
      username: u,
      salt,
      v: ver,
      hash: await hash(password, salt, ver),
      createdAt: new Date().toISOString(),
    });
    return ok
      ? { ok: true }
      : {
          ok: false,
          error:
            "Akun gagal disimpan. Pastikan browser tidak dalam mode privat.",
        };
  }

  async function login(username, password, remember) {
    const a = acct();
    if (!a)
      return {
        ok: false,
        error: "Belum ada akun. Silakan buat akun terlebih dahulu.",
      };
    let good = false;
    try {
      good =
        (username || "").trim().toLowerCase() === a.username &&
        (await hash(password || "", a.salt, a.v)) === a.hash;
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!good)
      return {
        ok: false,
        field: "pass",
        error: "Username atau password salah.",
      };
    const s = {
      accountId: a.id,
      username: a.username,
      name: a.name,
      expires: remember ? Date.now() + DAYS * 864e5 : null,
    };
    rm(sessionStorage, SK);
    rm(localStorage, SK);
    return wr(remember ? localStorage : sessionStorage, SK, s)
      ? { ok: true }
      : {
          ok: false,
          error:
            "Sesi gagal disimpan. Pastikan browser tidak dalam mode privat.",
        };
  }

  const logout = () => {
    rm(sessionStorage, SK);
    rm(localStorage, SK);
    location.href = "login.html";
  };
  /** Hapus akun & sesi (data penjualan dan pengaturan toko tidak disentuh). */
  const resetAccount = () => {
    rm(sessionStorage, SK);
    rm(localStorage, SK);
    rm(localStorage, AK);
  };

  function guard() {
    if (isLoggedIn()) return;
    document.documentElement.style.visibility = "hidden";
    location.replace(
      "login.html?next=" +
        encodeURIComponent(
          (location.pathname.split("/").pop() || "dashboard.html") +
            location.search,
        ),
    );
  }

  const me = document.currentScript;
  if (!(me && me.hasAttribute("data-public"))) guard();

  return {
    hasAccount,
    account,
    isLoggedIn,
    register,
    login,
    logout,
    resetAccount,
    guard,
  };
})();
