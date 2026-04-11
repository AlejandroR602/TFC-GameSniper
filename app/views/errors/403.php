<?php
$pageTitle = '403 – Acceso denegado';
include VIEWS_PATH . '/partials/header.php';
?>
<section class="error-section section">
    <div class="container">
        <div class="error-card">
            <div class="error-card__code">403</div>
            <h1>Acceso denegado</h1>
            <p>No tienes permisos para acceder a esta sección.</p>
            <div class="error-card__actions">
                <a href="<?= BASE_URL ?>/" class="btn btn-primary">Volver al inicio</a>
            </div>
        </div>
    </div>
</section>
<?php include VIEWS_PATH . '/partials/footer.php'; ?>
