<?php
// ============================================================
// CONFIGURACIÓN GENERAL DE GAMESNIPER
// ============================================================

// URL base del proyecto (ajusta si cambias el nombre de carpeta)
define('BASE_URL', '/Proyectos/TFC-GameSniper/TFC-GameSniper/public/');
define('APP_NAME', 'GameSniper');
define('APP_VERSION', '1.0.0');

// Rutas absolutas del sistema
define('ROOT_PATH',       dirname(__DIR__));
define('APP_PATH',        ROOT_PATH . '/app');
define('CONFIG_PATH',     ROOT_PATH . '/config');
define('VIEWS_PATH',      APP_PATH  . '/views');
define('CONTROLLERS_PATH', APP_PATH . '/controllers');
define('MODELS_PATH',     APP_PATH  . '/models');

// Configuración de sesión
define('SESSION_NAME',    'gamesniper_session');
define('SESSION_LIFETIME', 3600); // 1 hora

// Zonas horarias
date_default_timezone_set('Europe/Madrid');
