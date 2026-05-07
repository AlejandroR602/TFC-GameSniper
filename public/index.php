<?php
// ============================================================
// GAMESNIPER – FRONT CONTROLLER (MVC)
// Punto de entrada único. Routing y carga de clases.
// ============================================================

spl_autoload_register(function (string $class): void {
    foreach ([
        __DIR__ . '/../app/controllers/' . $class . '.php',
        __DIR__ . '/../app/models/'      . $class . '.php',
    ] as $f) {
        if (file_exists($f)) { require_once $f; return; }
    }
});

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/apis.php';

session_name(SESSION_NAME);
session_set_cookie_params(SESSION_LIFETIME);
session_start();

// ── Parsear URI ───────────────────────────────────────────────
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($uri, BASE_URL)) $uri = substr($uri, strlen(BASE_URL));
$parts = array_values(array_filter(explode('/', trim($uri, '/'))));

$s0 = $parts[0] ?? '';
$s1 = $parts[1] ?? '';
$s2 = $parts[2] ?? '';
$s3 = $parts[3] ?? '';

// ── Routing ───────────────────────────────────────────────────
match(true) {

    // ── Vistas principales ────────────────────────────────────
    ($s0 === '')          => (new HomeController())->index(),
    ($s0 === 'search')    => (new GameController())->search(),
    ($s0 === 'game')      => (new GameController())->detail($s1),
    ($s0 === 'login')     => (new UserController())->login(),
    ($s0 === 'register')  => (new UserController())->register(),
    ($s0 === 'logout')    => (new UserController())->logout(),
    ($s0 === 'profile')   => (new UserController())->profile(),
    ($s0 === 'wishlist')  => (new UserController())->wishlist(),
    ($s0 === 'admin')     => (new AdminController())->dashboard(),

    // ── API: Juegos (proxy a APIs externas) ───────────────────
    ($s0==='api' && $s1==='search')  => call_user_func(function() { header('Content-Type: application/json'); (new GameController())->apiSearch(); }),
    ($s0==='api' && $s1==='prices')  => call_user_func(function() { header('Content-Type: application/json'); (new GameController())->apiPrices(); }),
    ($s0==='api' && $s1==='igdb')    => call_user_func(function() { header('Content-Type: application/json'); (new GameController())->apiIgdb(); }),

    // ── API: Auth ─────────────────────────────────────────────
    ($s0==='api' && $s1==='auth' && $s2==='login')    => (new UserController())->apiLogin(),
    ($s0==='api' && $s1==='auth' && $s2==='register') => (new UserController())->apiRegister(),
    ($s0==='api' && $s1==='auth' && $s2==='logout')   => (new UserController())->apiLogout(),

    // ── API: Usuario ──────────────────────────────────────────
    ($s0==='api' && $s1==='user' && $s2==='profile')  => (new UserController())->apiProfile(),
    ($s0==='api' && $s1==='user' && $s2==='update')   => (new UserController())->apiUpdateProfile(),
    ($s0==='api' && $s1==='user' && $s2==='password') => (new UserController())->apiChangePassword(),
    ($s0==='api' && $s1==='user' && $s2==='history')  => (new UserController())->apiHistory(),
    ($s0==='api' && $s1==='user' && $s2==='wishlist') => (new UserController())->apiWishlistGet(),

    // ── API: Wishlist ─────────────────────────────────────────
    ($s0==='api' && $s1==='wishlist' && $s2==='add')    => (new UserController())->apiWishlistAdd(),
    ($s0==='api' && $s1==='wishlist' && $s2==='remove') => (new UserController())->apiWishlistRemove(),
    ($s0==='api' && $s1==='wishlist' && $s2==='check')  => (new UserController())->apiWishlistCheck(),

    // ── API: Admin ────────────────────────────────────────────
    ($s0==='api' && $s1==='admin' && $s2==='stats')      => call_user_func(function() { header('Content-Type: application/json'); (new AdminController())->apiStats(); }),
    ($s0==='api' && $s1==='admin' && $s2==='users')      => call_user_func(function() { header('Content-Type: application/json'); (new AdminController())->apiUsers(); }),
    ($s0==='api' && $s1==='admin' && $s2==='api-status') => call_user_func(function() { header('Content-Type: application/json'); (new AdminController())->apiStatus(); }),
    ($s0==='api' && $s1==='admin' && $s2==='delete')     => call_user_func(function() use ($s3) { header('Content-Type: application/json'); (new AdminController())->deleteUser((int)$s3); }),
    ($s0==='api' && $s1==='admin' && $s2==='role')       => call_user_func(function() use ($s3) { header('Content-Type: application/json'); (new AdminController())->changeRole((int)$s3); }),

    // ── API: Admin – Comentarios (orden: específico → genérico) ──
    ($s0==='api' && $s1==='admin' && $s2==='comments' && $s3==='approve') => call_user_func(function() { header('Content-Type: application/json'); (new AdminController())->approveComment(); }),
    ($s0==='api' && $s1==='admin' && $s2==='comments' && $s3==='reject')  => call_user_func(function() { header('Content-Type: application/json'); (new AdminController())->rejectComment(); }),
    ($s0==='api' && $s1==='admin' && $s2==='comments' && is_numeric($s3)) => call_user_func(function() use ($s3) { header('Content-Type: application/json'); (new AdminController())->deleteComment((int)$s3); }),
    ($s0==='api' && $s1==='admin' && $s2==='comments')                    => call_user_func(function() { header('Content-Type: application/json'); (new AdminController())->apiComments(); }),

    // ── API: Comentarios ──────────────────────────────────────
    ($s0==='api' && $s1==='comments' && $s2==='add') => call_user_func(function() { header('Content-Type: application/json'); (new CommentController())->apiAdd(); }),
    ($s0==='api' && $s1==='comments')                => call_user_func(function() { header('Content-Type: application/json'); (new CommentController())->apiGet(); }),

    // ── API: Usuario – Comentarios propios ────────────────────
    ($s0==='api' && $s1==='user' && $s2==='comments') => call_user_func(function() { header('Content-Type: application/json'); (new CommentController())->apiUserComments(); }),

    // ── 404 ───────────────────────────────────────────────────
    default => call_user_func(function() {
        http_response_code(404);
        include VIEWS_PATH . '/errors/404.php';
    }),
};
