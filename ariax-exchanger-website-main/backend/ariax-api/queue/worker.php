<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo json_encode(['error' => 'Queue worker is CLI-only.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit(1);
}

$pollInterval = 500000;
$maxIterations = null;
$once = false;

foreach (array_slice($argv ?? [], 1) as $argument) {
    if ($argument === '--once') {
        $once = true;
        continue;
    }

    if (strpos($argument, '--poll=') === 0) {
        $pollInterval = max(0, (int) substr($argument, 7));
        continue;
    }

    if (strpos($argument, '--max-iterations=') === 0) {
        $maxIterations = max(1, (int) substr($argument, 17));
    }
}

$worker = ariax_queue_worker();

if ($once) {
    $job = $worker->processNextJob();
    echo json_encode([
        'processed' => $job !== null,
        'jobId' => $job?->getId(),
        'status' => $job?->getStatus(),
        'queue' => ariax_queue()->getStats(),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit(0);
}

ariax_queue_log('Queue worker started.', [
    'pollInterval' => $pollInterval,
    'maxIterations' => $maxIterations,
]);

$worker->run($pollInterval, $maxIterations);
