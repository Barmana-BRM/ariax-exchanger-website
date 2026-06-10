<?php
// ═══════════════════════════════════════════════════════════════
//  Exceptions/AppException.php — Exception های سفارشی
//  تسک ۹: مدیریت خطای یکپارچه
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Exceptions;

/**
 * پایه همه Exception های اپلیکیشن
 * code = HTTP status code
 */
class AppException extends \RuntimeException
{
    public function __construct(string $message, int $httpCode = 400)
    {
        parent::__construct($message, $httpCode);
    }

    public function httpCode(): int
    {
        return $this->getCode();
    }
}

class AuthException extends AppException
{
    public function __construct(string $message = 'دسترسی غیرمجاز', int $httpCode = 401)
    {
        parent::__construct($message, $httpCode);
    }
}

class ForbiddenException extends AppException
{
    public function __construct(string $message = 'دسترسی ندارید')
    {
        parent::__construct($message, 403);
    }
}

class NotFoundException extends AppException
{
    public function __construct(string $message = 'مورد یافت نشد')
    {
        parent::__construct($message, 404);
    }
}

class ValidationException extends AppException
{
    private array $errors;

    public function __construct(string $message, array $errors = [])
    {
        parent::__construct($message, 422);
        $this->errors = $errors;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
