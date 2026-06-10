<?php
// ═══════════════════════════════════════════════════════════════
//  Services/UserService.php — مدیریت کاربران
//  تسک ۶: Business Logic جدا
//  تسک ۸: Audit Log برای تغییر KYC و ویرایش کاربر
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Services;

use Ariax\Core\Database;

class UserService
{
    public function list(): array
    {
        $db  = Database::getInstance();
        $res = $db->query("SELECT * FROM v_user_summary");
        return $res->fetch_all(MYSQLI_ASSOC);
    }

    /**
     * به‌روزرسانی کاربر توسط ادمین (در حال حاضر: وضعیت KYC)
     */
    public function update(string $userId, array $data, string $adminId): void
    {
        $db = Database::getInstance();

        if (isset($data['kycStatus'])) {
            $status = $data['kycStatus'];
            $allowed = ['unverified', 'pending', 'verified', 'rejected'];
            if (!in_array($status, $allowed, true)) {
                throw new \InvalidArgumentException('وضعیت KYC نامعتبر است');
            }

            $stmt = $db->prepare("UPDATE users SET kyc_status = ? WHERE id = ?");
            $stmt->bind_param('ss', $status, $userId);
            $stmt->execute();

            $event = $status === 'verified'
                ? AuditLogService::EVENT_KYC_APPROVED
                : AuditLogService::EVENT_KYC_REJECTED;

            $meta = ['new_status' => $status, 'admin_id' => $adminId];

            if ($status === 'rejected' && isset($data['rejectionReason'])) {
                $reason = $data['rejectionReason'];
                $upd = $db->prepare("
                    UPDATE kyc_details
                    SET rejection_reason=?, reviewed_at=NOW(), reviewed_by=?
                    WHERE user_id=?
                    ORDER BY submitted_at DESC
                    LIMIT 1
                ");
                $upd->bind_param('sss', $reason, $adminId, $userId);
                $upd->execute();
                $meta['rejection_reason'] = $reason;
            }

            AuditLogService::log($event, $adminId, $meta, $userId, 'user');
        }

        // لاگ عمومی ویرایش کاربر توسط ادمین
        AuditLogService::log(
            AuditLogService::EVENT_ADMIN_USER_EDIT,
            $adminId,
            ['changed_fields' => array_keys($data)],
            $userId,
            'user'
        );
    }
}
