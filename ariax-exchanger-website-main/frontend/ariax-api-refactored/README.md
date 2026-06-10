# آریا اکسچنج — Backend Refactored

## ساختار پروژه (تسک ۶)

```
ariax-api/
├── index.php               ← Entry Point (فقط Bootstrap)
├── .htaccess
│
├── Core/
│   ├── Database.php        ← اتصال Singleton به MySQL
│   ├── Request.php         ← پارسر درخواست HTTP
│   └── Response.php        ← پاسخ استاندارد JSON (تسک ۹)
│
├── Controllers/            ← دریافت درخواست و ارسال پاسخ
│   ├── AuthController.php
│   ├── UserController.php
│   ├── TransactionController.php
│   ├── MarketController.php
│   └── AuditLogController.php  ← گزارش‌گیری (تسک ۸)
│
├── Services/               ← Business Logic
│   ├── AuthService.php
│   ├── UserService.php
│   ├── TransactionService.php
│   └── AuditLogService.php     ← ثبت رویدادها (تسک ۸)
│
├── Validators/             ← Validation جداگانه (تسک ۶)
│   └── AuthValidator.php
│
├── Middleware/             ← بررسی توکن و نقش
│   └── AuthMiddleware.php
│
├── Exceptions/             ← Exception های سفارشی (تسک ۹)
│   └── AppException.php
│       ├── AuthException
│       ├── ForbiddenException
│       ├── NotFoundException
│       └── ValidationException
│
├── Routes/
│   └── router.php          ← تعریف Route ها (تسک ۶)
│
└── Migrations/             ← تسک ۷
    ├── migrate.php         ← اجرای Migration ها
    └── sql/
        ├── V001__create_base_schema.sql
        ├── V002__seed_initial_data.sql
        ├── V003__kyc_add_email.sql
        └── V004__create_audit_logs.sql
```

---

## نصب روی سرور جدید (تسک ۷)

```bash
# ۱. کپی فایل‌ها
cp -r ariax-api /var/www/html/

# ۲. تنظیم متغیرهای محیطی
export DB_HOST=localhost
export DB_USER=root
export DB_PASS=your_password
export DB_NAME=ariax_exchange
export APP_ENV=production
export CORS_ORIGINS=https://yourdomain.com

# ۳. اجرای Migration ها (یک بار)
cd /var/www/html/ariax-api/Migrations
php migrate.php

# ۴. بررسی وضعیت
php migrate.php --status
```

---

## Audit Log (تسک ۸)

رویدادهای ثبت‌شده:

| Event | توضیح |
|-------|-------|
| `user.login` | ورود موفق |
| `user.login_failed` | ورود ناموفق |
| `user.register` | ثبت‌نام |
| `kyc.approved` | تأیید KYC |
| `kyc.rejected` | رد KYC |
| `transaction.created` | ثبت تراکنش |
| `admin.user_updated` | ویرایش کاربر توسط ادمین |

گزارش‌گیری (فقط ادمین):
```
GET /audit-logs
GET /audit-logs?event=kyc.rejected
GET /audit-logs?actor_id=admin-001&from=2025-01-01
```

---

## Error Handling (تسک ۹)

همه پاسخ‌ها یک ساختار دارند:

```json
// موفق
{ "success": true, "data": {...}, "message": "..." }

// خطا
{ "success": false, "error": "پیام کاربرپسند", "errors": [...] }
```

- خطاهای داخلی (`500`) فقط در `error_log` ثبت می‌شوند
- در `production` پیام `خطای داخلی سرور` به کاربر نمایش داده می‌شود
- در `development` پیام واقعی نمایش داده می‌شود (`APP_ENV=development`)
