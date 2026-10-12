/* pengaturan.js — Pengaturan Toko, logo, pratinjau kuitansi, backup & pemulihan. */
(() => {
  const U = KK.Utils,
    S = KK.Storage,
    $ = (id) => document.getElementById(id);
  const FIELDS = [
    "name",
    "address",
    "whatsapp",
    "email",
    "instagram",
    "receiptNote",
  ];
  let logo = "";
  const draft = () => ({
    ...Object.fromEntries(FIELDS.map((k) => [k, $("s-" + k).value.trim()])),
    logo,
  });

  function renderPreview() {
    const d = U.ymd();
    const items = [
      { name: "Parfum A", qty: 2, price: 75000, discount: 5000 },
      { name: "Parfum B", qty: 1, price: 50000, discount: 0 },
    ];
    const t = {
      number: `KT-${d.replace(/-/g, "")}-001`,
      date: d,
      time: U.hm(),
      customerName: "Budi",
      note: "",
      subtotal: 195000,
      discount: 0,
      shipping: 10000,
      total: 205000,
      paymentMethod: "Cash",
      paid: 250000,
      change: 45000,
      status: "Lunas",
    };
    $("preview").innerHTML = KK.Receipt.html(t, items, draft());
    const name = $("s-name").value.trim();
    $("logo-box").innerHTML = logo
      ? `<img src="${U.esc(logo)}" alt="Logo toko">`
      : `<span>${U.esc((name[0] || "K").toUpperCase())}</span>`;
    $("btn-logo-del").hidden = !logo;
  }

  const setErr = (id, msg) => {
    const el = $(id);
    el.classList.toggle("invalid", !!msg);
    el.closest("label").querySelector(".err").textContent = msg || "";
  };

  function save() {
    const d = draft(),
      e = {};
    if (!d.name) e.name = "Nama toko wajib diisi.";
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email))
      e.email = "Format email belum benar.";
    if (d.whatsapp && /[^\d\s+\-()]/.test(d.whatsapp))
      e.whatsapp = "Gunakan angka saja, contoh 081234567890.";
    ["name", "email", "whatsapp"].forEach((k) => setErr("s-" + k, e[k]));
    if (Object.keys(e).length) {
      KK.UI.toast("Periksa kembali data yang berwarna merah.", "error");
      const f = document.querySelector(".invalid");
      f && f.focus();
      return;
    }
    if (!S.saveStore(d)) return;
    const mark = document.querySelector(".brand-mark"),
      foot = document.querySelector(".side-foot strong"); // perbarui sidebar langsung
    if (mark)
      mark.innerHTML = d.logo ? `<img src="${U.esc(d.logo)}" alt="">` : "K";
    if (foot) foot.textContent = d.name;
    KK.UI.toast("Pengaturan toko berhasil disimpan.");
  }

  /** Validasi, kecilkan (maks 400 px), dan ubah ke data URL. */
  function processLogo(file) {
    return new Promise((ok, fail) => {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.type))
        return fail(new Error("Format harus PNG, JPG, atau WebP."));
      if (file.size > 5 * 1024 * 1024)
        return fail(new Error("Ukuran file maksimal 5 MB."));
      const fr = new FileReader();
      fr.onerror = () => fail(new Error("File tidak dapat dibaca."));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => fail(new Error("Gambar tidak dapat dibaca."));
        img.onload = () => {
          const k = Math.min(1, 400 / Math.max(img.width, img.height)),
            c = document.createElement("canvas");
          c.width = Math.round(img.width * k);
          c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          ok(
            c.toDataURL(
              file.type === "image/jpeg" ? "image/jpeg" : "image/png",
              0.9,
            ),
          );
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const st = S.getStore();
    logo = st.logo || "";
    FIELDS.forEach((k) => ($("s-" + k).value = st[k] || ""));
    renderPreview();
    document.addEventListener("input", (ev) => {
      if (ev.target.id && ev.target.id.startsWith("s-")) {
        ev.target.classList.remove("invalid");
        renderPreview();
      }
    });
    document.addEventListener("keydown", (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
        ev.preventDefault();
        save();
      }
    });
    $("btn-save").onclick = save;
    const me = KK.Auth && KK.Auth.account();
    $("acct-info").textContent = me
      ? `Masuk sebagai ${me.name} (@${me.username}). Login tersimpan di perangkat ini.`
      : "";
    $("btn-logout2").onclick = () =>
      KK.UI.confirm(
        "Keluar dari aplikasi?",
        "Anda perlu login lagi untuk membuka kwintakwinta. Data penjualan tetap tersimpan.",
        "Keluar",
        () => KK.Auth.logout(),
      );

    $("btn-logo").onclick = () => $("file-logo").click();
    $("btn-logo-del").onclick = () => {
      logo = "";
      renderPreview();
      KK.UI.toast(
        "Logo dihapus. Klik Simpan Pengaturan untuk menerapkan.",
        "info",
      );
    };
    $("file-logo").onchange = async (ev) => {
      const f = ev.target.files[0];
      ev.target.value = "";
      if (!f) return;
      try {
        logo = await processLogo(f);
        renderPreview();
        KK.UI.toast(
          "Logo siap. Klik Simpan Pengaturan untuk menerapkan.",
          "info",
        );
      } catch (err) {
        KK.UI.toast(err.message, "error");
      }
    };

    $("btn-export").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(S.exportAll(), null, 2)], {
          type: "application/json",
        }),
      );
      a.download = `kwintakwinta-backup-${U.ymd()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      KK.UI.toast("Backup berhasil diunduh.");
    };
    $("btn-import").onclick = () => $("file-import").click();
    $("file-import").onchange = async (ev) => {
      const f = ev.target.files[0];
      ev.target.value = "";
      if (!f) return;
      let obj;
      try {
        obj = JSON.parse(await f.text());
      } catch (x) {
        return KK.UI.toast(
          "File bukan backup kwintakwinta yang valid.",
          "error",
        );
      }
      if (!S.isValidBackup(obj))
        return KK.UI.toast(
          "File bukan backup kwintakwinta yang valid.",
          "error",
        );
      KK.UI.confirm(
        "Pulihkan backup?",
        `Semua data saat ini akan diganti dengan isi backup (${obj.data.transactions.length} transaksi, ${obj.data.products.length} produk).`,
        "Pulihkan",
        () => {
          S.importAll(obj);
          KK.UI.toast("Backup berhasil dipulihkan.");
          setTimeout(() => location.reload(), 900);
        },
      );
    };
    $("btn-wipe").onclick = () =>
      KK.UI.confirm(
        "Hapus semua transaksi & produk?",
        "Seluruh riwayat penjualan dan daftar produk akan dihapus permanen. Pengaturan toko tidak terhapus. Unduh backup dulu bila perlu.",
        "Hapus semua",
        () => {
          S.wipeSalesData();
          KK.UI.toast("Semua transaksi dan produk berhasil dihapus.");
          setTimeout(() => (location.href = "dashboard.html"), 900);
        },
      );
  });
})();
