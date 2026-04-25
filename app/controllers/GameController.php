<?php

/**
 * CONTROLLER: Game
 * Sirve las vistas HTML de búsqueda/detalle y actúa como proxy
 * seguro entre los Modelos JS y las APIs externas.
 */
class GameController
{

    // ── VISTAS HTML ───────────────────────────────────────────────

    public function search(): void
    {
        if (!empty($_GET['q']) && !empty($_SESSION['user_id'])) {
            (new User())->saveSearch((int)$_SESSION['user_id'], htmlspecialchars(trim($_GET['q']), ENT_QUOTES, 'UTF-8'));
        }
        $pageTitle = 'Buscar juegos – GameSniper';
        include VIEWS_PATH . '/partials/header.php';
        readfile(VIEWS_PATH . '/search.html');
        include VIEWS_PATH . '/partials/footer.php';
    }

    public function detail(string $slug): void
    {
        if (empty($slug)) {
            header('Location: ' . BASE_URL . '/search');
            exit;
        }
        $pageTitle = 'Detalle del juego – GameSniper';
        include VIEWS_PATH . '/partials/header.php';
        readfile(VIEWS_PATH . '/game_detail.html');
        include VIEWS_PATH . '/partials/footer.php';
    }

    // ── API PROXY: RAWG ───────────────────────────────────────────
    public function apiSearch(): void
    {
        $query = trim($_GET['q'] ?? '');
        $page  = max(1, (int)($_GET['page'] ?? 1));
        $order = $_GET['ordering'] ?? '-rating';

        // Parámetros opcionales para fetchTopRated
        $pageSize  = min(40, max(1, (int)($_GET['page_size'] ?? 20)));
        $metacritic = $_GET['metacritic'] ?? null;

        // q es opcional si vienen otros filtros
        if (empty($query) && empty($metacritic)) {
            echo json_encode(['error' => 'Parámetro q requerido']);
            return;
        }

        $params = [
            'key'      => RAWG_API_KEY,
            'page_size' => $pageSize,
            'page'     => $page,
            'ordering' => $order,
        ];

        if (!empty($query))     $params['search']     = $query;
        if (!empty($metacritic)) $params['metacritic'] = $metacritic;

        $url = RAWG_BASE_URL . '/games?' . http_build_query($params);
        $r = $this->get($url);
        if (!$r) {
            echo json_encode(['error' => 'No se pudo conectar con RAWG API.']);
            return;
        }
        $decoded = json_decode($r, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            echo json_encode(['error' => 'Respuesta inválida de RAWG API.']);
            return;
        }
        if (!isset($decoded['results'])) {
            $detail = $decoded['detail'] ?? $decoded['error'] ?? 'Error desconocido de RAWG API.';
            echo json_encode(['error' => $detail]);
            return;
        }
        echo $r;
    }

    // ── API PROXY: IsThereAnyDeal ─────────────────────────────────
    public function apiPrices(): void
    {
        $title = trim($_GET['title'] ?? '');
        if (empty($title)) {
            echo json_encode(['deals' => []]);
            return;
        }

        // 1. Buscar ID del juego en ITAD
        $searchR = $this->get(ITAD_BASE_URL . '/games/search/v1?' . http_build_query(['title' => $title, 'key' => ITAD_API_KEY]));
        $search  = json_decode($searchR, true);
        if (empty($search[0]['id'])) {
            echo json_encode(['deals' => []]);
            return;
        }

        // 2. Obtener precios
        $pricesR = $this->post(
            ITAD_BASE_URL . '/games/prices/v3?key=' . ITAD_API_KEY . '&country=ES',
            json_encode([$search[0]['id']]),
            ['Content-Type: application/json']
        );
        $prices = json_decode($pricesR, true);
        echo json_encode($prices[0] ?? ['deals' => []]);
    }

    // ── API PROXY: IGDB (OAuth2 Twitch server-side) ───────────────
    public function apiIgdb(): void
    {
        $title = trim($_GET['title'] ?? '');
        if (empty($title)) {
            echo json_encode(['error' => 'title requerido']);
            return;
        }

        $token = $this->getIgdbToken();
        if (!$token) {
            echo json_encode(['error' => 'No se pudo obtener token IGDB. Comprueba tus credenciales Twitch.']);
            return;
        }

        $body  = 'fields name,summary,first_release_date,involved_companies.company.name,cover.url,rating,genres.name,platforms.name,screenshots.url;search "' . addslashes($title) . '"; limit 1;';
        $r     = $this->post(IGDB_BASE_URL . '/games', $body, [
            'Client-ID: ' . IGDB_CLIENT_ID,
            'Authorization: Bearer ' . $token,
            'Content-Type: text/plain',
        ]);
        $data  = json_decode($r, true);
        if (empty($data[0])) {
            echo json_encode([]);
            return;
        }

        // Normalizar URL de portada
        if (isset($data[0]['cover']['url'])) {
            $url = str_replace('t_thumb', 't_cover_big', $data[0]['cover']['url']);
            $data[0]['cover']['url'] = str_starts_with($url, 'http') ? $url : 'https:' . $url;
        }
        echo json_encode($data[0]);
    }

    // ── OAuth2 IGDB Token (cacheado en fichero) ───────────────────
    private function getIgdbToken(): ?string
    {
        if (file_exists(IGDB_TOKEN_FILE)) {
            $c = json_decode(file_get_contents(IGDB_TOKEN_FILE), true);
            if (!empty($c['access_token']) && ($c['expires_at'] ?? 0) > time() + 60) return $c['access_token'];
        }
        $r = $this->post(IGDB_AUTH_URL . '?' . http_build_query([
            'client_id' => IGDB_CLIENT_ID,
            'client_secret' => IGDB_CLIENT_SECRET,
            'grant_type' => 'client_credentials',
        ]), '', []);
        $d = json_decode($r, true);
        if (empty($d['access_token'])) return null;
        $d['expires_at'] = time() + (int)($d['expires_in'] ?? 3600);
        file_put_contents(IGDB_TOKEN_FILE, json_encode($d));
        return $d['access_token'];
    }

    // ── cURL helpers ──────────────────────────────────────────────
    private function get(string $url): string|false
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_USERAGENT => 'GameSniper/1.0', CURLOPT_SSL_VERIFYPEER => true]);
        $r = curl_exec($ch);
        curl_close($ch);
        return $r;
    }
    private function post(string $url, string $body, array $headers): string|false
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 10, CURLOPT_USERAGENT => 'GameSniper/1.0', CURLOPT_SSL_VERIFYPEER => true]);
        $r = curl_exec($ch);
        curl_close($ch);
        return $r;
    }
}
