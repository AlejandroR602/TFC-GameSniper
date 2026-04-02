<?php
// php/BBDD/conecta.php

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "GameSniper";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    // Si falla, devolvemos JSON para que el frontend sepa qué pasó
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión con la base de datos'
    ]);
    exit;
}

$conn->set_charset("utf8mb4");
?>