<?php
/**
 * CONTROLLER: Comment
 * Endpoints JSON para comentarios: lectura pública, escritura autenticada,
 * consulta del historial propio del usuario.
 */
class CommentController {

    private function jsonResponse(array $data, int $code = 200): void {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    // GET /api/comments?slug=...  → comentarios aprobados de un juego
    public function apiGet(): void {
        $slug = trim($_GET['slug'] ?? '');
        if (!$slug) { $this->jsonResponse([]); }
        $this->jsonResponse((new Comment())->getApprovedByGame($slug));
    }

    // POST /api/comments/add  → enviar comentario (requiere login)
    public function apiAdd(): void {
        if (empty($_SESSION['logged_in'])) {
            $this->jsonResponse(['success' => false, 'message' => 'Debes iniciar sesión para comentar.'], 401);
        }
        $data   = json_decode(file_get_contents('php://input'), true);
        $result = (new Comment())->add(
            (int)$_SESSION['user_id'],
            trim($data['game_slug'] ?? ''),
            trim($data['game_name'] ?? ''),
            trim($data['content']   ?? '')
        );
        $this->jsonResponse($result);
    }

    // GET /api/user/comments  → historial de comentarios del usuario actual
    public function apiUserComments(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse([]); }
        $this->jsonResponse((new Comment())->getByUser((int)$_SESSION['user_id']));
    }
}
