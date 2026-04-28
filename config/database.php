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
            // No existe → ejecuta el SQL
            $sqlFile = __DIR__ . '/../database/gamesniper.sql';

            if (!file_exists($sqlFile)) {
                die("Error: No se encontró el archivo SQL en: $sqlFile");
            }

            $pdo->exec(file_get_contents($sqlFile));
        }
    } catch (PDOException $e) {
        die("Error al inicializar la base de datos: " . $e->getMessage());
    }
}

// Llama a la función inmediatamente al cargar este archivo
initDatabaseIfNeeded();
