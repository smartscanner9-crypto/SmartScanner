# SmartScanner v2 (imágenes estáticas) – Inventario del hogar con Firebase

Aplicación web de inventario doméstico (escáner QR/IA, dashboard, recetas) conectada a:

- **Firebase Authentication**: acceso de usuarios (correo/contraseña y Google).
- **Cloud Firestore**: registros del inventario, **separados por usuario** (`users/{uid}/inventory/{id}`).
- **Firebase Hosting**: publicación con HTTPS (necesario para la cámara).
- **GitHub**: control de versiones del código.

## Estructura

| Ruta | Función |
|---|---|
| `public/index.html` | La aplicación |
| `public/firebase-config.js` | Credenciales de su proyecto (**debe editarse**) |
| `public/firebase-integration.js` | Login y sincronización con Firestore |
| `public/item-emojis.js` | Imagen estática por producto (con emoji de respaldo) |
| `public/img/productos/` | Imágenes PNG de los productos |
| `public/qr-generator.js` + `public/qrcode.js` | Generador de códigos QR de productos (librería MIT incluida) |
| `public/ui-redesign.js` / `.css` | Diseño: inventario como inicio, saludo, escaneo rápido y barra inferior |
| `firestore.rules` | Reglas: cada usuario solo accede a sus datos |
| `firebase.json` | Reglas de Firestore (y Hosting, opcional) |
| `netlify.toml` | Publicación en Netlify (carpeta `public`) |
| `.firebaserc.example` | Ejemplo para vincular el proyecto |

## 1. Credenciales

Firebase Console → Configuración del proyecto → Tus apps → Web → copie `firebaseConfig`
y reemplace los valores `TU_...` en `public/firebase-config.js`.
(Es pública por diseño; la seguridad la dan las reglas y la autenticación.)

## 2. Publicar con Firebase Hosting

Requiere Node.js instalado. En una terminal, dentro de esta carpeta:

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # elija smartscanner-hogar
firebase deploy             # publica Hosting y las reglas de Firestore
```

Al terminar muestra la URL, por ejemplo `https://smartscanner-hogar.web.app`.
Ese dominio y `*.firebaseapp.com` ya están autorizados para el login con Google.

Solo reglas: `firebase deploy --only firestore:rules`
Solo web: `firebase deploy --only hosting`

## 3. GitHub

```bash
git init
git add .
git commit -m "SmartScanner con Firebase Hosting"
git branch -M main
git remote add origin https://github.com/SU_USUARIO/smartscanner.git
git push -u origin main
```

(Opcional) Despliegue automático: `firebase init hosting:github` configura una GitHub Action
que publica en cada push a `main`.

## Separación por usuario

- Cada artículo vive en `users/{uid}/inventory/`.
- Las reglas niegan el acceso si `request.auth.uid` no coincide con `{uid}` y validan tipo y tamaño de campos.
- Al cerrar sesión se limpian los datos locales del dispositivo.
- Funciona sin conexión (caché de Firestore) y sincroniza al volver la red.

## Prueba local

```bash
firebase emulators:start --only hosting
```
o bien `cd public && python3 -m http.server 8000` y abra <http://localhost:8000>.

## Imágenes de productos (versión 2)

Cuando se escribe un producto, la app busca su imagen en `public/img/productos/`.
Reconoce singular, plural y variantes (tomate, tomates, tomate cherry; yogurt, yogur, yogures...).
Si un producto no tiene imagen, se muestra su emoji de respaldo.

Para agregar un producto nuevo:
1. Copie la imagen (PNG, preferiblemente cuadrada, ~300 px, fondo transparente) a `public/img/productos/`, por ejemplo `zanahoria.png`.
2. Abra `public/item-emojis.js` y agregue una línea en la lista `IMAGES`:
   `["zanahoria.png", "zanahoria"],`
   Varias palabras para la misma imagen se separan con espacios: `["tomate.png", "tomate tomatico"]`.
3. Ejecute `firebase deploy`.

Las reglas más específicas van primero: por eso «salsa de tomate» muestra la salsa y no el tomate.

## Publicar con GitHub + Netlify

1. Suba el proyecto a GitHub (ver sección GitHub).
2. Netlify → Add new site → Import an existing project → GitHub → elija el repositorio.
3. Build command: vacío. Publish directory: `public` (ya lo define `netlify.toml`).
4. Copie el dominio que le asigna Netlify y agréguelo en Firebase → Authentication → Settings → Authorized domains.
5. Publique las reglas: Firebase → Firestore → Reglas → pegue `firestore.rules` → Publicar.

## Códigos QR de productos

Menú **Configuración → Códigos QR**. Muestra un QR por cada producto con imagen; cada uno contiene
`SMART|Nombre|Categoría|Cantidad|`, el formato que ya entiende el escáner.

- **Cantidad por escaneo:** número de unidades que se registran cada vez que se lee el QR.
- **Descargar PNG:** guarda el QR con el nombre del producto.
- **Imprimir etiquetas:** hoja de 3 columnas (se puede guardar como PDF).
- **Crear QR para otro producto:** agrega nombres propios (se guardan en este navegador).

Uso: **Escáner → Entrada/Salida → Iniciar cámara** y apuntar al QR. Se abre el formulario con el producto
completo; confirmar con **Guardar**. En modo **Salida** descuenta del inventario.
