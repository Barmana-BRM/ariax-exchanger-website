<?php
// ═══════════════════════════════════════════════════════════════
//  Routes/router.php — لایه Route جداگانه
//  تسک ۶: Route ها از Business Logic جدا هستند
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

use Ariax\Core\Request;
use Ariax\Core\Response;
use Ariax\Controllers\AuthController;
use Ariax\Controllers\UserController;
use Ariax\Controllers\TransactionController;
use Ariax\Controllers\MarketController;
use Ariax\Controllers\AuditLogController;
use Ariax\Services\AuthService;
use Ariax\Services\UserService;
use Ariax\Services\TransactionService;

function dispatch(Request $req): void
{
    $resource = $req->resource();
    $id       = $req->id();
    $method   = $req->method();

    // ── /auth/login  /auth/register ─────────────────────────
    if ($resource === 'auth') {
        $ctrl = new AuthController(new AuthService());

        if ($id === 'login'    && $method === 'POST') $ctrl->login($req);
        if ($id === 'register' && $method === 'POST') $ctrl->register($req);
        Response::error('مسیر auth یافت نشد', 404);
    }

    // ── /users ───────────────────────────────────────────────
    if ($resource === 'users') {
        $ctrl = new UserController(new UserService());

        if ($method === 'GET'  && !$id) $ctrl->index($req);
        if ($method === 'PUT'  &&  $id) $ctrl->update($req, $id);
        Response::error('مسیر users یافت نشد', 404);
    }

    // ── /transactions ────────────────────────────────────────
    if ($resource === 'transactions') {
        $ctrl = new TransactionController(new TransactionService());

        if ($method === 'GET')  $ctrl->index($req);
        if ($method === 'POST') $ctrl->store($req);
        Response::error('مسیر transactions یافت نشد', 404);
    }

    // ── /market ──────────────────────────────────────────────
    if ($resource === 'market' && $method === 'GET') {
        (new MarketController())->index($req);
    }

    // ── /audit-logs ──────────────────────────────────────────
    if ($resource === 'audit-logs' && $method === 'GET') {
        (new AuditLogController())->index($req);
    }

    // ── /stats ───────────────────────────────────────────────
    if ($resource === 'stats' && $method === 'GET') {
        // inline — سبک، نیاز به سرویس جداگانه ندارد
        $session = \Ariax\Middleware\AuthMiddleware::handle($req->bearerToken());
        \Ariax\Middleware\AuthMiddleware::requireAdmin($session);

        $db  = \Ariax\Core\Database::getInstance();
        $res = $db->query("SELECT * FROM v_system_stats");
        Response::success(['stats' => $res->fetch_assoc()]);
    }

    // ── Not Found ────────────────────────────────────────────
    Response::error('مسیر پیدا نشد: ' . $resource, 404);
}
