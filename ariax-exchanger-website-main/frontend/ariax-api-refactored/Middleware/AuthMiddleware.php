<?php
// ═══════════════════════════════════════════════════════════════
//  Middleware/AuthMiddleware.php — بررسی توکن و نقش کاربر
//  تسک ۶: Middleware به عنوان لایه مستقل
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Middleware;

use Ariax\Core\Response;
use Ariax\Exceptions\AuthException;
use Ariax\Exceptions\ForbiddenException;
use Ariax\Services\AuthService;

class AuthMiddleware
{
    private static AuthService $authService;

    private static function service(): AuthService
    {
        if (!isset(self::$authService)) {
            self::$authService = new AuthService();
        }
        return self::$authService;
    }

    /**
     * بررسی توکن — اطلاعات سشن برمی‌گرداند یا خطا می‌دهد
     */
    public static function handle(string $token): array
    {
        try {
            return self::service()->verifyToken($token);
        } catch (AuthException $e) {
            Response::error($e->getMessage(), $e->httpCode());
        }
    }

    /**
     * بررسی نقش ادمین
     */
    public static function requireAdmin(array $session): void
    {
        if ($session['role'] !== 'admin') {
            Response::error('دسترسی ندارید', 403);
        }
    }
}
