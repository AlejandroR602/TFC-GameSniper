<?php
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$isLoggedIn = !empty($_SESSION['logged_in']);
$isAdmin    = $isLoggedIn && ($_SESSION['role'] ?? '') === 'admin';
$username   = htmlspecialchars($_SESSION['username'] ?? '', ENT_QUOTES, 'UTF-8');
$userRole   = htmlspecialchars($_SESSION['role']     ?? '', ENT_QUOTES, 'UTF-8');
$csrfToken  = htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle ?? 'GameSniper', ENT_QUOTES, 'UTF-8') ?></title>
    <meta name="description" content="GameSniper – Compara precios de videojuegos en todas las tiendas digitales.">
    <!-- Meta tags leídas por los Modelos JS para conocer el estado de sesión -->
    <meta name="base-url"       content="<?= BASE_URL ?>">
    <meta name="csrf-token"     content="<?= $csrfToken ?>">
    <meta name="user-logged-in" content="<?= $isLoggedIn ? 'true' : 'false' ?>">
    <meta name="username"       content="<?= $username ?>">
    <meta name="user-role"      content="<?= $userRole ?>">
    <link rel="stylesheet" href="<?= BASE_URL ?>/css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>

<header class="navbar">
    <div class="container navbar__inner">
        <a href="<?= BASE_URL ?>/" class="navbar__logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#00b4ff" stroke-width="2"/>
                <path d="M8 12h8M12 8l4 4-4 4" stroke="#00b4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Game<strong>Sniper</strong></span>
        </a>
        <form class="navbar__search" action="<?= BASE_URL ?>/search" method="GET">
            <input type="search" name="q" placeholder="Busca un juego..."
                value="<?= htmlspecialchars($_GET['q'] ?? '', ENT_QUOTES, 'UTF-8') ?>" autocomplete="off">
            <button type="submit" aria-label="Buscar">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
            </button>
        </form>
        <nav class="navbar__nav" id="navMenu">
            <?php if ($isLoggedIn): ?>
                <a href="<?= BASE_URL ?>/wishlist" class="nav-link">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    Wishlist
                </a>
                <div class="navbar__user">
                    <span class="navbar__avatar"><?= mb_strtoupper(mb_substr($username, 0, 1)) ?></span>
                    <span><?= $username ?></span>
                    <div class="navbar__dropdown">
                        <a href="<?= BASE_URL ?>/profile">Mi perfil</a>
                        <?php if ($isAdmin): ?><a href="<?= BASE_URL ?>/admin">Panel Admin</a><?php endif; ?>
                        <a href="<?= BASE_URL ?>/logout" class="text-danger">Cerrar sesión</a>
                    </div>
                </div>
            <?php else: ?>
                <a href="<?= BASE_URL ?>/login" class="nav-link">Entrar</a>
                <a href="<?= BASE_URL ?>/register" class="btn btn-primary btn-sm">Registrarse</a>
            <?php endif; ?>
        </nav>
        <button class="navbar__hamburger" id="hamburger" aria-label="Menú">
            <span></span><span></span><span></span>
        </button>
    </div>
</header>

<!-- Modelos JS (cargados como scripts clásicos para que sean globales) -->

<main class="main-content">
