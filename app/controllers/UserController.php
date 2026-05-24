<?php
/**
 * CONTROLLER: User
 * Sirve vistas HTML y expone endpoints JSON para los modelos JS.
 */
class UserController {

    private function requireLogin(): void {
        if (empty($_SESSION['logged_in'])) {
            header('Location: ' . BASE_URL . '/login');
            exit;
        }
    }

    private function jsonResponse(array $data, int $code = 200): void {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    // ── VISTAS HTML ───────────────────────────────────────────────

    public function login(): void {
        if (!empty($_SESSION['logged_in'])) { header('Location: ' . BASE_URL . '/'); exit; }
        $pageTitle = 'Iniciar sesión – GameSniper';
        include VIEWS_PATH . '/partials/header.php';
        readfile(VIEWS_PATH . '/login.html');
        include VIEWS_PATH . '/partials/footer.php';
    }

    public function register(): void {
        if (!empty($_SESSION['logged_in'])) { header('Location: ' . BASE_URL . '/'); exit; }
        $pageTitle = 'Crear cuenta – GameSniper';
        include VIEWS_PATH . '/partials/header.php';
        readfile(VIEWS_PATH . '/register.html');
        include VIEWS_PATH . '/partials/footer.php';
    }

    public function profile(): void {
        $this->requireLogin();
        $pageTitle = 'Mi perfil – GameSniper';
        include VIEWS_PATH . '/partials/header.php';
        readfile(VIEWS_PATH . '/profile.html');
        include VIEWS_PATH . '/partials/footer.php';
    }

    public function wishlist(): void {
        $this->requireLogin();
        $pageTitle = 'Mi Wishlist – GameSniper';
        include VIEWS_PATH . '/partials/header.php';
        readfile(VIEWS_PATH . '/wishlist.html');
        include VIEWS_PATH . '/partials/footer.php';
    }

    public function logout(): void {
        session_destroy();
        header('Location: ' . BASE_URL . '/');
        exit;
    }

    // ── ENDPOINTS JSON: Auth ──────────────────────────────────────

    public function apiLogin(): void {
        $data   = json_decode(file_get_contents('php://input'), true);
        $result = (new User())->login(
            trim($data['email']    ?? ''),
            trim($data['password'] ?? '')
        );
        $this->jsonResponse($result);
    }

    public function apiRegister(): void {
        $data   = json_decode(file_get_contents('php://input'), true);
        $result = (new User())->register(
            trim($data['username'] ?? ''),
            trim($data['email']    ?? ''),
            trim($data['password'] ?? '')
        );
        $this->jsonResponse($result);
    }

    public function apiLogout(): void {
        session_destroy();
        $this->jsonResponse(['success' => true]);
    }

    // ── ENDPOINTS JSON: Perfil ────────────────────────────────────

    public function apiProfile(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['error' => 'No autenticado'], 401); }
        $user = (new User())->findById((int)$_SESSION['user_id']);
        unset($user['password']);
        $this->jsonResponse($user ?? []);
    }

    public function apiUpdateProfile(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['error' => 'No autenticado'], 401); }
        $data   = json_decode(file_get_contents('php://input'), true);
        $result = (new User())->updateProfile(
            (int)$_SESSION['user_id'],
            trim($data['username'] ?? ''),
            trim($data['email']    ?? '')
        );
        $this->jsonResponse($result);
    }

    public function apiChangePassword(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['error' => 'No autenticado'], 401); }
        $data   = json_decode(file_get_contents('php://input'), true);
        $result = (new User())->changePassword(
            (int)$_SESSION['user_id'],
            $data['current_password'] ?? '',
            $data['new_password']     ?? ''
        );
        $this->jsonResponse($result);
    }

    public function apiHistory(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse([]); }
        $this->jsonResponse((new User())->getSearchHistory((int)$_SESSION['user_id']));
    }

    // ── ENDPOINTS JSON: Wishlist ──────────────────────────────────

    public function apiWishlistGet(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse([]); }
        $this->jsonResponse((new Wishlist())->getByUser((int)$_SESSION['user_id']));
    }

    public function apiWishlistAdd(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['success'=>false,'message'=>'Debes iniciar sesión.']); }
        $data   = json_decode(file_get_contents('php://input'), true);
        $result = (new Wishlist())->add(
            (int)$_SESSION['user_id'],
            $data['slug']   ?? '',
            $data['name']   ?? '',
            $data['image']  ?? '',
            (float)($data['rating'] ?? 0)
        );
        $this->jsonResponse($result);
    }

    public function apiWishlistRemove(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['success'=>false,'message'=>'No autenticado.']); }
        $data   = json_decode(file_get_contents('php://input'), true);
        $result = (new Wishlist())->remove((int)$_SESSION['user_id'], $data['slug'] ?? '');
        $this->jsonResponse($result);
    }

    public function apiUploadAvatar(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['success' => false, 'message' => 'No autenticado.'], 401); }
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['avatar'])) {
            $this->jsonResponse(['success' => false, 'message' => 'No se recibió ningún archivo.']);
        }
        $file = $_FILES['avatar'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->jsonResponse(['success' => false, 'message' => 'Error al subir el archivo.']);
        }
        if ($file['size'] > 2 * 1024 * 1024) {
            $this->jsonResponse(['success' => false, 'message' => 'El archivo no puede superar 2 MB.']);
        }
        $finfo   = new finfo(FILEINFO_MIME_TYPE);
        $mime    = $finfo->file($file['tmp_name']);
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
        if (!isset($allowed[$mime])) {
            $this->jsonResponse(['success' => false, 'message' => 'Formato no permitido. Usa JPG, PNG, GIF o WebP.']);
        }
        $uploadDir = __DIR__ . '/../../public/uploads/avatars/';
        if (!is_dir($uploadDir)) { mkdir($uploadDir, 0755, true); }

        $userId = (int)$_SESSION['user_id'];
        $user   = (new User())->findById($userId);
        if (!empty($user['avatar'])) {
            $old = $uploadDir . basename(parse_url($user['avatar'], PHP_URL_PATH));
            if (file_exists($old)) @unlink($old);
        }
        $filename = $userId . '_' . time() . '.' . $allowed[$mime];
        if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            $this->jsonResponse(['success' => false, 'message' => 'No se pudo guardar el archivo.']);
        }
        $avatarUrl = BASE_URL . '/uploads/avatars/' . $filename;
        (new User())->updateAvatar($userId, $avatarUrl);
        $this->jsonResponse(['success' => true, 'avatar' => $avatarUrl]);
    }

    public function apiDeleteAvatar(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['success' => false, 'message' => 'No autenticado.'], 401); }
        $userId = (int)$_SESSION['user_id'];
        $user   = (new User())->findById($userId);

        if (!empty($user['avatar'])) {
            $uploadDir = __DIR__ . '/../../public/uploads/avatars/';
            $old = $uploadDir . basename(parse_url($user['avatar'], PHP_URL_PATH));
            if (file_exists($old)) @unlink($old);
        }

        (new User())->updateAvatar($userId, '');
        $_SESSION['avatar'] = '';
        $this->jsonResponse(['success' => true]);
    }

    public function apiWishlistCheck(): void {
        $slug = $_GET['slug'] ?? '';
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['inWishlist' => false]); }
        $this->jsonResponse(['inWishlist' => (new Wishlist())->has((int)$_SESSION['user_id'], $slug)]);
    }

    // ── ENDPOINTS JSON: Notificaciones ────────────────────────────

    public function apiNotifications(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['unseen_comments' => 0]); }
        $count = (new Comment())->countUnseenByUser((int)$_SESSION['user_id']);
        $this->jsonResponse(['unseen_comments' => $count]);
    }

    public function apiMarkCommentsSeen(): void {
        if (empty($_SESSION['logged_in'])) { $this->jsonResponse(['success' => false]); }
        (new Comment())->markAllSeenByUser((int)$_SESSION['user_id']);
        $this->jsonResponse(['success' => true]);
    }
}
