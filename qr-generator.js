/*
 * SmartScanner - Generador de códigos QR de productos.
 * Crea un QR por producto con el formato que el escáner ya entiende:
 *     SMART|Nombre|Categoría|Cantidad|
 * Al escanearlo con la página "Escáner", se abre el formulario con el producto
 * ya completo (Entrada suma al inventario, Salida lo descuenta).
 * Usa la librería qrcode-generator (MIT) incluida en qrcode.js.
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var main = document.querySelector("main.main");
  if (!main || typeof qrcode !== "function") return;

  /* Productos con imagen (los mismos de item-emojis.js) y su categoría */
  var PRODUCTS = [
    { name: "Chile", cat: "Vegetales" },
    { name: "Huevo", cat: "Otros" },
    { name: "Leche", cat: "Lácteos" },
    { name: "Lechuga", cat: "Vegetales" },
    { name: "Manzana", cat: "Frutas" },
    { name: "Mantequilla", cat: "Lácteos" },
    { name: "Mortadela", cat: "Carnes" },
    { name: "Queso", cat: "Lácteos" },
    { name: "Salsa", cat: "Otros" },
    { name: "Tomate", cat: "Vegetales" },
    { name: "Uva", cat: "Frutas" },
    { name: "Yogurt", cat: "Lácteos" },
    { name: "Zanahoria", cat: "Vegetales" }
  ];
  var CATS = ["Frutas", "Vegetales", "Bebidas", "Lácteos", "Carnes", "Otros"];
  var STORE = "ss_qr_custom";

  function loadCustom() { try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch (e) { return []; } }
  function saveCustom(a) { try { localStorage.setItem(STORE, JSON.stringify(a)); } catch (e) {} }
  var custom = loadCustom();

  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  function clean(s) { return String(s || "").replace(/[|\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 50); }
  function payload(p, qty) { return "SMART|" + clean(p.name) + "|" + clean(p.cat) + "|" + qty + "|"; }

  /* ---------- Dibujo del QR en un canvas ---------- */
  function drawQR(canvas, text, size) {
    var qr = qrcode(0, "M");
    qr.addData(text, "Byte");
    qr.make();
    var n = qr.getModuleCount(), quiet = 4, cell = Math.max(2, Math.floor(size / (n + quiet * 2)));
    var full = cell * (n + quiet * 2);
    canvas.width = full; canvas.height = full;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, full, full);
    ctx.fillStyle = "#000";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    }
    return full;
  }
  window.ssDrawQR = drawQR;

  /* ---------- Página ---------- */
  var sec = document.createElement("section");
  sec.className = "page"; sec.id = "qr";
  sec.innerHTML =
    '<div class="ssQrWrap">' +
      '<div class="qrHead qrNoPrint"><h1>Códigos QR de productos</h1>' +
      '<p>Imprima o descargue un QR por producto. Al escanearlo desde <b>Escáner</b>, el producto aparece listo para registrar en el inventario.</p></div>' +
      '<div class="qrTools qrNoPrint">' +
        '<label class="qrField"><span>Cantidad por escaneo</span><input id="qrQty" type="number" min="1" max="999" value="1" inputmode="numeric"></label>' +
        '<button type="button" class="qrBtn primary" id="qrPrint">Imprimir etiquetas</button>' +
      '</div>' +
      '<details class="qrAdd qrNoPrint"><summary>Crear QR para otro producto</summary>' +
        '<form id="qrForm" class="qrForm" autocomplete="off">' +
          '<label class="qrField"><span>Nombre</span><input id="qrName" type="text" maxlength="50" placeholder="Ej. Zanahoria" required></label>' +
          '<label class="qrField"><span>Categoría</span><select id="qrCat">' + CATS.map(function (c) { return "<option>" + c + "</option>"; }).join("") + '</select></label>' +
          '<button type="submit" class="qrBtn">Agregar</button>' +
        '</form></details>' +
      '<div class="qrGrid" id="qrGrid"></div>' +
      '<div class="qrHelp qrNoPrint"><b>¿Cómo se usa?</b> Vaya a <b>Escáner</b>, elija <b>Entrada</b> o <b>Salida</b>, pulse <b>Iniciar cámara</b> y apunte al QR. Se abrirá el formulario con el producto; confirme con <b>Guardar</b>.</div>' +
    "</div>";
  main.appendChild(sec);

  var css = document.createElement("style");
  css.textContent =
    ".ssQrWrap{max-width:1100px;margin:0 auto}" +
    ".qrHead h1{margin:0 0 6px;font-size:1.8rem;color:#14243a}.qrHead p{margin:0;color:#12305e;max-width:720px}" +
    ".qrTools{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:20px 0 10px}" +
    ".qrField{display:flex;flex-direction:column;gap:5px;font-weight:700;font-size:.85rem;color:#12305e}" +
    ".qrField input,.qrField select{height:46px;border:1px solid #dbe6f1;border-radius:12px;padding:0 12px;font:inherit;background:#fff;color:#14243a;min-width:150px}" +
    ".qrBtn{height:46px;padding:0 20px;border:1.5px solid #c9dcf3;border-radius:12px;background:#fff;color:#1769e0;font:inherit;font-weight:800;cursor:pointer}" +
    ".qrBtn:hover{background:#f1f7ff}.qrBtn.primary{background:#1769e0;border-color:#1769e0;color:#fff}.qrBtn.primary:hover{background:#0f55bd}" +
    ".qrAdd{background:#fff;border:1px solid #e1eaf3;border-radius:16px;padding:12px 16px;margin:0 0 18px}.qrAdd summary{cursor:pointer;font-weight:800;color:#12305e}" +
    ".qrForm{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-top:12px}" +
    ".qrGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px}" +
    ".qrCard{background:#fff;border:1px solid #e1eaf3;border-radius:20px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;box-shadow:0 6px 18px rgba(20,60,110,.06)}" +
    ".qrCard .qrTop{display:flex;align-items:center;gap:10px;width:100%;justify-content:center}" +
    ".qrCard .ssEmoji{margin:0}" +
    ".qrCard b{font-size:1.1rem;color:#14243a}.qrCard small{color:#12305e}" +
    ".qrCanvas{width:100%;max-width:170px;height:auto;image-rendering:pixelated;border:1px solid #e1eaf3;border-radius:10px}" +
    ".qrCard .qrBtn{height:38px;font-size:.85rem;padding:0 14px;width:100%}" +
    ".qrRm{border:0;background:transparent;color:#b04545;font-size:.78rem;cursor:pointer;font-weight:700}" +
    ".qrHelp{margin-top:22px;padding:14px 16px;background:#e8f1ff;border-radius:14px;color:#12305e}" +
    "@media print{" +
      "body>*:not(.app){display:none !important}" +
      ".page:not(#qr){display:none !important}#qr{display:block !important}" +
      ".qrNoPrint{display:none !important}" +
      "body,.app,.main{background:#fff !important;padding:0 !important;margin:0 !important;max-width:none !important}" +
      ".qrGrid{grid-template-columns:repeat(3,1fr);gap:10px}" +
      ".qrCard{break-inside:avoid;box-shadow:none;border:1px dashed #888;border-radius:8px}" +
      ".qrCard .qrBtn,.qrRm{display:none !important}.qrCanvas{max-width:none;width:100%;border:0}" +
    "}";
  document.head.appendChild(css);

  /* ---------- Tarjetas ---------- */
  function qty() { var v = parseInt(($("qrQty") || {}).value, 10); return v > 0 && v < 1000 ? v : 1; }
  function visual(name, cat) { return typeof ssVisualFor === "function" ? '<span class="ssEmoji">' + ssVisualFor(name, cat) + "</span>" : ""; }

  function render() {
    var grid = $("qrGrid"), q = qty();
    var all = PRODUCTS.map(function (p) { return { p: p, custom: -1 }; })
      .concat(custom.map(function (p, i) { return { p: p, custom: i }; }));
    grid.innerHTML = all.map(function (o, i) {
      return '<div class="qrCard" data-i="' + i + '">' +
        '<div class="qrTop">' + visual(o.p.name, o.p.cat) + "<b>" + esc(o.p.name) + "</b></div>" +
        "<small>" + esc(o.p.cat) + " · cantidad " + q + "</small>" +
        '<canvas class="qrCanvas" aria-label="Código QR de ' + esc(o.p.name) + '"></canvas>' +
        '<button type="button" class="qrBtn" data-act="dl">Descargar PNG</button>' +
        (o.custom >= 0 ? '<button type="button" class="qrRm" data-act="rm" data-c="' + o.custom + '">Quitar</button>' : "") +
        "</div>";
    }).join("");
    var cards = grid.querySelectorAll(".qrCard");
    for (var k = 0; k < cards.length; k++) {
      drawQR(cards[k].querySelector("canvas"), payload(all[k].p, q), 340);
    }
    grid._all = all;
  }

  function download(p) {
    var qr = document.createElement("canvas");
    var s = drawQR(qr, payload(p, qty()), 600);
    var out = document.createElement("canvas");
    out.width = s; out.height = s + 90;
    var ctx = out.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(qr, 0, 0);
    ctx.fillStyle = "#14243a"; ctx.textAlign = "center";
    ctx.font = "bold 44px Arial, sans-serif";
    ctx.fillText(p.name, s / 2, s + 52, s - 40);
    out.toBlob(function (b) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "qr-" + clean(p.name).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-") + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, "image/png");
  }

  $("qrGrid").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-act]"); if (!btn) return;
    var card = btn.closest(".qrCard"), all = $("qrGrid")._all, o = all[+card.getAttribute("data-i")];
    if (btn.getAttribute("data-act") === "dl") download(o.p);
    else if (btn.getAttribute("data-act") === "rm") { custom.splice(+btn.getAttribute("data-c"), 1); saveCustom(custom); render(); }
  });
  $("qrQty").addEventListener("input", render);
  $("qrForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = clean($("qrName").value);
    if (!name) return;
    custom.push({ name: name, cat: $("qrCat").value });
    saveCustom(custom); $("qrName").value = ""; render();
  });
  $("qrPrint").addEventListener("click", function () { window.print(); });

  /* ---------- Entrada en el menú Configuración ---------- */
  var menu = $("ssCfgMenu");
  if (menu) {
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("data-p", "qr"); b.textContent = "Códigos QR";
    menu.appendChild(b);
  }
  render();
})();
