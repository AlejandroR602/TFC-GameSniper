<?php
/**
 * GAMESNIPER – Setup Script
 * Ejecuta este script UNA VEZ para crear el usuario administrador.
 * Accede a: http://localhost/GameSniper/public/setup.php
 * ⚠️ BORRA ESTE ARCHIVO después de ejecutarlo.
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../app/models/Database.php';

$setupKey = $_GET['key'] ?? '';
if ($setupKey !== 'gamesniper_setup_2024') {
    die('<h2>⛔ Acceso denegado.</h2><p>Usa: <code>?key=gamesniper_setup_2024</code></p>');
}

$adminUser  = 'admin';
$adminEmail = 'admin@gamesniper.com';
$adminPass  = 'Admin1234!';
$hash       = password_hash($adminPass, PASSWORD_BCRYPT);

try {
    $db = Database::getInstance();

    // Crear tablas si no existen
    $db->getPDO()->exec(file_get_contents(__DIR__ . '/../database/gamesniper.sql'));

    // Insertar o actualizar admin
    $existing = $db->fetchOne('SELECT id FROM users WHERE email = ?', [$adminEmail]);
    if ($existing) {
        $db->execute('UPDATE users SET password = ?, role = ? WHERE email = ?', [$hash, 'admin', $adminEmail]);
        $msg = '✅ Usuario admin actualizado correctamente.';
    } else {
        $db->execute(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [$adminUser, $adminEmail, $hash, 'admin']
        );
        $msg = '✅ Usuario admin creado correctamente.';
    }
    echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Setup – GameSniper</title>
    <style>body{font-family:system-ui;background:#0d1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;}
    .card{background:#1e2535;border:1px solid #2a3347;border-radius:12px;padding:2.5rem;max-width:480px;width:100%;}
    h1{color:#f97316;margin-bottom:1rem;}code{background:#0d1117;padding:.2rem .5rem;border-radius:4px;color:#f97316;}
    .warn{color:#fde68a;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);padding:.75rem;border-radius:8px;margin-top:1rem;font-size:.875rem;}
    a{color:#f97316;}</style></head><body>
    <div class='card'>
    <h1>🎮 GameSniper Setup</h1>
    <p>$msg</p>
    <p><strong>Email:</strong> <code>$adminEmail</code><br>
    <strong>Contraseña:</strong> <code>$adminPass</code></p>
    <div class='warn'>⚠️ <strong>Importante:</strong> Borra el archivo <code>public/setup.php</code> ahora.<br>
    Cambia la contraseña desde tu perfil tras el primer login.</div>
    <p style='margin-top:1.5rem'><a href='/GameSniper/public/'>→ Ir a GameSniper</a></p>
    </div></body></html>";

} catch (Exception $e) {
    echo '<h2>❌ Error:</h2><pre>' . htmlspecialchars($e->getMessage()) . '</pre>';
    echo '<p>Asegúrate de que la base de datos <strong>gamesniper</strong> existe en MySQL.</p>';
}
