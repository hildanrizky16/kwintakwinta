/* receipt.js — pembuat kuitansi: HTML (layar/cetak), teks (bagikan), PDF (jsPDF), dan aksi bagikan. */
window.KK = window.KK || {};
KK.Receipt = (() => {
  const U = KK.Utils, e = U.esc, R = U.rupiah;
  const shortfall = t => Math.max(0, t.total - t.paid);
  const payLine = t => (shortfall(t) > 0 ? ["Kekurangan", R(shortfall(t))] : ["Kembalian", R(t.change)]);
  const contacts = s => [s.whatsapp && "WA " + s.whatsapp, s.email, s.instagram].filter(Boolean);
  const qtyText = q => String(q).replace(".", ",");
  const noteOf = s => s.receiptNote || "Terima kasih telah berbelanja.";
  const row = (l, v, cls = "") => `<div class="r-row ${cls}"><span>${l}</span><span>${v}</span></div>`;

  function html(t, items, s) {
    const ok = t.status === "Lunas", [pl, pv] = payLine(t), c = contacts(s);
    return `<article class="receipt" id="receipt">
      <header class="r-head">${s.logo ? `<img class="r-logo" src="${e(s.logo)}" alt="Logo">` : ""}
        <h2 class="r-store">${e(s.name || "Toko Saya")}</h2>
        ${s.address ? `<p>${e(s.address)}</p>` : ""}${c.length ? `<p>${c.map(e).join(" · ")}</p>` : ""}</header>
      <div class="r-title">KUITANSI PEMBAYARAN</div>
      <div class="r-meta">${row("No", `<strong>${e(t.number)}</strong>`)}${row("Tanggal", `${U.longDate(t.date)}, ${e(t.time)}`)}${row("Customer", t.customerName ? e(t.customerName) : "Umum")}</div>
      <div class="r-block">${items.map(i => `<div class="r-item"><div class="r-name">${e(i.name)}</div>
        ${row(`${qtyText(i.qty)} × ${R(i.price)}`, R(i.price * i.qty))}
        ${i.discount ? row("Diskon item", "−" + R(i.discount), "r-sub") : ""}</div>`).join("")}</div>
      <div class="r-block">${row("Subtotal", R(t.subtotal))}${t.discount ? row("Diskon", "−" + R(t.discount)) : ""}${t.shipping ? row("Ongkir", R(t.shipping)) : ""}
        ${row("TOTAL", R(t.total), "r-total")}</div>
      <div class="r-block">${row("Pembayaran", e(t.paymentMethod))}${row("Dibayar", R(t.paid))}${row(pl, pv)}</div>
      ${t.note ? `<p class="r-note">Catatan: ${e(t.note)}</p>` : ""}
      <div class="r-stamp ${ok ? "" : "warn"}">${e(t.status.toUpperCase())}</div>
      <p class="r-thanks">${e(noteOf(s))}</p></article>`;
  }

  function text(t, items, s) {
    const [pl, pv] = payLine(t), L = [];
    L.push(s.name || "Toko Saya", "KUITANSI PEMBAYARAN", `No: ${t.number}`, `Tanggal: ${U.longDate(t.date)}, ${t.time}`, `Customer: ${t.customerName || "Umum"}`, "");
    items.forEach(i => L.push(`${i.name}`, `  ${qtyText(i.qty)} x ${R(i.price)} = ${R(i.price * i.qty)}` + (i.discount ? ` (diskon ${R(i.discount)})` : "")));
    L.push("", `Subtotal: ${R(t.subtotal)}`);
    if (t.discount) L.push(`Diskon: -${R(t.discount)}`);
    if (t.shipping) L.push(`Ongkir: ${R(t.shipping)}`);
    L.push(`TOTAL: ${R(t.total)}`, `Pembayaran: ${t.paymentMethod}`, `Dibayar: ${R(t.paid)}`, `${pl}: ${pv}`, `Status: ${t.status.toUpperCase()}`, "", noteOf(s));
    return L.join("\n");
  }

  /* ---------- PDF (struk 80 mm, tinggi menyesuaikan isi) ---------- */
  function prepLogo(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const img = new Image();
      img.onload = () => { try { const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0); res({ data: c.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight }); } catch (x) { res(null); } };
      img.onerror = () => res(null);
      img.src = src;
    });
  }

  function draw(doc, t, items, s, logo) {
    const W = 80, m = 5, cw = W - 2 * m; let y = 8;
    const font = (b, size) => { doc.setFont("helvetica", b ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(20); };
    const center = (txt, size, b, color) => { font(b, size); if (color) doc.setTextColor(color); doc.splitTextToSize(String(txt), cw).forEach(l => { doc.text(l, W / 2, y, { align: "center" }); y += size * 0.43; }); };
    const rw = (l, r, b = false, size = 9) => { font(b, size); doc.text(String(l), m, y); doc.text(String(r), W - m, y, { align: "right" }); y += size * 0.5; };
    const dash = () => { y += 1; doc.setLineDashPattern([0.8, 0.8], 0); doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(m, y, W - m, y); doc.setLineDashPattern([], 0); y += 4.5; };
    if (logo) { const h = 14, w = Math.min(40, h * logo.ratio); try { doc.addImage(logo.data, "PNG", (W - w) / 2, y, w, w / logo.ratio); y += w / logo.ratio + 3; } catch (x) { /* abaikan logo */ } }
    center(s.name || "Toko Saya", 14, true); y += 1;
    if (s.address) center(s.address, 8, false, 90);
    const c = contacts(s); if (c.length) center(c.join("  |  "), 8, false, 90);
    dash(); center("KUITANSI PEMBAYARAN", 9, true); y += 2;
    rw("No", t.number, true); rw("Tanggal", `${U.longDate(t.date)}, ${t.time}`); rw("Customer", t.customerName || "Umum");
    dash();
    items.forEach(i => {
      font(true, 9); doc.splitTextToSize(i.name, cw).forEach(l => { doc.text(l, m, y); y += 4.2; });
      rw(`${qtyText(i.qty)} x ${R(i.price)}`, R(i.price * i.qty), false, 8.5);
      if (i.discount) rw("Diskon item", "-" + R(i.discount), false, 8);
      y += 1.5;
    });
    dash();
    rw("Subtotal", R(t.subtotal)); if (t.discount) rw("Diskon", "-" + R(t.discount)); if (t.shipping) rw("Ongkir", R(t.shipping));
    y += 1; rw("TOTAL", R(t.total), true, 12); dash();
    const [pl, pv] = payLine(t);
    rw("Pembayaran", t.paymentMethod); rw("Dibayar", R(t.paid)); rw(pl, pv, true); y += 2;
    if (t.note) { center("Catatan: " + t.note, 8, false, 90); y += 1; }
    center(`*** ${t.status.toUpperCase()} ***`, 10, true); y += 2;
    center(noteOf(s), 8.5, false, 60);
    return y;
  }

  async function pdf(t, items, s) {
    if (!(window.jspdf && window.jspdf.jsPDF)) throw new Error("jsPDF tidak termuat");
    const { jsPDF } = window.jspdf, logo = await prepLogo(s.logo);
    const h = draw(new jsPDF({ unit: "mm", format: [80, 600] }), t, items, s, logo);
    const doc = new jsPDF({ unit: "mm", format: [80, Math.max(h + 8, 90)] });
    draw(doc, t, items, s, logo);
    return doc;
  }
  const download = async (t, items, s) => (await pdf(t, items, s)).save(`${t.number}.pdf`);

  /** Bagikan: PDF (jika didukung) -> teks (Web Share) -> salin ke clipboard. */
  async function share(t, items, s) {
    const title = `Kuitansi ${t.number}`, body = text(t, items, s);
    try {
      if (navigator.canShare && window.jspdf) {
        const file = new File([(await pdf(t, items, s)).output("blob")], `${t.number}.pdf`, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title, text: body }); return "shared"; }
      }
      if (navigator.share) { await navigator.share({ title, text: body }); return "shared"; }
      await navigator.clipboard.writeText(body); return "copied";
    } catch (err) { if (err && err.name === "AbortError") return "cancel"; throw err; }
  }

  return { html, text, pdf, download, share };
})();
