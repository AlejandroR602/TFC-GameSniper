<?php
$pageTitle = '404 – Página no encontrada';
include VIEWS_PATH . '/partials/header.php';
?>
<section class="error-section section">
    <div class="container">
        <div class="error-card">
            <div class="error-card__code">404</div>
            <h1>Página no encontrada</h1>
            <p>La página que buscas no existe o ha sido movida.</p>
            <div class="error-card__actions">
                <a href="<?= BASE_URL ?>/"      class="btn btn-primary">Ir al inicio</a>
                <a href="<?= BASE_URL ?>/search" class="btn btn-outline">Buscar juegos</a>
            </div>
        </div>
    </div>
</section>
<?php include VIEWS_PATH . '/partials/footer.php'; ?>
