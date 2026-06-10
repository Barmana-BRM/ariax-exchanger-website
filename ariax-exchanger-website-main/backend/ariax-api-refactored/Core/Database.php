<?php
// ═══════════════════════════════════════════════════════════════
//  Core/Database.php — اتصال singleton به دیتابیس
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Core;

class Database
{
    private static ?\mysqli $instance = null;

    private function __construct() {}

    public static function getInstance(): \mysqli
    {
        if (self::$instance === null || !self::$instance->ping()) {
            $host = defined('DB_HOST') ? DB_HOST : 'localhost';
            $user = defined('DB_USER') ? DB_USER : 'root';
            $pass = defined('DB_PASS') ? DB_PASS : '';
            $name = defined('DB_NAME') ? DB_NAME : 'ariax_exchange';

            $db = new \mysqli($host, $user, $pass, $name);
            $db->set_charset('utf8mb4');

            if ($db->connect_error) {
                throw new \RuntimeException('خطای اتصال به دیتابیس: ' . $db->connect_error);
            }

            self::$instance = $db;
        }

        return self::$instance;
    }
}
