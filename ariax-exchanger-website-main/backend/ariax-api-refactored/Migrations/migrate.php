<?php
// ═══════════════════════════════════════════════════════════════
//  Migrations/migrate.php — اجرای Migration ها به ترتیب
//  تسک ۷: استقرار روی سرور جدید فقط با اجرای این فایل
//
//  استفاده:
//    php migrate.php           (اجرای migration های جدید)
//    php migrate.php --fresh   (حذف و ساخت مجدد کامل)
//    php migrate.php --status  (نمایش وضعیت)
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'ariax_exchange');

$db = new mysqli(DB_HOST, DB_USER, DB_PASS);
$db->set_charset('utf8mb4');
if ($db->connect_error) {
    die("❌ اتصال ناموفق: " . $db->connect_error . "\n");
}

// ساخت دیتابیس اگر وجود ندارد
$db->query("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$db->select_db(DB_NAME);

// جدول ردیابی migration ها
$db->query("
    CREATE TABLE IF NOT EXISTS migrations (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        version    VARCHAR(50)  NOT NULL UNIQUE,
        filename   VARCHAR(200) NOT NULL,
        applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$args   = array_slice($argv ?? [], 1);
$fresh  = in_array('--fresh',  $args);
$status = in_array('--status', $args);

// ── حالت --fresh ──────────────────────────────────────────────
if ($fresh) {
    echo "⚠️  حذف کامل دیتابیس و ساخت مجدد...\n";
    $db->query("DROP DATABASE IF EXISTS `" . DB_NAME . "`");
    $db->query("CREATE DATABASE `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $db->select_db(DB_NAME);
    $db->query("CREATE TABLE migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(50) NOT NULL UNIQUE,
        filename VARCHAR(200) NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "✅ دیتابیس پاک شد.\n\n";
}

// ── لیست migration های اجرا شده ─────────────────────────────
$applied = [];
$res = $db->query("SELECT version FROM migrations ORDER BY version ASC");
while ($row = $res->fetch_assoc()) {
    $applied[$row['version']] = true;
}

// ── اسکن فایل‌های migration ──────────────────────────────────
$dir   = __DIR__ . '/sql';
$files = glob($dir . '/V*__*.sql');
sort($files);

if ($status) {
    echo "وضعیت Migration ها:\n";
    echo str_repeat('─', 60) . "\n";
    foreach ($files as $file) {
        $v    = extractVersion($file);
        $icon = isset($applied[$v]) ? '✅' : '⬜';
        echo "$icon  $v  " . basename($file) . "\n";
    }
    exit(0);
}

// ── اجرای migration های جدید ─────────────────────────────────
$ran = 0;
foreach ($files as $file) {
    $version = extractVersion($file);
    if (isset($applied[$version])) continue;

    echo "▶ اجرای $version — " . basename($file) . " ... ";
    $sql = file_get_contents($file);

    // اجرای چند statement
    if ($db->multi_query($sql)) {
        do { $db->next_result(); } while ($db->more_results());
    }

    if ($db->errno) {
        echo "❌ خطا: " . $db->error . "\n";
        exit(1);
    }

    $stmt = $db->prepare("INSERT INTO migrations (version, filename) VALUES (?, ?)");
    $fname = basename($file);
    $stmt->bind_param('ss', $version, $fname);
    $stmt->execute();

    echo "✅\n";
    $ran++;
}

echo $ran > 0
    ? "\n✅ $ran migration اجرا شد.\n"
    : "\n✅ همه migration ها قبلاً اجرا شده‌اند.\n";

// ── Helper ───────────────────────────────────────────────────
function extractVersion(string $path): string
{
    preg_match('/V(\d+)__/', basename($path), $m);
    return $m[1] ?? '0';
}
