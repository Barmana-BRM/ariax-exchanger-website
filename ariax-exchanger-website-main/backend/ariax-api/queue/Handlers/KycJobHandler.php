<?php

declare(strict_types=1);

namespace Ariax\Queue\Handlers;

use Ariax\Queue\Contracts\JobHandlerInterface;
use Ariax\Queue\Models\Job;
use RuntimeException;

final class KycJobHandler implements JobHandlerInterface
{
    private string $storageDirectory;

    public function __construct(string $storageDirectory)
    {
        $this->storageDirectory = $storageDirectory;
    }

    public function __invoke(Job $job): void
    {
        $payload = $job->getPayload();
        $event = trim((string) ($payload['event'] ?? ''));
        $applicationId = (int) ($payload['applicationId'] ?? 0);
        $userId = trim((string) ($payload['userId'] ?? ''));

        if ($event === '' || $applicationId <= 0 || $userId === '') {
            throw new RuntimeException('KYC job payload is incomplete.');
        }

        $this->ensureDirectory($this->storageDirectory);
        $path = $this->storageDirectory . DIRECTORY_SEPARATOR . sprintf('%s-%d-%s.json', strtolower($event), $applicationId, $job->getId());

        $record = [
            'jobId' => $job->getId(),
            'event' => $event,
            'applicationId' => $applicationId,
            'userId' => $userId,
            'payload' => $payload,
            'processedAt' => date(DATE_ATOM),
        ];

        if (file_put_contents($path, json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) {
            throw new RuntimeException('Unable to persist KYC processing artifact.');
        }
    }

    private function ensureDirectory(string $directory): void
    {
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new RuntimeException(sprintf('Unable to create directory "%s".', $directory));
        }
    }
}
