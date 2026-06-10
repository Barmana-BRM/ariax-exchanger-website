<?php
// ═══════════════════════════════════════════════════════════════
//  Controllers/TransactionController.php
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Controllers;

use Ariax\Core\Request;
use Ariax\Core\Response;
use Ariax\Middleware\AuthMiddleware;
use Ariax\Services\TransactionService;

class TransactionController
{
    public function __construct(private TransactionService $txService) {}

    public function index(Request $req): never
    {
        try {
            $session = AuthMiddleware::handle($req->bearerToken());
            $list    = $this->txService->listForUser(
                $session['user_id'],
                $session['role'] === 'admin'
            );
            Response::success(['transactions' => $list]);
        } catch (\Throwable $e) {
            Response::serverError($e, 'transactions.index');
        }
    }

    public function store(Request $req): never
    {
        try {
            $session = AuthMiddleware::handle($req->bearerToken());
            $result  = $this->txService->create(
                $session['user_id'],
                $session['name'],
                $req->all()
            );
            Response::success($result, 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 400);
        } catch (\Throwable $e) {
            Response::serverError($e, 'transactions.store');
        }
    }
}
