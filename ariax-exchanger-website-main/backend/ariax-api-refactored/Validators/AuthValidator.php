<?php
// ═══════════════════════════════════════════════════════════════
//  Validators/AuthValidator.php — اعتبارسنجی ورودی‌های احراز هویت
//  تسک ۶: Validation در لایه جداگانه
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Validators;

use Ariax\Exceptions\ValidationException;

class AuthValidator
{
    public static function login(array $data): void
    {
        if (empty(trim($data['username'] ?? ''))) {
            throw new ValidationException('نام کاربری الزامی است');
        }
        if (empty($data['password'] ?? '')) {
            throw new ValidationException('رمز عبور الزامی است');
        }
    }

    public static function register(array $data): void
    {
        $errors = [];

        $nationalId = trim($data['nationalId'] ?? '');
        $username   = trim($data['username']   ?? '');
        $password   = $data['password']        ?? '';
        $phone      = trim($data['phone']      ?? '');

        if (strlen($nationalId) !== 10 || !ctype_digit($nationalId)) {
            $errors[] = 'کد ملی باید دقیقاً ۱۰ رقم عددی باشد';
        }
        if (strlen($password) < 6) {
            $errors[] = 'رمز عبور حداقل ۶ کاراکتر';
        }
        if (strlen($username) < 3) {
            $errors[] = 'نام کاربری حداقل ۳ کاراکتر';
        }
        if (!preg_match('/^09\d{9}$/', $phone)) {
            $errors[] = 'شماره موبایل معتبر وارد کنید (مثال: 09121234567)';
        }

        if (!empty($errors)) {
            throw new ValidationException('خطا در اعتبارسنجی', $errors);
        }
    }
}
