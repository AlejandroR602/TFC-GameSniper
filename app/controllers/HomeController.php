<?php
/**
 * CONTROLLER: Home
 * Sirve la vista HTML de la página principal.
 */
class HomeController {
    public function index(): void {
        $pageTitle = 'GameSniper – Compara precios de videojuegos';
        include VIEWS_PATH . '/partials/header.php';
        // Vista en HTML puro — sin lógica PHP
        readfile(VIEWS_PATH . '/home.html');
        include VIEWS_PATH . '/partials/footer.php';
    }
}
