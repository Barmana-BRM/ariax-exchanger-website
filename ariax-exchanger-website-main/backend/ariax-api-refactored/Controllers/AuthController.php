<?php
// ═══════════════════════════════════════════════════════════════
//  Controllers/AuthController.php
//  تسک ۶: Controller فقط درخواست دریافت و پاسخ برمی‌گرداند
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Controllers;

use Ariax\Core\Request;
use Ariax\Core\Response;
use Ariax\Exceptions\AppException;
use Ariax\Exceptions\ValidationException;
use Ariax\Services\AuthService;
use Ariax\Validators\AuthValidator;

class AuthController
{
    public function __construct(private AuthService $authService) {}

    public function login(Request $req): never
    {
        try {
            $data = $req->all();
            AuthValidator::login($data);

            $result = $this->authService->login(
                trim($data['username']),
                $data['password'],
                $req->ip(),
                $req->userAgent()
            );

            Response::success($result);
        } catch (ValidationException $e) {
            Response::error($e->getMessage(), 422, $e->getErrors());
        } catch (AppException $e) {
            Response::error($e->getMessage(), $e->httpCode());
        } catch (\Throwable $e) {
            Response::serverError($e, 'auth.login');
        }
    }

    public function register(Request $req): never
    {
        try {
            $data = $req->all();
            AuthValidator::register($data);

            $result = $this->authService->register($data);

            Response::success($result, 201, 'ثبت‌نام موفق — KYC در انتظار بررسی');
        } catch (ValidationException $e) {
            Response::error($e->getMessage(), 422, $e->getErrors());
        } catch (AppException $e) {
            Response::error($e->getMessage(), $e->httpCode());
        } catch (\Throwable $e) {
            Response::serverError($e, 'auth.register');
        }
    }
}
