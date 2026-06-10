<?php
// ═══════════════════════════════════════════════════════════════
//  Core/Response.php — پاسخ استاندارد JSON به Frontend
//  تسک ۹: ساختار یکپارچه برای مدیریت خطا
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Core;

class Response
{
    /**
     * پاسخ موفق
     */
    public static function success(mixed $data = [], int $code = 200, string $message = ''): never
    {
        http_response_code($code);
        $body = ['success' => true, 'data' => $data];
        if ($message !== '') {
            $body['message'] = $message;
        }
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * پاسخ خطا — پیام کاربرپسند، بدون جزئیات داخلی
     */
    public static function error(string $message, int $code = 400, array $errors = []): never
    {
        http_response_code($code);
        $body = ['success' => false, 'error' => $message];
        if (!empty($errors)) {
            $body['errors'] = $errors;
        }
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * خطای سرور — پیام عمومی به کاربر، لاگ کامل در سرور
     */
    public static function serverError(\Throwable $e, string $context = ''): never
    {
        // لاگ جزئیات خطا در سرور (نه برای کاربر)
        $logMsg = sprintf(
            "[%s] SERVER_ERROR context=%s message=%s file=%s line=%d\n",
            date('Y-m-d H:i:s'),
            $context ?: 'unknown',
            $e->getMessage(),
            $e->getFile(),
            $e->getLine()
        );
        error_log($logMsg);

        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error'   => 'خطای داخلی سرور. لطفاً دوباره تلاش کنید.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
