<?php
/**
 * MODEL: User
 * Gestiona el registro, autenticación y datos de usuarios.
 */
class User {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    // ----------------------------------------------------------------
    // REGISTRO
    // ----------------------------------------------------------------
    public function register(string $username, string $email, string $password): array {
        // Validaciones
        if (empty($username) || empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'Email no válido.'];
        }
        if (strlen($password) < 6) {
            return ['success' => false, 'message' => 'La contraseña debe tener al menos 6 caracteres.'];
        }
        if ($this->findByEmail($email)) {
            return ['success' => false, 'message' => 'El email ya está registrado.'];
        }
        if ($this->findByUsername($username)) {
            return ['success' => false, 'message' => 'El nombre de usuario ya existe.'];
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $this->db->execute(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [$username, $email, $hash, 'user']
        );
        return ['success' => true, 'message' => '¡Cuenta creada! Ya puedes iniciar sesión.'];
    }

    // ----------------------------------------------------------------
    // LOGIN
    // ----------------------------------------------------------------
    public function login(string $email, string $password): array {
        if (empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'Rellena todos los campos.'];
        }
        $user = $this->findByEmail($email);
        if (!$user || !password_verify($password, $user['password'])) {
            return ['success' => false, 'message' => 'Credenciales incorrectas.'];
        }

        // Iniciar sesión
        $_SESSION['user_id']   = $user['id'];
        $_SESSION['username']  = $user['username'];
        $_SESSION['role']      = $user['role'];
        $_SESSION['logged_in'] = true;

        return ['success' => true, 'user' => $user];
    }

    // ----------------------------------------------------------------
    // BÚSQUEDAS
    // ----------------------------------------------------------------
    public function findById(int $id): ?array {
        return $this->db->fetchOne('SELECT * FROM users WHERE id = ?', [$id]);
    }

    public function findByEmail(string $email): ?array {
        return $this->db->fetchOne('SELECT * FROM users WHERE email = ?', [$email]);
    }

    public function findByUsername(string $username): ?array {
        return $this->db->fetchOne('SELECT * FROM users WHERE username = ?', [$username]);
    }

    public function getAll(): array {
        return $this->db->fetchAll(
            'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
        );
    }

    public function count(): int {
        $r = $this->db->fetchOne('SELECT COUNT(*) as total FROM users');
        return (int)($r['total'] ?? 0);
    }

    // ----------------------------------------------------------------
    // ACTUALIZACIÓN
    // ----------------------------------------------------------------
    public function updateProfile(int $id, string $username, string $email): array {
        if ($this->db->fetchOne(
            'SELECT id FROM users WHERE email = ? AND id != ?', [$email, $id]
        )) {
            return ['success' => false, 'message' => 'El email ya está en uso.'];
        }
        $this->db->execute(
            'UPDATE users SET username = ?, email = ?, updated_at = NOW() WHERE id = ?',
            [$username, $email, $id]
        );
        $_SESSION['username'] = $username;
        return ['success' => true, 'message' => 'Perfil actualizado correctamente.'];
    }

    public function changePassword(int $id, string $current, string $new): array {
        $user = $this->findById($id);
        if (!password_verify($current, $user['password'])) {
            return ['success' => false, 'message' => 'La contraseña actual no es correcta.'];
        }
        if (strlen($new) < 6) {
            return ['success' => false, 'message' => 'La nueva contraseña debe tener al menos 6 caracteres.'];
        }
        $hash = password_hash($new, PASSWORD_BCRYPT);
        $this->db->execute('UPDATE users SET password = ? WHERE id = ?', [$hash, $id]);
        return ['success' => true, 'message' => 'Contraseña cambiada correctamente.'];
    }

    public function changeRole(int $id, string $role): bool {
        $valid = ['user', 'admin'];
        if (!in_array($role, $valid)) return false;
        $this->db->execute('UPDATE users SET role = ? WHERE id = ?', [$role, $id]);
        return true;
    }

    public function delete(int $id): bool {
        return $this->db->execute('DELETE FROM users WHERE id = ?', [$id]) > 0;
    }

    // ----------------------------------------------------------------
    // HISTORIAL DE BÚSQUEDAS
    // ----------------------------------------------------------------
    public function saveSearch(int $userId, string $query): void {
        $this->db->execute(
            'INSERT INTO search_history (user_id, query) VALUES (?, ?)',
            [$userId, $query]
        );
    }

    public function getSearchHistory(int $userId, int $limit = 10): array {
        return $this->db->fetchAll(
            'SELECT query, searched_at FROM search_history
             WHERE user_id = ? ORDER BY searched_at DESC LIMIT ?',
            [$userId, $limit]
        );
    }
}
