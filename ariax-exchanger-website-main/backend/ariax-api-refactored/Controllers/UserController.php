<?php
// ═══════════════════════════════════════════════════════════════
//  Controllers/UserController.php
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Controllers;

use Ariax\Core\Request;
use Ariax\Core\Response;
use Ariax\Middleware\AuthMiddleware;
use Ariax\Services\UserService;

class UserController
{
    public function __construct(private UserService $userService) {}

    public function index(Request $req): never
    {
        try {
            $session = AuthMiddleware::handle($req->bearerToken());
            AuthMiddleware::requireAdmin($session);

            $users = $this->userService->list();
            Response::success(['users' => $users]);
        } catch (\Throwable $e) {
            Response::serverError($e, 'users.index');
        }
    }

    public function update(Request $req, string $userId): never
    {
        try {
            $session = AuthMiddleware::handle($req->bearerToken());
            AuthMiddleware::requireAdmin($session);

            $this->userService->update($userId, $req->all(), $session['user_id']);
            Response::success();
        } catch (\Ariax\Exceptions\AppException $e) {
            Response::error($e->getMessage(), $e->httpCode());
        } catch (\Throwable $e) {
            Response::serverError($e, 'users.update');
        }
    }
}
