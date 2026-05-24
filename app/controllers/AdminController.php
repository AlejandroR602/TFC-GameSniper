<?php
/**
 * CONTROLLER: Admin
 * Sirve la vista HTML del panel y expone endpoints JSON para el AdminController.js
 */
class AdminController {

    private function requireAdmin(): void {
        if (empty($_SESSION['logged_in']) || ($_SESSION['role'] ?? '') !== 'admin') {
            http_response_code(403);
            include VIEWS_PATH . '/errors/403.php';
            exit;
        }
        // Sincronizar admin_level con BD para que migraciones surtan efecto sin re-login
        $fresh = (new User())->findById((int)$_SESSION['user_id']);
        $_SESSION['admin_level'] = (int)($fresh['admin_level'] ?? 0);
    }

    public function dashboard(): void {
        $this->requireAdmin();
        $pageTitle = 'Panel de Administración – GameSniper';
        include VIEWS_PATH . '/partials/header.php';
        readfile(VIEWS_PATH . '/admin/dashboard.html');
        include VIEWS_PATH . '/partials/footer.php';
    }

    // ── JSON: estadísticas ────────────────────────────────────────
    public function apiStats(): void {
        $this->requireAdmin();
        $userModel = new User();
        $wl        = new Wishlist();
        $cm        = new Comment();
        echo json_encode([
            'total_users'      => $userModel->count(),
            'total_wishlist'   => $wl->totalCount(),
            'pending_comments' => $cm->countPending(),
        ]);
    }

    // ── JSON: lista de usuarios ───────────────────────────────────
    public function apiUsers(): void {
        $this->requireAdmin();
        echo json_encode((new User())->getAll());
    }

    // ── JSON: estado de las APIs configuradas ─────────────────────
    public function apiStatus(): void {
        $this->requireAdmin();
        echo json_encode([
            ['name' => 'RAWG API',            'description' => 'Imágenes y valoraciones',  'configured' => RAWG_API_KEY !== 'TU_CLAVE_RAWG_AQUI'],
            ['name' => 'IsThereAnyDeal API',  'description' => 'Precios por tienda',        'configured' => ITAD_API_KEY !== 'TU_CLAVE_ITAD_AQUI'],
            ['name' => 'IGDB API',            'description' => 'Detalles y desarrolladores','configured' => IGDB_CLIENT_ID !== 'TU_CLIENT_ID_TWITCH_AQUI'],
        ]);
    }

    // ── JSON: eliminar usuario ────────────────────────────────────
    public function deleteUser(int $id): void {
        $this->requireAdmin();
        if ($id === (int)$_SESSION['user_id']) {
            echo json_encode(['success' => false, 'message' => 'No puedes eliminarte a ti mismo.']);
            return;
        }
        $myLevel     = (int)($_SESSION['admin_level'] ?? 0);
        $target      = (new User())->findById($id);
        $targetLevel = (int)($target['admin_level'] ?? 0);
        if ($targetLevel >= $myLevel) {
            echo json_encode(['success' => false, 'message' => 'No tienes permiso para eliminar a este administrador.']);
            return;
        }
        $ok = (new User())->delete($id);
        echo json_encode(['success' => $ok]);
    }

    // ── JSON: cambiar rol ─────────────────────────────────────────
    public function changeRole(int $id): void {
        $this->requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $role = $data['role'] ?? 'user';
        $ok   = (new User())->changeRole($id, $role);
        echo json_encode(['success' => $ok]);
    }

    // ── JSON: listar todos los comentarios ────────────────────────
    public function apiComments(): void {
        $this->requireAdmin();
        echo json_encode((new Comment())->getAllForAdmin());
    }

    // ── JSON: aprobar comentario ──────────────────────────────────
    public function approveComment(): void {
        $this->requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int)($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID no válido.']); return; }
        $ok = (new Comment())->approve($id);
        echo json_encode(['success' => $ok]);
    }

    // ── JSON: rechazar comentario ─────────────────────────────────
    public function rejectComment(): void {
        $this->requireAdmin();
        $data   = json_decode(file_get_contents('php://input'), true);
        $id     = (int)($data['id']     ?? 0);
        $reason = trim($data['reason'] ?? '');
        if (!$id || !$reason) {
            echo json_encode(['success' => false, 'message' => 'Debes indicar un motivo de rechazo.']);
            return;
        }
        $ok = (new Comment())->reject($id, $reason);
        echo json_encode(['success' => $ok]);
    }

    // ── JSON: eliminar comentario (soft-delete con motivo) ────────
    public function deleteComment(int $id): void {
        $this->requireAdmin();
        $data   = json_decode(file_get_contents('php://input'), true);
        $reason = trim($data['reason'] ?? '');
        if (!$id || !$reason) {
            echo json_encode(['success' => false, 'message' => 'Debes indicar un motivo de eliminación.']);
            return;
        }
        $ok = (new Comment())->softDelete($id, $reason);
        echo json_encode(['success' => $ok]);
    }

    // ── JSON: restaurar comentario eliminado ──────────────────────
    public function restoreComment(): void {
        $this->requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int)($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID no válido.']); return; }
        $ok = (new Comment())->approve($id);
        echo json_encode(['success' => $ok]);
    }

    // ── JSON: eliminar comentario definitivamente ─────────────────
    public function purgeComment(): void {
        $this->requireAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int)($data['id'] ?? 0);
        if (!$id) { echo json_encode(['success' => false, 'message' => 'ID no válido.']); return; }
        $ok = (new Comment())->delete($id);
        echo json_encode(['success' => $ok]);
    }
}
