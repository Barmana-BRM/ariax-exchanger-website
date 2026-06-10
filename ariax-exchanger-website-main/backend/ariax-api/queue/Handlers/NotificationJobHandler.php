<?php

declare(strict_types=1);

namespace Ariax\Queue\Handlers;

use Ariax\Queue\Contracts\JobHandlerInterface;
use Ariax\Queue\Models\Job;
use RuntimeException;

final class NotificationJobHandler implements JobHandlerInterface
{
    private string $storageDirectory;

    public function __construct(string $storageDirectory)
    {
        $this->storageDirectory = $storageDirectory;
    }

    public function __invoke(Job $job): void
    {
        $payload = $job->getPayload();
        $title = trim((string) ($payload['title'] ?? ''));
        $message = trim((string) ($payload['message'] ?? ''));

        if ($title === '' || $message === '') {
            throw new RuntimeException('Notification job payload is invalid.');
        }

        if (!is_dir($this->storageDirectory) && !mkdir($this->storageDirectory, 0775, true) && !is_dir($this->storageDirectory)) {
            throw new RuntimeException(sprintf('Unable to create directory "%s".', $this->storageDirectory));
        }

        $path = $this->storageDirectory . DIRECTORY_SEPARATOR . date('Y-m-d') . '.jsonl';
        $entry = [
            'jobId' => $job->getId(),
            'recipientId' => $payload['recipientId'] ?? null,
            'audience' => $payload['audience'] ?? null,
            'title' => $title,
            'message' => $message,
            'meta' => $payload['meta'] ?? [],
            'createdAt' => date(DATE_ATOM),
        ];
        $encoded = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($encoded === false || file_put_contents($path, $encoded . PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
            throw new RuntimeException('Unable to append notification entry.');
        }
    }
}
