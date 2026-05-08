<?php

/**
 * MODEL: Database
 * Singleton PDO. Centraliza la conexión a MySQL.
 */
class Database
{
    private static ?Database $instance = null;
    private PDO $pdo;

    private function __construct()
    {
        // Primero inicializa la BD si no existe
        $this->initDatabaseIfNeeded();

        // Ahora conecta normalmente con dbname
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            die(json_encode([
                'error' => 'Error de conexión a la base de datos: ' . $e->getMessage()
            ]));
        }
    }

    /**
     * Crea la base de datos y las tablas si no existen todavía.
     * Se conecta sin dbname para poder ejecutar CREATE DATABASE.
     */
    private function initDatabaseIfNeeded(): void
    {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';charset=' . DB_CHARSET,
                DB_USER,
                DB_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );

            $stmt = $pdo->query(
                "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA
                 WHERE SCHEMA_NAME = '" . DB_NAME . "'"
            );

            if ($stmt->rowCount() === 0) {
                $sqlFile = __DIR__ . '/../../database/gamesniper.sql';

                if (!file_exists($sqlFile)) {
                    die(json_encode([
                        'error' => 'No se encontró el archivo SQL: ' . $sqlFile
                    ]));
                }

                $pdo->exec(file_get_contents($sqlFile));
            } else {
                // BD existe: asegurar que tablas nuevas estén creadas (migraciones)
                $pdo->exec('USE `' . DB_NAME . '`');
                $pdo->exec("CREATE TABLE IF NOT EXISTS `comments` (
                    `id`               INT(11)      NOT NULL AUTO_INCREMENT,
                    `user_id`          INT(11)      NOT NULL,
                    `game_slug`        VARCHAR(255) NOT NULL,
                    `game_name`        VARCHAR(255) NOT NULL,
                    `content`          TEXT         NOT NULL,
                    `status`           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
                    `rejection_reason` TEXT         NULL,
                    `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `updated_at`       TIMESTAMP    NULL ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `idx_comments_game`   (`game_slug`),
                    KEY `idx_comments_user`   (`user_id`),
                    KEY `idx_comments_status` (`status`),
                    CONSTRAINT `fk_comments_user`
                        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
                        ON DELETE CASCADE ON UPDATE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            }
        } catch (PDOException $e) {
            die(json_encode([
                'error' => 'Error al inicializar la base de datos: ' . $e->getMessage()
            ]));
        }
    }
    public static function getInstance(): Database
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getPDO(): PDO
    {
        return $this->pdo;
    }

    public function query(string $sql, array $params = []): PDOStatement
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public function fetchOne(string $sql, array $params = []): ?array
    {
        $result = $this->query($sql, $params)->fetch();
        return $result ?: null;
    }

    public function fetchAll(string $sql, array $params = []): array
    {
        return $this->query($sql, $params)->fetchAll();
    }

    public function execute(string $sql, array $params = []): int
    {
        return $this->query($sql, $params)->rowCount();
    }

    public function lastInsertId(): string
    {
        return $this->pdo->lastInsertId();
    }
}
