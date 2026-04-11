</main>

<footer class="footer">
    <div class="container footer__inner">
        <div class="footer__brand">
            <span class="footer__logo">Game<strong>Sniper</strong></span>
            <p>Compara precios de videojuegos en todas las tiendas digitales.</p>
        </div>
        <div class="footer__links">
            <a href="<?= BASE_URL ?>/">Inicio</a>
            <a href="<?= BASE_URL ?>/search">Buscar</a>
            <?php if (!empty($_SESSION['logged_in'])): ?>
                <a href="<?= BASE_URL ?>/wishlist">Mi Wishlist</a>
                <a href="<?= BASE_URL ?>/profile">Mi Perfil</a>
            <?php else: ?>
                <a href="<?= BASE_URL ?>/login">Iniciar sesión</a>
                <a href="<?= BASE_URL ?>/register">Registrarse</a>
            <?php endif; ?>
        </div>
        <div class="footer__apis">
            <span>Impulsado por:</span>
            <a href="https://rawg.io"             target="_blank" rel="noopener">RAWG</a>
            <a href="https://isthereanydeal.com"  target="_blank" rel="noopener">IsThereAnyDeal</a>
            <a href="https://www.igdb.com"        target="_blank" rel="noopener">IGDB</a>
        </div>
    </div>
    <div class="footer__copy">
        <div class="container">&copy; <?= date('Y') ?> GameSniper – Proyecto TFC 2ºDAW</div>
    </div>
</footer>

<!-- JS global (toast, hamburger, utilidades) -->
<script src="<?= BASE_URL ?>/js/app.js"></script>
</body>
</html>
