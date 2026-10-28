/*
 * SmartScanner - Nuevo diseño (estilo app móvil).
 * - El inventario es la pantalla de inicio.
 * - Saludo según la hora + nombre del usuario, resumen y botón de escaneo rápido.
 * - Lista de productos con emoji y fecha de vencimiento.
 * - Barra inferior con acceso directo al escáner (todas sus funciones).
 * No cambia la lógica de datos ni de Firebase.
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var page = $("inventory");
  if (!page) return;

  /* ---------- Iconos ---------- */
  function ic(paths) {
    return '<svg viewBox="0 0 24 24" class="ssIc" aria-hidden="true">' + paths + "</svg>";
  }
  var I = {
    fridge: ic('<rect x="6" y="3" width="12" height="18" rx="2.5"></rect><path d="M6 11h12M9 7v1.5M9 14v2.5"></path>'),
    scan: ic('<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"></path>'),
    recipes: ic('<path d="M6 3h12v18H6z"></path><path d="M9 8h6M9 12h6M9 16h3"></path>'),
    panel: ic('<path d="M5 20V10M12 20V4M19 20v-7"></path>'),
    menu: ic('<path d="M4 7h16M4 12h16M4 17h16"></path>'),
    bell: ic('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"></path><path d="M10 21h4"></path>'),
    cam: ic('<path d="M4 8h3.5l1.7-2h5.6l1.7 2H20v11H4z"></path><circle cx="12" cy="13" r="3.6"></circle>'),
    plus: ic('<path d="M12 5v14M5 12h14"></path>'),
    gear: ic('<circle cx="12" cy="12" r="3"></circle><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"></path>'),
    filter: ic('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"></path><circle cx="16" cy="7" r="2"></circle><circle cx="8" cy="17" r="2"></circle>'),
    search: ic('<circle cx="11" cy="11" r="6.5"></circle><path d="m20 20-4.2-4.2"></path>')
  };

  /* ---------- Barra superior horizontal ---------- */
  var logoSrc = (document.querySelector(".brandLogo") || {}).src || "";
  var nav = document.createElement("header");
  nav.className = "ssTopNav";
  nav.innerHTML =
    '<div class="ssTopInner">' +
      '<a class="ssLogo" href="#" id="ssLogo" aria-label="SmartScanner - Inventario"><img src="' + logoSrc + '" alt="SmartScanner"></a>' +
      '<nav class="ssLinks" aria-label="Navegación principal">' +
        '<button type="button" data-p="inventory">' + I.fridge + "<span>Inventario</span></button>" +
        '<button type="button" data-p="scan">' + I.scan + "<span>Escáner</span></button>" +
        '<button type="button" data-p="recipes">' + I.recipes + "<span>Recetas</span></button>" +
        '<button type="button" data-p="home">' + I.panel + "<span>Resumen</span></button>" +
        '<div class="ssDrop"><button type="button" id="ssCfg" data-p="cfg" aria-expanded="false">' + I.gear + "<span>Configuración</span><i class=\"ssCaret\">▾</i></button>" +
          '<div class="ssDropMenu" id="ssCfgMenu" hidden>' +
            '<button type="button" data-p="ai">Modelo IA</button>' +
            '<button type="button" data-p="data">Datos</button>' +
          "</div></div>" +
      "</nav>" +
      '<div class="ssTopRight">' +
        '<button type="button" class="ssIconBtn" id="ssBell" aria-label="Ver alertas de vencimiento">' + I.bell + '<i class="ssBellDot" id="ssBellDot" hidden></i></button>' +
        '<div class="ssAvatarWrap"><button type="button" class="ssAvatar" id="ssAvatar" aria-label="Cuenta" aria-expanded="false">?</button>' +
        '<div class="ssMenu" id="ssAvatarMenu" hidden><b id="ssMenuName"></b><span id="ssMenuMail"></span><button type="button" id="ssMenuOut">Cerrar sesión</button></div></div>' +
      "</div>" +
    "</div>";
  document.body.insertBefore(nav, document.body.firstChild);

  nav.querySelector(".ssLinks").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var p = b.getAttribute("data-p");
    var menu = $("ssCfgMenu");
    if (p === "cfg") { e.stopPropagation(); menu.hidden = !menu.hidden; b.setAttribute("aria-expanded", String(!menu.hidden)); return; }
    menu.hidden = true;
    showPage(p);
  });
  $("ssLogo").addEventListener("click", function (e) { e.preventDefault(); showPage("inventory"); });
  document.addEventListener("click", function () { var m = $("ssCfgMenu"); if (m) m.hidden = true; });

  /* ---------- Contenedor y encabezado de la pantalla de inventario ---------- */
  var oldHeader = page.querySelector(".inventoryPageHeader");
  var clearBtn = oldHeader && oldHeader.querySelector(".btn.danger");
  if (oldHeader) oldHeader.style.display = "none";

  var wrap = document.createElement("div");
  wrap.className = "ssWrap";
  while (page.firstChild) wrap.appendChild(page.firstChild);
  page.appendChild(wrap);

  var hero = document.createElement("div");
  hero.className = "ssHeroBlock";
  hero.innerHTML =
    '<section class="ssGreetCard">' +
      '<h1 id="ssGreet">Buenos días</h1>' +
      '<div class="ssStats">' +
        '<div><span>Productos</span><b id="ssStTotal">0</b></div>' +
        '<div class="soon"><span>Por vencer</span><b id="ssStSoon">0</b></div>' +
        '<div class="exp"><span>Vencidos</span><b id="ssStExp">0</b></div>' +
      '</div>' +
      '<div class="ssActionsRow">' +
        '<button type="button" class="ssScanBtn" id="ssScanNew">' + I.scan + '<span>Escanear producto</span></button>' +
        '<button type="button" class="ssAddBtn" id="ssAddManual" aria-label="Agregar manualmente" title="Agregar manualmente">' + I.plus + '</button>' +
      '</div>' +
    '</section>' +
    '<h2 class="ssSectionTitle">Inventario actual</h2>';
  wrap.insertBefore(hero, wrap.firstChild);
  // Logo oficial (versión oscura que ya trae la app en la barra móvil)
  var srcLogo = document.querySelector(".mobileBrandBar img");
  if (srcLogo) $("ssLogo").src = srcLogo.src;

  var foot = document.createElement("div");
  foot.className = "ssFoot";
  foot.innerHTML = '<button type="button" id="ssClearAll">Eliminar todo el inventario</button>';
  wrap.appendChild(foot);

  /* ---------- Buscador + botón de filtros ---------- */
  var bar = page.querySelector(".inventoryFilterBar");
  var sbox = bar && bar.querySelector(".inventorySearchBox");
  if (bar && sbox) {
    var fi = sbox.querySelector(".filterIcon");
    if (fi) fi.innerHTML = I.search;
    var fbtn = document.createElement("button");
    fbtn.type = "button"; fbtn.className = "ssFilterBtn"; fbtn.id = "ssFilterToggle";
    fbtn.setAttribute("aria-label", "Mostrar filtros"); fbtn.innerHTML = I.filter;
    sbox.insertAdjacentElement("afterend", fbtn);
    fbtn.addEventListener("click", function () {
      var open = bar.classList.toggle("ssOpen");
      fbtn.classList.toggle("on", open);
    });
  }

  /* ---------- Saludo y resumen ---------- */
  function firstName() {
    var u = window.ssUser;
    if (!u) return "";
    var n = (u.name || "").trim().split(/\s+/)[0];
    if (!n && u.email) { n = u.email.split("@")[0].replace(/[._-]+/g, " ").split(" ")[0]; n = n.charAt(0).toUpperCase() + n.slice(1); }
    return n;
  }
  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  }
  function paintUser() {
    var n = firstName(), u = window.ssUser;
    $("ssGreet").textContent = greeting() + (n ? ", " + n : "");
    var av = $("ssAvatar");
    av.textContent = n ? n.charAt(0).toUpperCase() : "?";
    $("ssMenuName").textContent = u ? (u.name || n) : "";
    $("ssMenuMail").textContent = u ? u.email : "";
  }
  function paintStats() {
    var list = (typeof items !== "undefined" && items) || [];
    var soon = 0, exp = 0;
    list.forEach(function (p) { var s = stateOf(p); if (s === "soon") soon++; else if (s === "expired") exp++; });
    $("ssStTotal").textContent = list.length;
    $("ssStSoon").textContent = soon;
    $("ssStExp").textContent = exp;
    $("ssBellDot").hidden = !(soon + exp);
  }
  window.addEventListener("ss:user", paintUser);
  paintUser(); paintStats();
  setInterval(paintUser, 300000);

  /* ---------- Acciones ---------- */
  function quickScan() {
    showPage("scan");
    try { if (typeof startCamera === "function") startCamera(); } catch (e) {}
  }
  $("ssScanNew").addEventListener("click", quickScan);
  $("ssAddManual").addEventListener("click", function () { if (typeof openModal === "function") openModal(); });
  $("ssBell").addEventListener("click", function () { showPage("home"); });
  $("ssClearAll").addEventListener("click", function () { if (clearBtn) clearBtn.click(); else if (typeof clearAllInventory === "function") clearAllInventory(); });
  $("ssAvatar").addEventListener("click", function (e) {
    e.stopPropagation();
    var m = $("ssAvatarMenu"); m.hidden = !m.hidden;
    this.setAttribute("aria-expanded", String(!m.hidden));
  });
  document.addEventListener("click", function () { var m = $("ssAvatarMenu"); if (m) m.hidden = true; });
  $("ssMenuOut").addEventListener("click", function () { var b = $("ssLogout"); if (b) b.click(); });

  /* ---------- Fila de producto ---------- */
  var openRows = {};
  function shortDate(d) {
    if (!d) return "";
    var p = d.split("-");
    if (p.length !== 3) return d;
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("es", { day: "numeric", month: "short" }).replace(".", "");
  }
  window.ssToggleRow = function (id, el) {
    var on = !openRows[id];
    openRows[id] = on;
    if (el) el.classList.toggle("open", on);
  };
  window.itemCard = function (p) {
    var st = stateOf(p), days = daysLeft(p.expiry);
    var chip = p.expiry ? shortDate(p.expiry) : "Sin fecha";
    var txt = !p.expiry ? "" : days < 0 ? "vencido hace " + Math.abs(days) + " d" : days === 0 ? "vence hoy" : days + (days === 1 ? " día" : " días");
    var id = esc(p.id);
    var nm = esc(p.name);
    return '<article class="ssCard st-' + st + (openRows[p.id] ? " open" : "") + '" data-id="' + id + '" onclick="ssToggleRow(\'' + id + '\',this)" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click()}">' +
      '<i class="ssDot d-' + st + '" title="' + esc(stateText[st]) + '"></i>' +
      '<div class="ssCardImg" aria-hidden="true">' + ssVisualFor(p.name, p.cat) + "</div>" +
      '<b class="ssCardName">' + nm + "</b>" +
      '<span class="ssQty" aria-label="Cantidad ' + p.qty + '">' + p.qty + "</span>" +
      '<div class="ssCardExp"><span class="ssChip c-' + (p.expiry ? st : "none") + '">' + esc(chip) + "</span>" +
        (txt ? '<span class="ssDays d-' + st + '">' + txt + "</span>" : "") + "</div>" +
      '<div class="ssCardMore" onclick="event.stopPropagation()">' +
        '<div class="ssMeta">' + esc(p.cat || "Otros") + " · " + esc(p.source || "Manual") + "</div>" +
        '<div class="ssRowBtns">' +
          '<button class="ssB" onclick="changeQty(\'' + id + '\',-1)" aria-label="Disminuir cantidad de ' + nm + '">− 1</button>' +
          '<button class="ssB" onclick="changeQty(\'' + id + '\',1)" aria-label="Aumentar cantidad de ' + nm + '">＋ 1</button>' +
          '<button class="ssB del" onclick="removeItem(\'' + id + '\')" aria-label="Eliminar ' + nm + '">Eliminar</button>' +
        "</div></div></article>";
  };

  /* ---------- Estado de navegación ---------- */
  function markActive(id) {
    document.body.setAttribute("data-ss-page", id);
    var bs = nav.querySelectorAll(".ssLinks button[data-p]");
    var inCfg = id === "ai" || id === "data" || id === "qr";
    for (var i = 0; i < bs.length; i++) {
      var p = bs[i].getAttribute("data-p");
      bs[i].classList.toggle("active", p === id || (p === "cfg" && inCfg));
    }
    var mi = nav.querySelectorAll(".ssDropMenu button");
    for (var j = 0; j < mi.length; j++) mi[j].classList.toggle("active", mi[j].getAttribute("data-p") === id);
  }
  var origShow = window.showPage;
  window.showPage = function (id) {
    var r = origShow.apply(this, arguments);
    markActive(id);
    try { window.scrollTo(0, 0); } catch (e) {}
    return r;
  };
  var origInv = window.renderInventory;
  // Lista plana (sin secciones por categoría), ordenada según el selector "Ordenar"
  function flatten() {
    var box = $("inventoryTable");
    if (!box) return;
    var cards = Array.prototype.slice.call(box.querySelectorAll(".ssCard"));
    if (!cards.length) return;
    var by = {}; (items || []).forEach(function (p) { by[p.id] = p; });
    var mode = ($("sortInventory") || {}).value || "name";
    var cmpName = function (a, b) { return String(a.name).localeCompare(String(b.name), "es"); };
    var big = 99999;
    var cmp = {
      name: cmpName,
      qtyDesc: function (a, b) { return b.qty - a.qty || cmpName(a, b); },
      qtyAsc: function (a, b) { return a.qty - b.qty || cmpName(a, b); },
      expiry: function (a, b) {
        var da = a.expiry ? daysLeft(a.expiry) : big, db = b.expiry ? daysLeft(b.expiry) : big;
        return da - db || cmpName(a, b);
      },
      category: function (a, b) { return String(a.cat).localeCompare(String(b.cat), "es") || cmpName(a, b); }
    }[mode] || cmpName;
    cards.sort(function (x, y) {
      var a = by[x.getAttribute("data-id")], b = by[y.getAttribute("data-id")];
      return a && b ? cmp(a, b) : 0;
    });
    var grid = document.createElement("div");
    grid.className = "ssFlatGrid";
    cards.forEach(function (c) { grid.appendChild(c); });
    box.innerHTML = "";
    box.appendChild(grid);
  }
  window.renderInventory = function () { var r = origInv.apply(this, arguments); try { flatten(); } catch (e) {} paintStats(); return r; };

  // Pantalla de inicio: inventario (se repite al terminar de cargar por si otro script ajusta el menú)
  window.showPage("inventory");
  window.addEventListener("load", function () {
    var act = document.querySelector(".page.active");
    if (act && act.id === "inventory") { updateNavigation("inventory"); markActive("inventory"); }
  });
})();
