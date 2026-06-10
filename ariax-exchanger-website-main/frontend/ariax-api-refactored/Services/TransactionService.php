<?php
// ═══════════════════════════════════════════════════════════════
//  Services/TransactionService.php — منطق تراکنش‌ها
//  تسک ۶: Business Logic جدا از Controller
//  تسک ۸: ثبت Audit Log برای هر تراکنش
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Services;

use Ariax\Core\Database;

class TransactionService
{
    private const VALID_TYPES  = ['deposit', 'withdraw', 'trade'];
    private const VALID_ASSETS = ['IRT', 'BTC', 'ETH', 'USDT', 'TRX'];
    private const FEE_RATE     = 0.002;

    public function listForUser(string $userId, bool $isAdmin): array
    {
        $db = Database::getInstance();

        if ($isAdmin) {
            $res = $db->query("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200");
        } else {
            $stmt = $db->prepare(
                "SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC"
            );
            $stmt->bind_param('s', $userId);
            $stmt->execute();
            $res = $stmt->get_result();
        }

        return $res->fetch_all(MYSQLI_ASSOC);
    }

    public function create(string $userId, string $userName, array $data): array
    {
        $type   = $data['type']        ?? '';
        $asset  = $data['asset']       ?? '';
        $amount = (float)($data['amount'] ?? 0);
        $dest   = $data['destination'] ?? '';

        if (!in_array($type,  self::VALID_TYPES,  true)) {
            throw new \InvalidArgumentException('نوع تراکنش نامعتبر است');
        }
        if (!in_array($asset, self::VALID_ASSETS, true)) {
            throw new \InvalidArgumentException('دارایی نامعتبر است');
        }
        if ($amount <= 0) {
            throw new \InvalidArgumentException('مقدار باید بیشتر از صفر باشد');
        }

        $txId = 'tx-' . uniqid();
        $fee  = round($amount * self::FEE_RATE, 8);

        $db   = Database::getInstance();
        $stmt = $db->prepare("
            INSERT INTO transactions (id, user_id, user_name, type, asset, amount, fee, destination, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->bind_param('sssssdds', $txId, $userId, $userName, $type, $asset, $amount, $fee, $dest);
        $stmt->execute();

        AuditLogService::log(
            AuditLogService::EVENT_TX_CREATED,
            $userId,
            ['type' => $type, 'asset' => $asset, 'amount' => $amount, 'fee' => $fee],
            $txId,
            'transaction'
        );

        return ['transactionId' => $txId, 'fee' => $fee];
    }
}
