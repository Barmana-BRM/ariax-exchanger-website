<?php

declare(strict_types=1);

namespace Ariax\Queue\Handlers;

use Ariax\Queue\Contracts\JobHandlerInterface;
use Ariax\Queue\Models\Job;
use RuntimeException;

final class EmailJobHandler implements JobHandlerInterface
{
    private string $outboxDirectory;

    public function __construct(string $outboxDirectory)
    {
        $this->outboxDirectory = $outboxDirectory;
    }

    public function __invoke(Job $job): void
    {
        $payload = $job->getPayload();
        $recipient = trim((string) ($payload['to'] ?? ''));
        $subject = trim((string) ($payload['subject'] ?? ''));

        if ($recipient === '' || !filter_var($recipient, FILTER_VALIDATE_EMAIL) || $subject === '') {
            throw new RuntimeException('Email job payload is invalid.');
        }

        $this->appendJsonLine([
            'jobId' => $job->getId(),
            'to' => $recipient,
            'subject' => $subject,
            'body' => (string) ($payload['body'] ?? ''),
            'template' => (string) ($payload['template'] ?? 'default'),
            'queuedAt' => date(DATE_ATOM),
        ]);
    }

    /**
     * @param array<string, mixed> $entry
     */
    private function appendJsonLine(array $entry): void
    {
        if (!is_dir($this->outboxDirectory) && !mkdir($this->outboxDirectory, 0775, true) && !is_dir($this->outboxDirectory)) {
            throw new RuntimeException(sprintf('Unable to create directory "%s".', $this->outboxDirectory));
        }

        $path = $this->outboxDirectory . DIRECTORY_SEPARATOR . date('Y-m-d') . '.jsonl';
        $encoded = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($encoded === false || file_put_contents($path, $encoded . PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
            throw new RuntimeException('Unable to append email outbox entry.');
        }
    }
}
