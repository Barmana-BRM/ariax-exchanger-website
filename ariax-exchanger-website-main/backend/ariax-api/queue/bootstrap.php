<?php

declare(strict_types=1);

use Ariax\Queue\Handlers\EmailJobHandler;
use Ariax\Queue\Handlers\KycJobHandler;
use Ariax\Queue\Handlers\NotificationJobHandler;
use Ariax\Queue\Handlers\ReportJobHandler;
use Ariax\Queue\Handlers\SmsJobHandler;
use Ariax\Queue\Models\Job;
use Ariax\Queue\Registry\HandlerRegistry;
use Ariax\Queue\Services\FileQueue;
use Ariax\Queue\Services\InMemoryQueue;
use Ariax\Queue\Support\JobTypes;
use Ariax\Queue\Workers\QueueWorker;

require_once __DIR__ . '/Contracts/QueueInterface.php';
require_once __DIR__ . '/Contracts/JobHandlerInterface.php';
require_once __DIR__ . '/Models/Job.php';
require_once __DIR__ . '/Registry/HandlerRegistry.php';
require_once __DIR__ . '/Services/InMemoryQueue.php';
require_once __DIR__ . '/Services/FileQueue.php';
require_once __DIR__ . '/Support/JobTypes.php';
require_once __DIR__ . '/Workers/QueueWorker.php';
require_once __DIR__ . '/Handlers/KycJobHandler.php';
require_once __DIR__ . '/Handlers/EmailJobHandler.php';
require_once __DIR__ . '/Handlers/SmsJobHandler.php';
require_once __DIR__ . '/Handlers/NotificationJobHandler.php';
require_once __DIR__ . '/Handlers/ReportJobHandler.php';

function ariax_queue_storage_root(): string
{
    $path = __DIR__ . DIRECTORY_SEPARATOR . 'storage';

    if (!is_dir($path) && !mkdir($path, 0775, true) && !is_dir($path)) {
        throw new RuntimeException(sprintf('Unable to create queue runtime directory "%s".', $path));
    }

    return $path;
}

function ariax_queue(): object
{
    static $queue = null;

    if ($queue !== null) {
        return $queue;
    }

    $driver = strtolower(trim((string) (getenv('ARIAX_QUEUE_DRIVER') ?: 'file')));

    if ($driver === 'memory') {
        $queue = new InMemoryQueue();

        return $queue;
    }

    $queue = new FileQueue(ariax_queue_storage_root() . DIRECTORY_SEPARATOR . 'queue-state.json');

    return $queue;
}

function ariax_queue_registry(): HandlerRegistry
{
    static $registry = null;

    if ($registry instanceof HandlerRegistry) {
        return $registry;
    }

    $root = ariax_queue_storage_root();
    $registry = new HandlerRegistry();
    $registry->register(JobTypes::KYC, new KycJobHandler($root . DIRECTORY_SEPARATOR . 'kyc'));
    $registry->register(JobTypes::EMAIL, new EmailJobHandler($root . DIRECTORY_SEPARATOR . 'outbox' . DIRECTORY_SEPARATOR . 'email'));
    $registry->register(JobTypes::SMS, new SmsJobHandler($root . DIRECTORY_SEPARATOR . 'outbox' . DIRECTORY_SEPARATOR . 'sms'));
    $registry->register(JobTypes::NOTIFICATION, new NotificationJobHandler($root . DIRECTORY_SEPARATOR . 'notifications'));
    $registry->register(JobTypes::REPORT, new ReportJobHandler($root . DIRECTORY_SEPARATOR . 'reports'));

    return $registry;
}

function ariax_queue_log(string $message, array $context = []): void
{
    $root = ariax_queue_storage_root() . DIRECTORY_SEPARATOR . 'logs';

    if (!is_dir($root) && !mkdir($root, 0775, true) && !is_dir($root)) {
        error_log($message);

        return;
    }

    $entry = json_encode([
        'message' => $message,
        'context' => $context,
        'timestamp' => time(),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($entry === false || file_put_contents($root . DIRECTORY_SEPARATOR . 'queue.log', $entry . PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
        error_log($message);
    }
}

function ariax_queue_worker(?callable $logger = null): QueueWorker
{
    return new QueueWorker(
        ariax_queue(),
        ariax_queue_registry(),
        $logger ?? static function (string $message): void {
            ariax_queue_log($message);
        }
    );
}

/**
 * @param array<string, mixed> $payload
 */
function ariax_enqueue_job(string $type, array $payload): Job
{
    $job = new Job(bin2hex(random_bytes(16)), $type, $payload);
    ariax_queue()->addJob($job);

    return $job;
}
