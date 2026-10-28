/*
 * SmartScanner - Emojis automáticos por producto.
 * Asigna un emoji según el nombre (y, si no hay coincidencia, según la categoría)
 * y lo muestra en el inventario, el dashboard y las alertas.
 * No guarda nada en Firebase: el emoji se calcula al mostrar.
 */
(function () {
  "use strict";

  // Palabras clave (sin tildes, minúsculas) -> emoji. El orden importa: lo más específico primero.
  var RULES = [
    ["🥬", "lechuga repollo col acelga espinaca kale"],
    ["🍅", "tomate"],
    ["🥚", "huevo"],
    ["🥛", "leche"],
    ["🧀", "queso"],
    ["🥣", "yogur yogurt yoghurt"],
    ["🧈", "mantequilla margarina"],
    ["🍎", "manzana"],
    ["🍌", "banano banana guineo platano"],
    ["🍊", "naranja mandarina"],
    ["🍋", "limon lima"],
    ["🍇", "uva"],
    ["🍓", "fresa"],
    ["🍉", "sandia"],
    ["🍈", "melon"],
    ["🍍", "pina"],
    ["🥭", "mango"],
    ["🍑", "durazno melocoton"],
    ["🍐", "pera"],
    ["🥝", "kiwi"],
    ["🥑", "aguacate"],
    ["🥥", "coco"],
    ["🫐", "mora arandano"],
    ["🥕", "zanahoria"],
    ["🥔", "papa patata"],
    ["🧅", "cebolla"],
    ["🧄", "ajo"],
    ["🌽", "maiz elote"],
    ["🥒", "pepino"],
    ["🥦", "brocoli coliflor"],
    ["🫑", "chile pimiento"],
    ["🌶️", "picante jalapeno"],
    ["🍆", "berenjena"],
    ["🍄", "hongo champinon"],
    ["🥜", "mani cacahuate nuez almendra"],
    ["🍞", "pan tostada"],
    ["🥐", "croissant"],
    ["🍚", "arroz"],
    ["🍝", "pasta espagueti fideo macarron"],
    ["🥣", "cereal avena"],
    ["🫘", "frijol lenteja garbanzo"],
    ["🍗", "pollo pavo"],
    ["🥩", "carne res bistec filete cerdo chuleta"],
    ["🥓", "tocino bacon jamon"],
    ["🌭", "salchicha chorizo"],
    ["🐟", "pescado atun salmon tilapia sardina"],
    ["🦐", "camaron marisco"],
    ["🧃", "jugo"],
    ["☕", "cafe"],
    ["🍵", "te infusion"],
    ["💧", "agua"],
    ["🥤", "refresco gaseosa soda cola"],
    ["🍺", "cerveza"],
    ["🍷", "vino"],
    ["🍫", "chocolate"],
    ["🍪", "galleta"],
    ["🍬", "dulce caramelo"],
    ["🍯", "miel"],
    ["🧂", "sal azucar"],
    ["🫒", "aceite aceituna oliva"],
    ["🍦", "helado"],
    ["🧻", "papel higienico servilleta"],
    ["🧼", "jabon detergente cloro limpiador"]
  ];

  var BY_CAT = {
    "frutas": "🍎", "vegetales": "🥬", "bebidas": "🥤",
    "lacteos": "🥛", "carnes": "🥩", "otros": "🛒"
  };

  function norm(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }

  var cache = {};
  function emojiFor(name, cat) {
    var key = norm(name) + "|" + norm(cat);
    if (cache[key]) return cache[key];
    var n = " " + norm(name).replace(/[^a-z0-9ñ ]/g, " ") + " ";
    var found = "";
    for (var i = 0; i < RULES.length && !found; i++) {
      var words = RULES[i][1].split(" ");
      for (var j = 0; j < words.length; j++) {
        // coincide la palabra o su plural simple (tomate/tomates)
        if (n.indexOf(" " + words[j] + " ") > -1 || n.indexOf(" " + words[j] + "s ") > -1 ||
            n.indexOf(" " + words[j] + "es ") > -1) { found = RULES[i][0]; break; }
      }
    }
    if (!found) found = BY_CAT[norm(cat)] || "🛒";
    cache[key] = found;
    return found;
  }
  window.ssEmojiFor = emojiFor;

  /* ---------- Imágenes estáticas (versión 2) ----------
   * Cada línea: [archivo en img/productos/, "palabras que activan esa imagen"].
   * Se reconocen singular y plural (huevo/huevos, tomate/tomates, uva/uvas...).
   * Las reglas más específicas van primero (ej. "salsa de tomate" -> salsa, no tomate).
   * Para agregar un producto: copie la imagen a public/img/productos/ y añada una línea. */
  var IMAGES = [
    ["salsa.png",       "salsa ketchup kétchup catsup kechup"],
    ["mantequilla.png", "mantequilla matequilla margarina"],
    ["yogurt.png",      "yogurt yogur yogures yoghurt yogourt"],
    ["mortadela.png",   "mortadela"],
    ["lechuga.png",     "lechuga"],
    ["tomate.png",      "tomate tomatico"],
    ["huevo.png",       "huevo"],
    ["queso.png",       "queso"],
    ["manzana.png",     "manzana"],
    ["uva.png",         "uva"],
    ["leche.png",       "leche"]
  ];
  var IMG_DIR = "img/productos/";

  function escRe(w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  var IMG_RULES = IMAGES.map(function (r) {
    var words = r[1].split(" ").map(function (w) { return escRe(norm(w)); });
    // palabra completa, con plural opcional (s / es)
    return [r[0], new RegExp("(^|[^a-z0-9])(" + words.join("|") + ")(s|es)?([^a-z0-9]|$)")];
  });
  var imgCache = {};
  function imageFor(name) {
    var n = norm(name);
    if (imgCache[n] !== undefined) return imgCache[n];
    var found = "";
    for (var i = 0; i < IMG_RULES.length; i++) {
      if (IMG_RULES[i][1].test(n)) { found = IMG_DIR + IMG_RULES[i][0]; break; }
    }
    imgCache[n] = found;
    return found;
  }
  window.ssImageFor = imageFor;

  // HTML del ícono: imagen estática si existe; si no, el emoji de respaldo
  function visualFor(name, cat) {
    var src = imageFor(name);
    if (src) return '<img class="ssImg" src="' + src + '" alt="" width="64" height="64" loading="lazy" decoding="async" draggable="false">';
    return emojiFor(name, cat);
  }
  window.ssVisualFor = visualFor;

  /* ---------- Estilos ---------- */
  var st = document.createElement("style");
  st.textContent =
    ".ssEmoji{display:inline-grid;place-items:center;flex:0 0 46px;width:46px;height:46px;min-width:46px;border-radius:15px;margin-right:12px;" +
    "background:linear-gradient(145deg,#eef8ff,#d9eefb);font-size:25px;line-height:1;" +
    "font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif}" +
    ".ssEmoji.sm{flex-basis:34px;width:34px;min-width:34px;height:34px;border-radius:11px;font-size:19px;margin-right:10px}" +
    ".dashProductName{min-width:0}" +
    ".dashProductTop,.recentProduct{display:flex;align-items:center}" +
    ".alertItem{align-items:center}" +
    ".recentProduct,.alertInfo{min-width:0}" +
    ".ssEmoji,.ssEmojiBig{overflow:hidden;grid-template-columns:100%;grid-template-rows:100%}" +
    ".ssEmoji .ssImg,.ssEmojiBig .ssImg{width:100%;height:100%;min-width:0;min-height:0;object-fit:contain;padding:5px;box-sizing:border-box;display:block;user-select:none}" +
    ".ssEmoji.sm .ssImg{padding:3px}";
  document.head.appendChild(st);

  function tile(name, cat, small) {
    return '<span class="ssEmoji' + (small ? " sm" : "") + '" aria-hidden="true">' + visualFor(name, cat) + "</span>";
  }

  /* ---------- Inventario: tarjeta de producto ---------- */
  var origCard = window.itemCard;
  if (typeof origCard === "function") {
    window.itemCard = function (p) {
      var html = origCard(p);
      return html.replace('<div class="itemHeading">', '<div class="itemHeading">' + tile(p.name, p.cat));
    };
  }

  /* ---------- Dashboard: se decora el DOM después de dibujarlo ---------- */
  function decorate(sel, nameSel, catSel, small, host) {
    var nodes = document.querySelectorAll(sel);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.querySelector(".ssEmoji")) continue;
      var n = el.querySelector(nameSel), c = catSel ? el.querySelector(catSel) : null;
      if (!n) continue;
      var target = host ? el.querySelector(host) : el;
      if (!target) continue;
      target.insertAdjacentHTML("afterbegin", tile(n.textContent, c ? c.textContent : "", small));
    }
  }

  var origDash = window.renderDashboard;
  if (typeof origDash === "function") {
    window.renderDashboard = function () {
      var r = origDash.apply(this, arguments);
      try {
        decorate(".dashProduct", ".dashProductName b", ".dashProductName span", false, ".dashProductTop");
        decorate(".alertItem", ".alertInfo b", ".catTag", true, null);
        decorate(".recentLine", ".recentProduct b", ".recentProduct span", true, ".recentProduct");
      } catch (e) {}
      return r;
    };
  }

  // Redibuja con los nuevos overrides si la app ya había pintado algo
  try { if (typeof renderAll === "function") renderAll(); } catch (e) {}
})();
