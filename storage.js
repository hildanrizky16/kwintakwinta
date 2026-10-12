/* storage.js — satu-satunya lapisan yang menyentuh localStorage.
   Untuk pindah ke backend nanti, cukup ganti isi file ini (API tetap sama). */
window.KK = window.KK || {};
KK.Storage = (() => {
  const PREFIX = "kwintakwinta:";
  const DEFAULT_STORE = {
    id: "main",
    name: "Anugrah Store",
    address: "Sidoarjo, Jawa Timur",
    whatsapp: "08xxxxxxxxxx",
    email: "",
    instagram: "@anugrahstore",
    logo: "",
    receiptNote: "Terima kasih telah berbelanja.",
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      KK.UI &&
        KK.UI.toast(
          "Data gagal disimpan. Penyimpanan browser mungkin penuh.",
          "error",
        );
      return false;
    }
  }

  // Tabel generik: products, transactions, transactionItems
  const all = (table) => read(table, []);
  const saveAll = (table, rows) => write(table, rows);
  const insert = (table, row) => {
    const rows = all(table);
    rows.push(row);
    return saveAll(table, rows);
  };
  const update = (table, id, patch) =>
    saveAll(
      table,
      all(table).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  const remove = (table, id) =>
    saveAll(
      table,
      all(table).filter((r) => r.id !== id),
    );
  const findById = (table, id) => all(table).find((r) => r.id === id) || null;

  const getStore = () => read("stores", [DEFAULT_STORE])[0] || DEFAULT_STORE;
  const saveStore = (store) =>
    write("stores", [{ ...getStore(), ...store, id: "main" }]);
  const getSettings = () => read("settings", {});
  const saveSettings = (s) => write("settings", { ...getSettings(), ...s });

  /* ---------- Data demo ---------- */
  const P = {
    A: ["Parfum A", "PRF001", 75000],
    B: ["Parfum B", "PRF002", 50000],
    L: ["Body Lotion", "BDL001", 35000],
    H: ["Hand Cream", "HCR001", 28000],
    K: ["Lip Balm", "LPB001", 22000],
  };
  const line = (k, qty, disc = 0) => [...P[k], qty, disc];
  // [hariLalu, jam, customer, wa, items, diskon, ongkir, metode, dibayar(opsional)]
  const DEMO_TX = [
    [
      0,
      null,
      "Budi",
      "081234567801",
      [line("A", 2, 5000), line("B", 1)],
      5000,
      10000,
      "Cash",
    ],
    [0, null, "Sari", "081234567802", [line("L", 3)], 0, 0, "QRIS"],
    [0, null, "", "", [line("K", 2)], 0, 0, "Cash"],
    [
      0,
      null,
      "Dewi",
      "081234567803",
      [line("H", 1), line("B", 1)],
      0,
      12000,
      "Transfer",
    ],
    [
      1,
      "16:30",
      "Rina",
      "081234567804",
      [line("A", 1), line("L", 2)],
      0,
      9000,
      "E-Wallet",
    ],
    [1, "11:05", "Budi", "081234567801", [line("B", 2)], 5000, 0, "Cash"],
    [
      2,
      "14:40",
      "Agus",
      "081234567805",
      [line("L", 4), line("K", 3)],
      10000,
      15000,
      "Transfer",
    ],
    [3, "09:50", "", "", [line("H", 2)], 0, 0, "QRIS"],
    [
      3,
      "17:15",
      "Sari",
      "081234567802",
      [line("A", 3)],
      15000,
      20000,
      "Transfer",
      150000,
    ],
    [
      5,
      "13:00",
      "Maya",
      "081234567806",
      [line("B", 1), line("K", 1)],
      0,
      0,
      "Debit",
    ],
    [
      6,
      "10:20",
      "Dewi",
      "081234567803",
      [line("A", 1), line("H", 2), line("L", 1)],
      0,
      11000,
      "QRIS",
    ],
    [7, "15:45", "Hadi", "081234567807", [line("L", 5)], 5000, 0, "Cash"],
  ];

  function buildDemo() {
    const now = new Date(),
      nowMin = now.getHours() * 60 + now.getMinutes();
    const U = KK.Utils;
    const rows = DEMO_TX.map((t, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - t[0]);
      let time = t[1];
      if (!time) {
        const m = Math.max(5, nowMin - (i + 1) * 25);
        time = `${U.pad(Math.floor(m / 60))}:${U.pad(m % 60)}`;
      }
      return { t, date: U.ymd(d), time };
    }).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const transactions = [],
      items = [];
    rows.forEach(({ t, date, time }) => {
      const id = U.uid();
      const its = t[4].map(([name, sku, price, qty, disc]) => ({
        id: U.uid(),
        transactionId: id,
        name,
        sku,
        price,
        qty,
        discount: disc,
        subtotal: price * qty - disc,
        demo: true,
      }));
      const subtotal = its.reduce((s, x) => s + x.subtotal, 0);
      const total = subtotal - t[5] + t[6];
      const paid =
        t[8] ?? (t[7] === "Cash" ? Math.ceil(total / 50000) * 50000 : total);
      transactions.push({
        id,
        number: U.receiptNumber(date, transactions),
        date,
        time,
        customerName: t[2],
        customerPhone: t[3],
        note: "",
        subtotal,
        discount: t[5],
        shipping: t[6],
        total,
        paymentMethod: t[7],
        paid,
        change: Math.max(0, paid - total),
        status: paid >= total ? "Lunas" : "Belum Lunas",
        createdAt: `${date}T${time}`,
        demo: true,
      });
      items.push(...its);
    });
    const products = [
      [P.A, 20],
      [P.B, 35],
      [P.L, 48],
      [P.H, 12],
      [P.K, 60],
    ].map(([p, stock]) => ({
      id: U.uid(),
      name: p[0],
      sku: p[1],
      price: p[2],
      cost: Math.round(p[2] * 0.6),
      stock,
      unit: "pcs",
      demo: true,
    }));
    return { transactions, items, products };
  }

  function seedDemo(force = false) {
    const s = getSettings();
    if (s.demoLoaded && !force) return false;
    const d = buildDemo();
    saveAll("transactions", [...all("transactions"), ...d.transactions]);
    saveAll("transactionItems", [...all("transactionItems"), ...d.items]);
    saveAll("products", [...all("products"), ...d.products]);
    saveSettings({ demoLoaded: true });
    return true;
  }

  /** Hapus hanya data bertanda demo; data buatan pengguna tidak tersentuh. */
  function resetDemo() {
    ["transactions", "transactionItems", "products"].forEach((t) =>
      saveAll(
        t,
        all(t).filter((r) => !r.demo),
      ),
    );
  }
  const hasDemo = () =>
    ["transactions", "products"].some((t) => all(t).some((r) => r.demo));

  function init() {
    if (!read("stores", null)) write("stores", [DEFAULT_STORE]);
    seedDemo();
  }

  /* ---------- Backup & pemulihan ---------- */
  const KEYS = [
    "stores",
    "products",
    "transactions",
    "transactionItems",
    "settings",
  ];
  const exportAll = () => ({
    app: "kwintakwinta",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: Object.fromEntries(
      KEYS.map((k) => [k, read(k, k === "settings" ? {} : [])]),
    ),
  });
  const isValidBackup = (o) =>
    !!(
      o &&
      o.app === "kwintakwinta" &&
      o.data &&
      ["products", "transactions", "transactionItems"].every((k) =>
        Array.isArray(o.data[k]),
      )
    );
  function importAll(o) {
    if (!isValidBackup(o)) return false;
    KEYS.forEach((k) => {
      if (o.data[k] !== undefined) write(k, o.data[k]);
    });
    saveSettings({ demoLoaded: true });
    return true;
  }
  /** Hapus semua transaksi & produk (pengaturan toko tetap). Data demo tidak dimuat ulang. */
  function wipeSalesData() {
    ["products", "transactions", "transactionItems"].forEach((k) =>
      write(k, []),
    );
    saveSettings({ demoLoaded: true });
  }

  return {
    all,
    saveAll,
    insert,
    update,
    remove,
    findById,
    getStore,
    saveStore,
    getSettings,
    saveSettings,
    seedDemo,
    resetDemo,
    hasDemo,
    init,
    exportAll,
    isValidBackup,
    importAll,
    wipeSalesData,
  };
})();
