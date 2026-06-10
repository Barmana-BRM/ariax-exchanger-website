<?php
// ═══════════════════════════════════════════════════════════════
//  Services/AuditLogService.php
//  تسک ۸: Audit Log و Activity Log برای تمام عملیات حساس
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Services;

use Ariax\Core\Database;

class AuditLogService
{
    // انواع رویدادهای قابل ثبت
    public const EVENT_LOGIN           = 'user.login';
    public const EVENT_LOGOUT          = 'user.logout';
    public const EVENT_LOGIN_FAILED    = 'user.login_failed';
    public const EVENT_REGISTER        = 'user.register';

    public const EVENT_KYC_SUBMITTED   = 'kyc.submitted';
    public const EVENT_KYC_APPROVED    = 'kyc.approved';
    public const EVENT_KYC_REJECTED    = 'kyc.rejected';

    public const EVENT_TX_CREATED      = 'transaction.created';
    public const EVENT_TX_UPDATED      = 'transaction.updated';

    public const EVENT_WALLET_CHANGED  = 'wallet.balance_changed';

    public const EVENT_ADMIN_USER_EDIT = 'admin.user_updated';
    public const EVENT_ADMIN_SETTINGS  = 'admin.settings_changed';

    public const EVENT_SYSTEM_ERROR    = 'system.error';

    /**
     * ثبت یک رویداد در جدول audit_logs
     *
     * @param string      $event      نوع رویداد (از ثابت‌های بالا)
     * @param string|null $actorId    user_id انجام‌دهنده عملیات
     * @param array       $meta       اطلاعات اضافه (JSON می‌شود)
     * @param string|null $targetId   موجودیت تحت‌تأثیر (مثلاً user_id هدف یا tx_id)
     * @param string|null $targetType نوع موجودیت هدف ('user','transaction',...)
     */
    public static function log(
        string  $event,
        ?string $actorId    = null,
        array   $meta       = [],
        ?string $targetId   = null,
        ?string $targetType = null
    ): void {
        try {
            $db   = Database::getInstance();
            $ip   = $_SERVER['REMOTE_ADDR']     ?? null;
            $ua   = $_SERVER['HTTP_USER_AGENT'] ?? null;
            $metaJson = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $stmt = $db->prepare("
                INSERT INTO audit_logs
                    (event, actor_id, target_id, target_type, ip_address, user_agent, meta)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param(
                'sssssss',
                $event, $actorId, $targetId, $targetType, $ip, $ua, $metaJson
            );
            $stmt->execute();
        } catch (\Throwable $e) {
            // لاگ به فایل تا عملیات اصلی متوقف نشود
            error_log(sprintf(
                "[AUDIT_LOG_FAIL] %s event=%s actor=%s error=%s\n",
                date('Y-m-d H:i:s'), $event, $actorId ?? 'system', $e->getMessage()
            ));
        }
    }
}
