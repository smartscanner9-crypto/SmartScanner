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
    ".ssAuth{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:18px;background:radial-gradient(circle at 80% 0%,rgba(49,151,196,.35),transparent 40%),linear-gradient(180deg,#111036,#080724);overflow:auto}",
    ".ssAuth[hidden]{display:none}",
    ".ssAuthCard{width:min(420px,100%);background:#fff;border-radius:24px;padding:26px 22px;box-shadow:0 30px 80px rgba(0,0,0,.35)}",
    ".ssAuthCard h2{margin:0;color:#080724;font-size:26px;letter-spacing:-.03em}",
    ".ssSub{margin:4px 0 18px;color:#6C8094;font-size:14px}",
    ".ssTabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:#EEF6FA;border:1px solid #D5E6EF;border-radius:14px;margin-bottom:16px}",
    ".ssTabs button{border:0;background:transparent;border-radius:10px;min-height:40px;font-weight:700;color:#527089}",
    ".ssTabs button.on{background:#fff;color:#080724;box-shadow:0 6px 16px rgba(8,7,36,.08)}",
    ".ssAuthCard label{display:block;font-size:11px;font-weight:800;color:#5c6980;margin:12px 0 5px}",
    ".ssAuthCard input{width:100%;border:1px solid #D4E6EF;border-radius:14px;padding:12px;font-size:16px;color:#14233A;outline:none}",
    ".ssAuthCard input:focus{border-color:#3197c4;box-shadow:0 0 0 4px rgba(49,151,196,.12)}",
    ".ssMsg{margin-top:12px;padding:10px 12px;border-radius:12px;font-size:13px;display:none}",
    ".ssMsg.err{display:block;background:#FFF3F5;border:1px solid #F0D4D9;color:#9A3E4E}",
    ".ssMsg.ok{display:block;background:#EDF9F4;border:1px solid #D5EEE2;color:#236F52}",
    ".ssBtn{width:100%;min-height:46px;border-radius:14px;font-weight:700;margin-top:14px;border:1px solid #D3E5EE;background:#fff;color:#080724}",
    ".ssBtn.primary{border:0;background:linear-gradient(135deg,#3197c4,#207DA8);color:#fff}",
    ".ssBtn:disabled{opacity:.6;cursor:wait}",
    ".ssLink{background:none;border:0;color:#176B90;font-weight:700;margin-top:12px;width:100%;text-align:center;font-size:13px}",
    ".ssDivider{text-align:center;color:#8da0b3;font-size:12px;margin:14px 0 0}",
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
    '<h2>SmartScanner</h2><p class="ssSub">Inventario inteligente del hogar</p>' +
    '<div id="ssLoading" style="color:#527089;font-size:14px">Cargando…</div>' +
    '<div id="ssPanel" hidden>' +
    '<div class="ssTabs"><button type="button" data-t="login" class="on">Ingresar</button><button type="button" data-t="register">Crear cuenta</button></div>' +
    '<form id="ssForm" novalidate>' +
    '<div id="ssNameWrap" hidden><label for="ssName">Nombre</label><input id="ssName" autocomplete="name" placeholder="Su nombre"></div>' +
    '<label for="ssEmail">Correo electrónico</label><input id="ssEmail" type="email" autocomplete="email" placeholder="correo@ejemplo.com">' +
    '<label for="ssPass">Contraseña</label><input id="ssPass" type="password" autocomplete="current-password" placeholder="Mínimo 6 caracteres">' +
    '<div class="ssMsg" id="ssMsg" role="alert"></div>' +
    '<button class="ssBtn primary" id="ssSubmit" type="submit">Ingresar</button>' +
    '</form>' +
    '<div class="ssDivider">o</div>' +
    '<button class="ssBtn" id="ssGoogle" type="button">Continuar con Google</button>' +
    '<button class="ssLink" id="ssForgot" type="button">¿Olvidó su contraseña?</button>' +
    '</div></div>';
  document.body.appendChild(overlay);

  function $(id) { return document.getElementById(id); }
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

  Promise.all([
    import(BASE + "firebase-app.js"),
    import(BASE + "firebase-auth.js"),
    import(BASE + "firebase-firestore.js")
  ]).then(function (mods) {
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

    $("ssGoogle").addEventListener("click", function () {
      setMsg("");
      Au.signInWithPopup(auth, new Au.GoogleAuthProvider()).catch(function (e) { setMsg(errText(e)); });
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
