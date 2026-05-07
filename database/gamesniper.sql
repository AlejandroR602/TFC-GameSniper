-- ============================================================
-- GAMESNIPER – Base de datos MySQL
-- Importa este archivo en phpMyAdmin o ejecuta:
--   mysql -u root -p < gamesniper.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `gamesniper`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `gamesniper`;

-- ------------------------------------------------------------
-- Tabla: users
-- Almacena los usuarios registrados de la aplicación.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)  NOT NULL,
  `email`      VARCHAR(100) NOT NULL,
  `password`   VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt',
  `role`       ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email`    (`email`),
  UNIQUE KEY `uq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: wishlist
-- Juegos que cada usuario ha guardado en su lista de deseos.
-- Los datos del juego (nombre, imagen) se almacenan para
-- poder mostrarlos sin consultar la API cada vez.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wishlist` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11)      NOT NULL,
  `game_slug`   VARCHAR(255) NOT NULL COMMENT 'Slug RAWG del juego',
  `game_name`   VARCHAR(255) NOT NULL,
  `game_image`  VARCHAR(500) DEFAULT NULL,
  `game_rating` DECIMAL(3,1) DEFAULT 0.0,
  `added_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_game` (`user_id`, `game_slug`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_wishlist_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabla: search_history
-- Historial de búsquedas por usuario.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `search_history` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11)      DEFAULT NULL,
  `query`       VARCHAR(255) NOT NULL,
  `searched_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_history` (`user_id`),
  CONSTRAINT `fk_history_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Usuario administrador por defecto
-- ⚠️  Cambia la contraseña INMEDIATAMENTE después del primer login.
--     Credenciales: admin@gamesniper.com / Admin1234!
--     Hash generado con: password_hash('Admin1234!', PASSWORD_BCRYPT)
INSERT INTO `users` (`username`, `email`, `password`, `role`) VALUES
(
  'admin',
  'admin@gamesniper.com',
  '$2a$12$mcUrOnj4JTgU3K.ExLyXqOYfbRmGevLEwg5u5buh9GqozOiTcw50O',
  'admin'
)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- ------------------------------------------------------------
-- Tabla: comments
-- Comentarios de usuarios por juego con moderación del admin.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comments` (
  `id`               INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`          INT(11)      NOT NULL,
  `game_slug`        VARCHAR(255) NOT NULL COMMENT 'Slug RAWG del juego',
  `game_name`        VARCHAR(255) NOT NULL COMMENT 'Nombre del juego (caché)',
  `content`          TEXT         NOT NULL,
  `status`           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `rejection_reason` TEXT         NULL,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP    NULL     ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comments_game`   (`game_slug`),
  KEY `idx_comments_user`   (`user_id`),
  KEY `idx_comments_status` (`status`),
  CONSTRAINT `fk_comments_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NOTAS SOBRE LA ESTRUCTURA
-- ============================================================
--
-- Entidad-Relación:
--   users (1) ──< wishlist (N)        [un usuario, muchos juegos guardados]
--   users (1) ──< search_history (N)  [un usuario, muchos registros de búsqueda]
--
-- Los datos de videojuegos (título, imagen, precio) NO se almacenan
-- en la BD. Se obtienen en tiempo real desde las APIs externas:
--   • RAWG       → imágenes, valoraciones, géneros
--   • ITAD       → precios por tienda
--   • IGDB       → desarrolladores, resumen, capturas
--
-- Esto garantiza datos siempre actualizados y evita duplicar
-- información que ya gestionan las plataformas externas.
-- ============================================================
