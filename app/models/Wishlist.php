<?php
/**
 * MODEL: Wishlist
 * Gestiona la lista de deseos de cada usuario.
 * Ahora soporta game_rating en escala 0–100 (rating unificado).
 */
class Wishlist {
    private Database $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Añadir un juego a la wishlist.
     * $rating ahora representa el rating unificado 0–100.
     */
    public function add(int $userId, string $slug, string $name, string $image, float $rating = 0): array {
        if ($this->has($userId, $slug)) {
            return ['success' => false, 'message' => 'El juego ya está en tu lista.'];
        }

        // Guardamos rating_final directamente en game_rating
        $this->db->execute(
            'INSERT INTO wishlist (user_id, game_slug, game_name, game_image, game_rating)
             VALUES (?, ?, ?, ?, ?)',
            [$userId, $slug, $name, $image, $rating]
        );

        return ['success' => true, 'message' => 'Añadido a tu lista de deseos.'];
    }

    public function remove(int $userId, string $slug): array {
        $rows = $this->db->execute(
            'DELETE FROM wishlist WHERE user_id = ? AND game_slug = ?',
            [$userId, $slug]
        );
        if ($rows === 0) {
            return ['success' => false, 'message' => 'El juego no estaba en tu lista.'];
        }
        return ['success' => true, 'message' => 'Eliminado de tu lista de deseos.'];
    }

    public function has(int $userId, string $slug): bool {
        $r = $this->db->fetchOne(
            'SELECT id FROM wishlist WHERE user_id = ? AND game_slug = ?',
            [$userId, $slug]
        );
        return $r !== null;
    }

    public function getByUser(int $userId): array {
        return $this->db->fetchAll(
            'SELECT * FROM wishlist WHERE user_id = ? ORDER BY added_at DESC',
            [$userId]
        );
    }

    public function updateImage(int $userId, string $slug, string $image): void {
        $this->db->execute(
            'UPDATE wishlist SET game_image = ? WHERE user_id = ? AND game_slug = ?',
            [$image, $userId, $slug]
        );
    }

    public function countByUser(int $userId): int {
        $r = $this->db->fetchOne(
            'SELECT COUNT(*) as total FROM wishlist WHERE user_id = ?',
            [$userId]
        );
        return (int)($r['total'] ?? 0);
    }

    public function totalCount(): int {
        $r = $this->db->fetchOne('SELECT COUNT(*) as total FROM wishlist');
        return (int)($r['total'] ?? 0);
    }
}
