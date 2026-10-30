/*
 * SmartScanner · Integración Firebase (Authentication + Cloud Firestore)
 * - Acceso por correo/contraseña y Google.
 * - Inventario separado por usuario: users/{uid}/inventory/{itemId}
 * - Sincronización en tiempo real y modo sin conexión (caché local de Firestore).
 * - Migración opcional del inventario guardado antes en este navegador (localStorage).
 */
(function () {
  "use strict";

  var FB_VERSION = "10.14.1";
  var BASE = "https://www.gstatic.com/firebasejs/" + FB_VERSION + "/";
  var LEGACY_STORE = "smartscanner_extensible_v1";
  var cfg = window.FIREBASE_CONFIG;

  /* ---------- Interfaz de acceso ---------- */
  var css = document.createElement("style");
  css.textContent = [
    ".ssAuth{--k:max(calc(100vw/1600),calc(100vh/811));position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:12px;background:#cfdaea url(img/login-bg.jpg) center/cover no-repeat;overflow:auto}",
    ".ssAuth[hidden]{display:none}",
    "@media (max-width:900px),(max-aspect-ratio:1/1){.ssAuth{--k:min(calc((100vw - 28px)/535),.82px);background-image:url(img/login-bg-m.jpg)}.ssAuthCard{background:rgba(255,255,255,.985) !important;transform:none !important}}",
    ".ssAuthCard{width:calc(var(--k)*535);max-width:100%;box-sizing:border-box;margin:auto;transform:translateY(calc(var(--k)*8));background:linear-gradient(180deg,rgba(255,255,255,.97),rgba(246,250,255,.95));border:1px solid rgba(255,255,255,.8);border-radius:calc(var(--k)*38);padding:calc(var(--k)*52) calc(var(--k)*38) calc(var(--k)*52);box-shadow:0 calc(var(--k)*26) calc(var(--k)*70) rgba(22,45,80,.28)}",
    ".ssLogo{display:block;margin:calc(var(--k)*2) auto calc(var(--k)*44);width:calc(var(--k)*160);height:auto}",
    ".ssTabs{display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--k)*4);padding:calc(var(--k)*5);background:rgba(233,241,250,.9);border:calc(var(--k)*1.5) solid #d3e1f0;border-radius:calc(var(--k)*24);margin-bottom:calc(var(--k)*28)}",
    ".ssTabs button{border:0;background:transparent;border-radius:calc(var(--k)*19);min-height:calc(var(--k)*50);font-size:max(15px,calc(var(--k)*21));font-weight:800;color:#5b7b9d;cursor:pointer}",
    ".ssTabs button.on{background:#fff;color:#0c1a30;box-shadow:0 calc(var(--k)*6) calc(var(--k)*16) rgba(20,50,90,.12)}",
    ".ssAuthCard label{display:block;font-size:max(13px,calc(var(--k)*18));font-weight:700;color:#2c3e55;margin:calc(var(--k)*14) 0 calc(var(--k)*7)}",
    ".ssField{position:relative}",
    ".ssField svg{position:absolute;left:calc(var(--k)*20);top:50%;width:calc(var(--k)*28);height:calc(var(--k)*28);min-width:18px;min-height:18px;transform:translateY(-50%);stroke:#2d4a6a;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}",
    ".ssAuthCard input{width:100%;box-sizing:border-box;height:calc(var(--k)*58);min-height:44px;border:calc(var(--k)*1.5) solid #d3e1f0;border-radius:calc(var(--k)*20);padding:0 calc(var(--k)*18) 0 calc(var(--k)*64);font-size:max(16px,calc(var(--k)*21));color:#14233A;background:#fff;outline:none}",
    ".ssAuthCard input::placeholder{color:#7f95ad}",
    ".ssAuthCard input:focus{border-color:#2b90cf;box-shadow:0 0 0 calc(var(--k)*5) rgba(43,144,207,.16)}",
    ".ssAuthCard #ssPass{padding-right:calc(var(--k)*62)}",
    ".ssEye{position:absolute;right:calc(var(--k)*14);top:50%;transform:translateY(-50%);width:calc(var(--k)*40);height:calc(var(--k)*40);min-width:32px;min-height:32px;border:0;background:transparent;color:#2d4a6a;display:grid;place-items:center;cursor:pointer;border-radius:50%}",
    ".ssEye svg{position:static;transform:none;width:calc(var(--k)*28);height:calc(var(--k)*28);min-width:18px;min-height:18px}",
    ".ssEye:hover{background:#eef5fc}",
    ".ssMsg{margin-top:calc(var(--k)*14);padding:calc(var(--k)*11) calc(var(--k)*14);border-radius:calc(var(--k)*14);font-size:max(13px,calc(var(--k)*16));display:none}",
    ".ssMsg.err{display:block;background:#FFF3F5;border:1px solid #F0D4D9;color:#9A3E4E}",
    ".ssMsg.ok{display:block;background:#EDF9F4;border:1px solid #D5EEE2;color:#236F52}",
    ".ssBtn{position:relative;width:100%;box-sizing:border-box;min-height:calc(var(--k)*58);border-radius:calc(var(--k)*20);font-weight:800;font-size:max(16px,calc(var(--k)*23));margin-top:calc(var(--k)*26);border:0;color:#fff;cursor:pointer}",
    ".ssBtn.primary{background:linear-gradient(135deg,#2f95d2,#1b78b9);box-shadow:0 calc(var(--k)*10) calc(var(--k)*24) rgba(27,120,185,.34)}",
    ".ssBtn.primary::after{content:'';position:absolute;right:calc(var(--k)*26);top:50%;width:calc(var(--k)*26);height:calc(var(--k)*26);min-width:16px;min-height:16px;transform:translateY(-50%);background:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 12h16M14 6l6 6-6 6'/%3E%3C/svg%3E\") center/contain no-repeat}",
    ".ssAuth.reg .ssAuthCard{padding-top:calc(var(--k)*30);padding-bottom:calc(var(--k)*30)}",
    ".ssAuth.reg .ssLogo{margin-bottom:calc(var(--k)*16);width:calc(var(--k)*130)}",
    ".ssAuth.reg .ssTabs{margin-bottom:calc(var(--k)*14)}",
    ".ssAuth.reg .ssLink{margin-top:calc(var(--k)*24)}",
    ".ssBtn:hover{filter:brightness(1.05)}",
    ".ssBtn:disabled{opacity:.6;cursor:wait}",
    ".ssLink{background:none;border:0;color:#176B90;font-weight:800;margin-top:calc(var(--k)*50);width:100%;text-align:center;font-size:max(14px,calc(var(--k)*19));cursor:pointer}",
    ".ssLink:hover{text-decoration:underline}",
    ".ssAuthCard #ssLoading{color:#35557a;font-size:15px;text-align:center;padding:12px 0 6px}",
    ".ssUser{margin-top:auto;padding:12px;border-radius:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:#D8EDFA;font-size:12px}",
    ".ssUser b{display:block;color:#fff;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".ssUser button{margin-top:10px;width:100%;min-height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font-weight:700}",
    ".ssSync{display:inline-block;margin-top:6px;font-size:11px;opacity:.85}"
  ].join("");
  document.head.appendChild(css);

  var overlay = document.createElement("div");
  overlay.className = "ssAuth";
  overlay.id = "ssAuth";
  overlay.innerHTML =
    '<div class="ssAuthCard">' +
    '<img class="ssLogo" src="img/logo-mark.png" alt="SmartScanner">' +
    '<div id="ssLoading">Cargando…</div>' +
    '<div id="ssPanel" hidden>' +
    '<div class="ssTabs"><button type="button" data-t="login" class="on">Ingresar</button><button type="button" data-t="register">Crear cuenta</button></div>' +
    '<form id="ssForm" novalidate>' +
    '<div id="ssNameWrap" hidden><label for="ssName">Nombre</label><div class="ssField"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"></circle><path d="M4.5 20c.8-3.6 3.7-5.4 7.5-5.4s6.7 1.8 7.5 5.4"></path></svg><input id="ssName" autocomplete="name" placeholder="Su nombre"></div></div>' +
    '<label for="ssEmail">Correo electrónico</label><div class="ssField"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"></rect><path d="m4 7 8 6 8-6"></path></svg><input id="ssEmail" type="email" autocomplete="email" placeholder="correo@ejemplo.com"></div>' +
    '<label for="ssPass">Contraseña</label><div class="ssField"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2.5"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg><input id="ssPass" type="password" autocomplete="current-password" placeholder="Mínimo 6 caracteres"><button type="button" class="ssEye" id="ssEye" aria-label="Mostrar u ocultar contraseña"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></div>' +
    '<div class="ssMsg" id="ssMsg" role="alert"></div>' +
    '<button class="ssBtn primary" id="ssSubmit" type="submit">Ingresar</button>' +
    '</form>' +
    '<button class="ssLink" id="ssForgot" type="button">¿Olvidó su contraseña?</button>' +
    '</div></div>';
  document.body.appendChild(overlay);

  function $(id) { return document.getElementById(id); }
  $("ssEye").addEventListener("click", function () { var i = $("ssPass"); i.type = i.type === "password" ? "text" : "password"; });
  var mode = "login";

  function setMsg(text, type) {
    var m = $("ssMsg");
    m.textContent = text || "";
    m.className = "ssMsg" + (text ? " " + (type || "err") : "");
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".ssTabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.t === m); });
    $("ssNameWrap").hidden = m !== "register";
    overlay.classList.toggle("reg", m === "register");
    $("ssSubmit").textContent = m === "register" ? "Crear cuenta" : "Ingresar";
    $("ssPass").autocomplete = m === "register" ? "new-password" : "current-password";
    setMsg("");
  }
  function showPanel() { $("ssLoading").hidden = true; $("ssPanel").hidden = false; overlay.hidden = false; }
  function showLoading(t) { $("ssPanel").hidden = true; $("ssLoading").hidden = false; $("ssLoading").textContent = t || "Cargando…"; overlay.hidden = false; }

  document.querySelectorAll(".ssTabs button").forEach(function (b) {
    b.addEventListener("click", function () { setMode(b.dataset.t); });
  });

  /* Si falta la configuración, se avisa claramente */
  if (!cfg || !cfg.apiKey || String(cfg.apiKey).indexOf("TU_") === 0) {
    $("ssLoading").innerHTML =
      '<b style="color:#9A3E4E">Falta configurar Firebase.</b><br>Abra <code>firebase-config.js</code> y pegue los datos de su proyecto (ver README).';
    return;
  }

  var ERR = {
    "auth/invalid-email": "El correo no es válido.",
    "auth/missing-password": "Escriba su contraseña.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Espere unos minutos e intente de nuevo.",
    "auth/network-request-failed": "Sin conexión a Internet.",
    "auth/popup-closed-by-user": "Se cerró la ventana de Google antes de terminar.",
    "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permita las ventanas emergentes.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).",
    "auth/operation-not-allowed": "Este método de acceso no está habilitado en Firebase."
  };
  function errText(e) { return ERR[e && e.code] || ("Error: " + ((e && e.message) || e)); }

  // 1) SDK incluido en el proyecto (firebase-sdk.js): no depende de CDN externos.
  // 2) Si no está, se descarga desde gstatic.com como respaldo.
  var local = window.__SS_FIREBASE;
  (local
    ? Promise.resolve([local.app, local.auth, local.firestore])
    : Promise.all([
        import(BASE + "firebase-app.js"),
        import(BASE + "firebase-auth.js"),
        import(BASE + "firebase-firestore.js")
      ])
  ).then(function (mods) {
    start(mods[0], mods[1], mods[2]);
  }).catch(function (e) {
    $("ssLoading").innerHTML = '<b style="color:#9A3E4E">No se pudo cargar Firebase.</b><br>Revise su conexión a Internet. (' + (e && e.message || e) + ")";
  });

  function start(A, Au, F) {
    var app = A.initializeApp(cfg);
    var auth = Au.getAuth(app);
    var db;
    try {
      db = F.initializeFirestore(app, {
        localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() })
      });
    } catch (e) {
      db = F.getFirestore(app);
    }

    var uid = null, unsub = null, synced = new Map(), firstSnap = true, userBox = null;

    function invCol() { return F.collection(db, "users", uid, "inventory"); }
    function clean(p) {
      return {
        name: String(p.name || "").trim().slice(0, 120),
        cat: String(p.cat || "Otros").slice(0, 40),
        qty: Math.max(0, Math.floor(Number(p.qty) || 0)),
        expiry: String(p.expiry || "").slice(0, 10),
        source: String(p.source || "Manual").slice(0, 60)
      };
    }
    function sig(p) { return JSON.stringify(clean(p)); }
    function safeId(id) { return String(id).replace(/\//g, "_"); }

    /* ---------- Escritura: persist() reemplazado ---------- */
    function pushChanges() {
      if (!uid) return;
      var ops = [], cur = new Map();
      items.forEach(function (p) {
        p.id = safeId(p.id);
        var s = sig(p);
        cur.set(p.id, s);
        if (synced.get(p.id) !== s) ops.push({ t: "set", id: p.id, data: clean(p) });
      });
      synced.forEach(function (_, id) { if (!cur.has(id)) ops.push({ t: "del", id: id }); });
      synced = cur;
      for (var i = 0; i < ops.length; i += 400) {
        var batch = F.writeBatch(db);
        ops.slice(i, i + 400).forEach(function (o) {
          var ref = F.doc(db, "users", uid, "inventory", o.id);
          if (o.t === "set") batch.set(ref, Object.assign({}, o.data, { updatedAt: F.serverTimestamp() }));
          else batch.delete(ref);
        });
        batch.commit().catch(function (e) {
          toast("No se pudo guardar en la nube: " + (e && e.code || e));
        });
      }
    }

    window.persist = function () {
      normalize();
      renderAll();
      pushChanges();
    };

    /* ---------- Lectura en tiempo real ---------- */
    function applySnapshot(snap) {
      if (snap.metadata.hasPendingWrites) return; // eco de cambios propios
      var list = [];
      var map = new Map();
      snap.docs.forEach(function (d) {
        var x = d.data();
        var it = { id: d.id, name: x.name, cat: x.cat, qty: x.qty, expiry: x.expiry || "", source: x.source || "Manual" };
        list.push(it);
        map.set(d.id, sig(it));
      });

      if (firstSnap) {
        firstSnap = false;
        var legacy = [];
        try { legacy = JSON.parse(localStorage.getItem(LEGACY_STORE) || "[]"); } catch (e) {}
        if (!list.length && !snap.metadata.fromCache && Array.isArray(legacy) && legacy.length &&
            confirm("Se encontraron " + legacy.length + " producto(s) guardados en este navegador.\n\n¿Desea subirlos a su cuenta?")) {
          items = legacy;
          localStorage.removeItem(LEGACY_STORE);
          synced = new Map();
          normalize();
          renderAll();
          pushChanges();
          toast("Inventario local migrado a su cuenta");
          return;
        }
      }
      items = list;
      synced = map;
      renderAll();
    }

    function loadProfile() {
      var ref = F.doc(db, "users", uid);
      F.getDoc(ref).then(function (s) {
        var rules = (s.exists() && s.data().categoryRules) || "";
        localStorage.setItem("ss_category_rules", rules);
        var ta = $("categoryRules"); if (ta) ta.value = rules;
        var u = auth.currentUser;
        return F.setDoc(ref, {
          email: u.email || "",
          displayName: u.displayName || "",
          updatedAt: F.serverTimestamp()
        }, { merge: true });
      }).catch(function () {});
    }

    var origSaveRules = window.saveCategoryRules;
    window.saveCategoryRules = function () {
      if (origSaveRules) origSaveRules();
      if (!uid) return;
      F.setDoc(F.doc(db, "users", uid), {
        categoryRules: String(($("categoryRules") || {}).value || "").slice(0, 5000),
        updatedAt: F.serverTimestamp()
      }, { merge: true }).catch(function () { toast("No se pudieron guardar las reglas en la nube"); });
    };

    /* ---------- Caja de usuario en el menú ---------- */
    function ensureUserBox() {
      if (userBox) return;
      var side = document.querySelector("aside.side");
      if (!side) return;
      userBox = document.createElement("div");
      userBox.className = "ssUser";
      userBox.innerHTML = '<span>Sesión iniciada</span><b id="ssUserLabel"></b><span class="ssSync" id="ssSync"></span><button type="button" id="ssLogout">Cerrar sesión</button>';
      side.appendChild(userBox);
      $("ssLogout").addEventListener("click", function () {
        if (typeof stopCamera === "function") { try { stopCamera(false); } catch (e) {} }
        Au.signOut(auth);
      });
      window.addEventListener("online", updateSync);
      window.addEventListener("offline", updateSync);
    }
    function updateSync() { var s = $("ssSync"); if (s) s.textContent = navigator.onLine ? "Sincronizado con la nube" : "Sin conexión · se sincronizará al volver"; }

    /* ---------- Estado de sesión ---------- */
    showLoading("Cargando…");
    Au.onAuthStateChanged(auth, function (user) {
      if (unsub) { unsub(); unsub = null; }
      if (user) {
        uid = user.uid;
        firstSnap = true;
        synced = new Map();
        items = [];
        renderAll();
        ensureUserBox();
        $("ssUserLabel").textContent = user.displayName || user.email || "Usuario";
        window.ssUser = { name: user.displayName || "", email: user.email || "" };
        try { window.dispatchEvent(new Event("ss:user")); } catch (e) {}
        updateSync();
        overlay.hidden = true;
        loadProfile();
        unsub = F.onSnapshot(invCol(), applySnapshot, function (e) {
          toast("Error de sincronización: " + (e && e.code || e));
        });
      } else {
        uid = null;
        items = [];
        synced = new Map();
        window.ssUser = null; try { window.dispatchEvent(new Event("ss:user")); } catch (e) {}
        try { renderAll(); showPage("inventory"); } catch (e) {}
        localStorage.removeItem("ss_category_rules");
        showPanel();
      }
    });

    /* ---------- Formularios de acceso ---------- */
    $("ssForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = $("ssEmail").value.trim(), pass = $("ssPass").value, btn = $("ssSubmit");
      if (!email || !pass) { setMsg("Escriba su correo y contraseña."); return; }
      btn.disabled = true; setMsg("");
      var p;
      if (mode === "register") {
        var name = $("ssName").value.trim();
        p = Au.createUserWithEmailAndPassword(auth, email, pass).then(function (cred) {
          return name ? Au.updateProfile(cred.user, { displayName: name }) : null;
        });
      } else {
        p = Au.signInWithEmailAndPassword(auth, email, pass);
      }
      p.then(function () { $("ssPass").value = ""; })
       .catch(function (e) { setMsg(errText(e)); })
       .then(function () { btn.disabled = false; });
    });

    $("ssForgot").addEventListener("click", function () {
      var email = $("ssEmail").value.trim();
      if (!email) { setMsg("Escriba su correo arriba y vuelva a pulsar este enlace."); return; }
      Au.sendPasswordResetEmail(auth, email)
        .then(function () { setMsg("Le enviamos un correo para restablecer la contraseña.", "ok"); })
        .catch(function (e) { setMsg(errText(e)); });
    });
  }
})();
