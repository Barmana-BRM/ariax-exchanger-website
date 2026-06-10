<?php
// ═══════════════════════════════════════════════════════════════
//  Controllers/AuditLogController.php
//  تسک ۸: گزارش‌گیری از Audit Log برای ادمین
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Controllers;

use Ariax\Core\Database;
use Ariax\Core\Request;
use Ariax\Core\Response;
use Ariax\Middleware\AuthMiddleware;

class AuditLogController
{
    public function index(Request $req): never
    {
        try {
            $session = AuthMiddleware::handle($req->bearerToken());
            AuthMiddleware::requireAdmin($session);

            $db = Database::getInstance();

            // فیلترهای اختیاری
            $where  = [];
            $params = [];
            $types  = '';

            if ($event = $req->input('event')) {
                $where[]  = 'event = ?';
                $params[] = $event;
                $types   .= 's';
            }
            if ($actorId = $req->input('actor_id')) {
                $where[]  = 'actor_id = ?';
                $params[] = $actorId;
                $types   .= 's';
            }
            if ($from = $req->input('from')) {
                $where[]  = 'created_at >= ?';
                $params[] = $from;
                $types   .= 's';
            }
            if ($to = $req->input('to')) {
                $where[]  = 'created_at <= ?';
                $params[] = $to;
                $types   .= 's';
            }

            $sql = "SELECT * FROM audit_logs";
            if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
            $sql .= " ORDER BY created_at DESC LIMIT 500";

            if ($params) {
                $stmt = $db->prepare($sql);
                $stmt->bind_param($types, ...$params);
                $stmt->execute();
                $res = $stmt->get_result();
            } else {
                $res = $db->query($sql);
            }

            $logs = $res->fetch_all(MYSQLI_ASSOC);
            // parse meta JSON
            foreach ($logs as &$log) {
                $log['meta'] = json_decode($log['meta'] ?? '{}', true);
            }

            Response::success(['logs' => $logs, 'count' => count($logs)]);
        } catch (\Throwable $e) {
            Response::serverError($e, 'audit_logs.index');
        }
    }
}
