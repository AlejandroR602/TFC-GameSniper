<?php
/**
 * MODEL: Comment
 * Gestiona los comentarios de usuarios por juego con moderación.
 */
class Comment {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function add(int $userId, string $gameSlug, string $gameName, string $content): array {
        $content = trim($content);
        if (strlen($content) < 3)    return ['success' => false, 'message' => 'El comentario es demasiado corto (mínimo 3 caracteres).'];
        if (strlen($content) > 1000) return ['success' => false, 'message' => 'El comentario no puede superar los 1000 caracteres.'];
        if (!$gameSlug)              return ['success' => false, 'message' => 'Juego no identificado.'];

        $rows = $this->db->execute(
            'INSERT INTO comments (user_id, game_slug, game_name, content) VALUES (?, ?, ?, ?)',
            [$userId, $gameSlug, $gameName, $content]
        );
        return $rows > 0
            ? ['success' => true,  'message' => 'Comentario enviado. Estará visible tras la revisión del administrador.']
            : ['success' => false, 'message' => 'Error al guardar el comentario.'];
    }

    public function getApprovedByGame(string $gameSlug): array {
        return $this->db->fetchAll(
            'SELECT c.id, c.content, c.created_at, u.username
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.game_slug = ? AND c.status = "approved"
             ORDER BY c.created_at DESC',
            [$gameSlug]
        );
    }

    public function getByUser(int $userId): array {
        return $this->db->fetchAll(
            'SELECT id, game_slug, game_name, content, status, rejection_reason, created_at
             FROM comments
             WHERE user_id = ?
             ORDER BY created_at DESC',
            [$userId]
        );
    }

    public function getAllForAdmin(): array {
        return $this->db->fetchAll(
            'SELECT c.id, c.content, c.game_slug, c.game_name, c.status,
                    c.rejection_reason, c.created_at, u.username, u.id AS user_id
             FROM comments c
             JOIN users u ON c.user_id = u.id
             ORDER BY FIELD(c.status, "pending", "approved", "rejected"), c.created_at ASC',
            []
        );
    }

    public function countPending(): int {
        $r = $this->db->fetchOne('SELECT COUNT(*) as total FROM comments WHERE status = "pending"');
        return (int)($r['total'] ?? 0);
    }

    public function approve(int $id): bool {
        $this->db->execute(
            'UPDATE comments SET status = "approved", rejection_reason = NULL WHERE id = ?',
            [$id]
        );
        return true;
    }

    public function reject(int $id, string $reason): bool {
        $this->db->execute(
            'UPDATE comments SET status = "rejected", rejection_reason = ? WHERE id = ?',
            [trim($reason), $id]
        );
        return true;
    }

    public function delete(int $id): bool {
        return $this->db->execute('DELETE FROM comments WHERE id = ?', [$id]) > 0;
    }
}
