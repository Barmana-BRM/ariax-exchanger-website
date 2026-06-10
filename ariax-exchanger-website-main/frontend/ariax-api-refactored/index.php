<?php
// ═══════════════════════════════════════════════════════════════
//  index.php — Entry Point (فقط Bootstrap)
//  تسک ۶: منطق کسب‌وکار اینجا نیست؛ فقط راه‌اندازی و dispatch
//  تسک ۹: Global error handler — خطاهای داخلی نمایش داده نمی‌شوند
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

// ── پیکربندی ────────────────────────────────────────────────
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'ariax_exchange');
define('APP_ENV',  $_ENV['APP_ENV'] ?? 'production');

// ── Global Error Handler (تسک ۹) ────────────────────────────
set_exception_handler(function (\Throwable $e) {
    $logMsg = sprintf(
        "[%s] UNHANDLED_EXCEPTION %s in %s:%d\n%s\n",
        date('Y-m-d H:i:s'),
        get_class($e),
        $e->getFile(),
        $e->getLine(),
        $e->getMessage()
    );
    error_log($logMsg);

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
    }
    // در production پیام داخلی نمایش داده نمی‌شود
    $msg = (APP_ENV === 'development') ? $e->getMessage() : 'خطای داخلی سرور. لطفاً دوباره تلاش کنید.';
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit(1);
});

set_error_handler(function (int $errno, string $errstr, string $errfile, int $errline) {
    if ($errno & error_reporting()) {
        throw new \ErrorException($errstr, 0, $errno, $errfile, $errline);
    }
    return false;
});

// ── Autoloader ──────────────────────────────────────────────
spl_autoload_register(function (string $class) {
    $base = __DIR__;
    $file = $base . '/' . str_replace(['Ariax\\', '\\'], ['', '/'], $class) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// ── CORS Headers ────────────────────────────────────────────
$allowedOrigins = explode(',', $_ENV['CORS_ORIGINS'] ?? 'http://localhost:5173');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true) || in_array('*', $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // fallback اگر origin مشخص نشده
    header("Access-Control-Allow-Origin: http://localhost:5173");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Bootstrap و Dispatch ────────────────────────────────────
require_once __DIR__ . '/Routes/router.php';

$request = new \Ariax\Core\Request();
dispatch($request);
