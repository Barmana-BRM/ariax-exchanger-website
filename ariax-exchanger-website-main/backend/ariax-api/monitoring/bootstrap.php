<?php

declare(strict_types=1);

use Ariax\Monitoring\Logging\ErrorLogger;
use Ariax\Monitoring\Services\AlertManager;
use Ariax\Monitoring\Services\ApiMetricsStatusChecker;
use Ariax\Monitoring\Services\ApiMetricsStore;
use Ariax\Monitoring\Services\DatabaseStatusChecker;
use Ariax\Monitoring\Services\ExternalServiceStatusChecker;
use Ariax\Monitoring\Services\HealthCheckService;
use Ariax\Monitoring\Services\QueueStatusChecker;
use Ariax\Monitoring\Services\SystemStatusChecker;
use Ariax\Queue\Support\JobTypes;

require_once __DIR__ . '/../queue/bootstrap.php';
require_once __DIR__ . '/Contracts/StatusCheckInterface.php';
require_once __DIR__ . '/Logging/ErrorLogger.php';
require_once __DIR__ . '/Services/SystemStatusChecker.php';
require_once __DIR__ . '/Services/QueueStatusChecker.php';
require_once __DIR__ . '/Services/DatabaseStatusChecker.php';
require_once __DIR__ . '/Services/ApiMetricsStore.php';
require_once __DIR__ . '/Services/ApiMetricsStatusChecker.php';
require_once __DIR__ . '/Services/ExternalServiceStatusChecker.php';
require_once __DIR__ . '/Services/AlertManager.php';
require_once __DIR__ . '/Services/HealthCheckService.php';

function ariax_monitoring_storage_root(): string
{
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'storage';
    if (!is_dir($path) && !mkdir($path, 0775, true) && !is_dir($path)) {
        throw new RuntimeException(sprintf('Unable to create monitoring storage "%s".', $path));
    }

    return $path;
}

function ariax_error_logger(): ErrorLogger
{
    static $logger = null;

    if ($logger instanceof ErrorLogger) {
        return $logger;
    }

    $logger = new ErrorLogger('monitoring');

    return $logger;
}

function ariax_api_metrics_store(): ApiMetricsStore
{
    static $store = null;

    if ($store instanceof ApiMetricsStore) {
        return $store;
    }

    $store = new ApiMetricsStore(ariax_monitoring_storage_root() . DIRECTORY_SEPARATOR . 'api-metrics.json');

    return $store;
}

function ariax_monitoring_record_api_metric(string $path, string $method, int $statusCode, float $durationMs): void
{
    ariax_api_metrics_store()->record($path, $method, $statusCode, $durationMs);
}

function ariax_database_probe(): array
{
    try {
        if (!function_exists('getDB')) {
            return [
                'status' => 'degraded',
                'note' => 'Database probe is unavailable before API bootstrap.',
            ];
        }

        $db = getDB();
        $connected = $db->query('SELECT 1 AS ok');
        $migrationCheck = $db->query("SHOW COLUMNS FROM kyc_details LIKE 'draft_token'");

        return [
            'status' => ($connected && $migrationCheck && $migrationCheck->num_rows > 0) ? 'ok' : 'degraded',
            'db' => $connected ? 'connected' : 'unavailable',
            'kycReady' => (bool) ($migrationCheck && $migrationCheck->num_rows > 0),
        ];
    } catch (Throwable $exception) {
        return [
            'status' => 'error',
            'error' => $exception->getMessage(),
        ];
    }
}

function ariax_external_service_probes(): array
{
    return [
        'email' => static function (): array {
            return ['status' => 'ok', 'driver' => 'queue-outbox'];
        },
        'sms' => static function (): array {
            return ['status' => 'ok', 'driver' => 'queue-outbox'];
        },
        'notification' => static function (): array {
            return ['status' => 'ok', 'driver' => 'queue-storage'];
        },
    ];
}

function ariax_alert_manager(): AlertManager
{
    static $manager = null;

    if ($manager instanceof AlertManager) {
        return $manager;
    }

    $manager = new AlertManager(
        ariax_monitoring_storage_root() . DIRECTORY_SEPARATOR . 'alerts.json',
        ariax_error_logger(),
        static function (string $status, array $payload): void {
            $message = sprintf('Health status changed to %s', $status);

            ariax_enqueue_job(JobTypes::NOTIFICATION, [
                'title' => 'System Health Alert',
                'message' => $message,
                'audience' => 'technical-team',
                'meta' => $payload,
            ]);

            ariax_enqueue_job(JobTypes::EMAIL, [
                'to' => 'ops@ariax.local',
                'subject' => 'Ariax health alert',
                'body' => $message,
                'template' => 'health-alert',
            ]);

            ariax_enqueue_job(JobTypes::SMS, [
                'to' => 'technical-team',
                'message' => $message,
                'template' => 'health-alert',
            ]);
        }
    );

    return $manager;
}

function ariax_health_check_service(): HealthCheckService
{
    static $service = null;

    if ($service instanceof HealthCheckService) {
        return $service;
    }

    $checker = new SystemStatusChecker();
    $checker->addCheck(new QueueStatusChecker(ariax_queue()));
    $checker->addCheck(new DatabaseStatusChecker('ariax_database_probe'));
    $checker->addCheck(new ApiMetricsStatusChecker(ariax_api_metrics_store()));
    $checker->addCheck(new ExternalServiceStatusChecker(ariax_external_service_probes()));

    $service = new HealthCheckService($checker, ariax_error_logger(), ariax_alert_manager());

    return $service;
}

function ariax_health_payload(): array
{
    return ariax_health_check_service()->run();
}
