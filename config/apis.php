<?php
// ============================================================
//  CLAVES DE API - GameSniper
//  Rellena cada clave antes de ejecutar el proyecto.
// ============================================================

// ------------------------------------------------------------------
// RAWG Video Games Database
//  Registro gratuito en: https://rawg.io/apidocs
//  Proporciona: títulos, imágenes, valoraciones, géneros
// ------------------------------------------------------------------
define('RAWG_API_KEY', '72f870d346b34ec5a0804844152a4151');
define('RAWG_BASE_URL', 'https://api.rawg.io/api');

// ------------------------------------------------------------------
// IsThereAnyDeal API
//  Registro en: https://docs.isthereanydeal.com/
//  Proporciona: precios por tienda en tiempo real
// ------------------------------------------------------------------
define('ITAD_API_KEY', '1a2070edf6e7c49dc95e34460c159cd557853dbc');
define('ITAD_BASE_URL', 'https://api.isthereanydeal.com');

// ------------------------------------------------------------------
// IGDB API (requiere cuenta gratuita de Twitch Developer)
//  Registro en: https://api-docs.igdb.com/#getting-started
//  1. Ve a https://dev.twitch.tv/console/apps y crea una app
//  2. Copia el Client ID y genera un Client Secret
//  Proporciona: desarrolladores, fechas de lanzamiento, detalles
// ------------------------------------------------------------------
define('IGDB_CLIENT_ID',     'cgonhad7rdniw1lab942l4joitpqbw');
define('IGDB_CLIENT_SECRET', 'i0utq32m63qu63ca9wqtjhbccdbwse');
define('IGDB_BASE_URL',      'https://api.igdb.com/v4');
define('IGDB_AUTH_URL',      'https://id.twitch.tv/oauth2/token');

// Ruta donde se guarda el token IGDB cacheado
define('IGDB_TOKEN_FILE', ROOT_PATH . '/config/.igdb_token.json');
