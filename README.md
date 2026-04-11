# 🎮 GameSniper

Comparador de precios de videojuegos en tiempo real.  
Proyecto TFC – 2º DAW | MVC con PHP, MySQL, JavaScript y 3 APIs externas.

---

## 🚀 Instalación rápida (XAMPP)

### 1. Colocar el proyecto
Copia la carpeta `GameSniper/` dentro de `htdocs/`:
```
C:\xampp\htdocs\GameSniper\
```

### 2. Activar mod_rewrite en Apache
Abre `C:\xampp\apache\conf\httpd.conf` y busca la línea:
```
#LoadModule rewrite_module modules/mod_rewrite.so
```
Quita el `#` para activarla. Reinicia Apache.

Luego busca el bloque `<Directory "C:/xampp/htdocs">` y cambia:
```
AllowOverride None
```
por:
```
AllowOverride All
```
Guarda y reinicia Apache.

### 3. Crear la base de datos
1. Abre **phpMyAdmin**: `http://localhost/phpmyadmin`
2. Crea una base de datos llamada `gamesniper` (utf8mb4_unicode_ci)
3. Selecciónala e importa el archivo `database/gamesniper.sql`

### 4. Configurar las APIs

Abre `config/apis.php` y rellena tus claves:

| API | Dónde conseguirla | Coste |
|-----|------------------|-------|
| **RAWG** | https://rawg.io/apidocs → Sign Up | Gratuita |
| **IsThereAnyDeal** | https://docs.isthereanydeal.com → Register | Gratuita |
| **IGDB** | https://dev.twitch.tv/console → New App | Gratuita |

```php
define('RAWG_API_KEY',      'tu-clave-rawg');
define('ITAD_API_KEY',      'tu-clave-itad');
define('IGDB_CLIENT_ID',    'tu-client-id-twitch');
define('IGDB_CLIENT_SECRET','tu-client-secret-twitch');
```

### 5. Acceder a la aplicación
```
http://localhost/GameSniper/
```

---

## 👤 Credenciales de administrador por defecto

| Campo | Valor |
|-------|-------|
| Email | admin@gamesniper.com |
| Contraseña | Admin1234! |

> ⚠️ **Cambia la contraseña** desde tu perfil tras el primer acceso.

---

## 🏗️ Arquitectura MVC

```
GameSniper/
├── app/
│   ├── controllers/          ← Controladores (lógica de negocio)
│   │   ├── HomeController.php
│   │   ├── GameController.php    (+ proxy de APIs)
│   │   ├── UserController.php
│   │   └── AdminController.php
│   ├── models/               ← Modelos (acceso a datos)
│   │   ├── Database.php          (PDO singleton)
│   │   ├── User.php
│   │   └── Wishlist.php
│   └── views/                ← Vistas (plantillas HTML)
│       ├── partials/             (header, footer)
│       ├── home.php
│       ├── search.php
│       ├── game_detail.php
│       ├── login.php
│       ├── register.php
│       ├── profile.php
│       ├── wishlist.php
│       ├── admin/dashboard.php
│       └── errors/404.php, 403.php
├── config/
│   ├── config.php            ← Configuración general
│   ├── database.php          ← Credenciales MySQL
│   └── apis.php              ← Claves de APIs externas
├── public/                   ← Único directorio público
│   ├── index.php             ← Front Controller (router)
│   ├── .htaccess             ← Rewrite rules
│   ├── css/style.css
│   ├── js/app.js
│   └── img/
├── database/
│   └── gamesniper.sql        ← Schema MySQL
└── .htaccess                 ← Protege directorios privados
```

---

## 🔌 Flujo de las APIs

```
Usuario escribe búsqueda
        │
        ▼
 JS → PHP /api/search  ──→  RAWG API  (títulos, imágenes, rating)
        │
        ▼
Usuario hace click en un juego
        │
        ├──→ PHP /api/prices  ──→  IsThereAnyDeal API  (precios por tienda)
        │
        └──→ PHP /api/igdb    ──→  IGDB API (resumen, dev, capturas)
                                    (con OAuth2 Twitch cacheado)
```

Todas las llamadas a APIs externas pasan por PHP (servidor),
manteniendo las claves seguras y fuera del cliente.

---

## 👥 Roles de usuario

| Rol | Puede |
|-----|-------|
| **Visitante** | Buscar juegos, ver precios |
| **Usuario** | Lo anterior + Wishlist + Historial de búsquedas |
| **Admin** | Todo lo anterior + Panel de administración + Gestión de usuarios |

---

## 🛡️ Seguridad implementada

- Contraseñas hasheadas con `password_hash()` (bcrypt)
- Consultas SQL con PDO + prepared statements (anti SQL injection)
- Tokens CSRF en todos los formularios POST
- Claves de APIs solo en servidor (nunca expuestas al cliente)
- Validación de roles en cada acción protegida
- Escape de HTML con `htmlspecialchars()` en todas las vistas

---

## 📋 Tecnologías utilizadas

| Tecnología | Uso |
|-----------|-----|
| PHP 8+ | Backend, MVC, proxy de APIs |
| MySQL | Base de datos |
| HTML5 | Estructura de vistas |
| CSS3 | Diseño responsive (sin frameworks) |
| JavaScript ES6+ | Interactividad, llamadas AJAX |
| RAWG API | Búsqueda de juegos e imágenes |
| IsThereAnyDeal API | Precios por tienda |
| IGDB API | Detalles, desarrolladores, capturas |
| XAMPP | Servidor local (Apache + MySQL + PHP) |
