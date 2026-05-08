<?php
// ============================================================
// CONFIGURACIÓN DE BASE DE DATOS
// Ajusta estos valores según tu instalación de XAMPP
// ============================================================

define('DB_HOST',    'localhost');
define('DB_NAME',    'gamesniper');
define('DB_USER',    'root');       // Usuario por defecto en XAMPP
define('DB_PASS',    '');           // Contraseña vacía por defecto en XAMPP
define('DB_CHARSET', 'utf8mb4');

// ============================================================
// AUTO-INICIALIZACIÓN DE LA BASE DE DATOS
// Se ejecuta una sola vez si la BD no existe todavía
// ============================================================
function initDatabaseIfNeeded(): void
{
    try {
        // Conecta sin seleccionar BD
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";charset=" . DB_CHARSET,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        // Comprueba si la BD ya existe
        $stmt = $pdo->query(
            "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA
             WHERE SCHEMA_NAME = '" . DB_NAME . "'"
        );

        if ($stmt->rowCount() === 0) {
            // No existe → ejecuta el SQL completo
            $sqlFile = __DIR__ . '/../database/gamesniper.sql';

            if (!file_exists($sqlFile)) {
                die("Error: No se encontró el archivo SQL en: $sqlFile");
            }

            $pdo->exec(file_get_contents($sqlFile));
        }

        // Seleccionar la BD y garantizar que todas las tablas existen
        // (idempotente: seguro de ejecutar aunque la tabla ya exista)
        $pdo->exec("USE `" . DB_NAME . "`");
        $pdo->exec("CREATE TABLE IF NOT EXISTS `comments` (
            `id`               INT(11)      NOT NULL AUTO_INCREMENT,
            `user_id`          INT(11)      NOT NULL,
            `game_slug`        VARCHAR(255) NOT NULL,
            `game_name`        VARCHAR(255) NOT NULL,
            `content`          TEXT         NOT NULL,
            `status`           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
            `rejection_reason` TEXT         NULL,
            `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at`       TIMESTAMP    NULL     ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_comments_game`   (`game_slug`),
            KEY `idx_comments_user`   (`user_id`),
            KEY `idx_comments_status` (`status`),
            CONSTRAINT `fk_comments_user`
                FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    } catch (PDOException $e) {
        die("Error al inicializar la base de datos: " . $e->getMessage());
    }
}

// Llama a la función inmediatamente al cargar este archivo
initDatabaseIfNeeded();
