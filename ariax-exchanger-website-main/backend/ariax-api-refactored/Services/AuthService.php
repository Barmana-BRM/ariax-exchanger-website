<?php
// ═══════════════════════════════════════════════════════════════
//  Services/AuthService.php — منطق کسب‌وکار احراز هویت
//  تسک ۶: جداسازی Business Logic از Controller
//  تسک ۸: ثبت Audit Log برای ورود/خروج
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Services;

use Ariax\Core\Database;
use Ariax\Exceptions\AuthException;
use Ariax\Exceptions\ValidationException;

class AuthService
{
    /**
     * لاگین کاربر — توکن + اطلاعات کامل برمی‌گرداند
     */
    public function login(string $username, string $password, string $ip, string $ua): array
    {
        $db   = Database::getInstance();
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            AuditLogService::log(
                AuditLogService::EVENT_LOGIN_FAILED,
                null,
                ['username' => $username, 'ip' => $ip]
            );
            throw new AuthException('نام کاربری یا رمز عبور اشتباه است');
        }

        $token   = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $stmt2 = $db->prepare(
            "INSERT INTO sessions (token, user_id, ip_address, user_agent, expires_at) VALUES (?,?,?,?,?)"
        );
        $stmt2->bind_param('sssss', $token, $user['id'], $ip, $ua, $expires);
        $stmt2->execute();

        // KYC details
        $kycStmt = $db->prepare(
            "SELECT * FROM kyc_details WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1"
        );
        $kycStmt->bind_param('s', $user['id']);
        $kycStmt->execute();
        $kyc = $kycStmt->get_result()->fetch_assoc();

        AuditLogService::log(
            AuditLogService::EVENT_LOGIN,
            $user['id'],
            ['ip' => $ip, 'ua' => substr($ua, 0, 200)],
            $user['id'],
            'user'
        );

        return [
            'token' => $token,
            'user'  => $this->formatUser($user, $kyc),
        ];
    }

    /**
     * ثبت‌نام کاربر جدید
     */
    public function register(array $data): array
    {
        $db = Database::getInstance();

        $check = $db->prepare("SELECT id FROM users WHERE username = ?");
        $check->bind_param('s', $data['username']);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            throw new ValidationException('این نام کاربری قبلاً ثبت شده است');
        }

        $userId = 'u-' . uniqid();
        $hash   = password_hash($data['password'], PASSWORD_BCRYPT);
        $name   = $data['fullName'] ?: $data['nationalId'];

        $stmt = $db->prepare(
            "INSERT INTO users (id, name, username, password_hash, role, avatar_color, kyc_status)
             VALUES (?, ?, ?, ?, 'user', '#8b5cf6', 'pending')"
        );
        $stmt->bind_param('ssss', $userId, $name, $data['username'], $hash);
        $stmt->execute();

        $kycStmt = $db->prepare(
            "INSERT INTO kyc_details (user_id, full_name, national_id, phone) VALUES (?,?,?,?)"
        );
        $kycStmt->bind_param('ssss', $userId, $data['fullName'], $data['nationalId'], $data['phone']);
        $kycStmt->execute();

        AuditLogService::log(
            AuditLogService::EVENT_REGISTER,
            $userId,
            ['username' => $data['username'], 'national_id' => $data['nationalId']],
            $userId,
            'user'
        );

        return ['userId' => $userId];
    }

    /**
     * اعتبارسنجی توکن — اطلاعات سشن برمی‌گرداند
     */
    public function verifyToken(string $token): array
    {
        if (!$token) {
            throw new AuthException('توکن لازم است', 401);
        }

        $db   = Database::getInstance();
        $stmt = $db->prepare("
            SELECT s.user_id, u.role, u.name, u.username
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > NOW()
        ");
        $stmt->bind_param('s', $token);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        if (!$row) {
            throw new AuthException('سشن منقضی شده است', 401);
        }

        return $row;
    }

    // ── Private ──────────────────────────────────────────────

    private function formatUser(array $user, ?array $kyc): array
    {
        return [
            'id'          => $user['id'],
            'name'        => $user['name'],
            'username'    => $user['username'],
            'role'        => $user['role'],
            'avatarColor' => $user['avatar_color'],
            'kycStatus'   => $user['kyc_status'],
            'kycDetails'  => $kyc ? [
                'fullName'        => $kyc['full_name'],
                'nationalId'      => $kyc['national_id'],
                'phone'           => $kyc['phone'],
                'timestamp'       => $kyc['submitted_at'],
                'rejectionReason' => $kyc['rejection_reason'],
            ] : null,
            'balances' => [
                'IRT'  => (float)$user['balance_irt'],
                'BTC'  => (float)$user['balance_btc'],
                'ETH'  => (float)$user['balance_eth'],
                'USDT' => (float)$user['balance_usdt'],
                'TRX'  => (float)$user['balance_trx'],
            ],
            'cryptoAddresses' => [
                'BTC'  => $user['addr_btc']  ?? '',
                'USDT' => $user['addr_usdt'] ?? '',
                'TRX'  => $user['addr_trx']  ?? '',
            ],
            'cardNo'  => $user['card_no']  ?? '',
            'shibaNo' => $user['shiba_no'] ?? '',
        ];
    }
}
