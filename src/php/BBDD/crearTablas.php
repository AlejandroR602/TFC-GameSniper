<?php
require_once './conecta.php';

try {
    $sqlVerificar = "SHOW DATABASES LIKE 'GameSniper'";
    $resultado = $conn->query($sqlVerificar);

    if ($resultado && $resultado->num_rows <= 0) {
        $hash = password_hash("1234", PASSWORD_DEFAULT);

        $sqlVerificar = "SHOW DATABASES LIKE 'GameSniper'";
        $resultado = $conn->query($sqlVerificar);

        if ($resultado && $resultado->num_rows <= 0) {

            $sql = "
            CREATE DATABASE IF NOT EXISTS GameSniper
            CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
            USE GameSniper;

            /* ===================== TABLAS ===================== */
            ";
        }


        if ($conn->multi_query($sql)) {
            while ($conn->next_result()) {;
            }
            echo "Base de datos creada y actualizada correctamente.";
        } else {
            echo "Error: {$conn->error}";
        }
    } else {
        $conn->select_db("GameSniper");
    }

    $conn->close();
} catch (Exception $e) {
    echo "Error al generar las tablas: " . $e->getMessage();
}
