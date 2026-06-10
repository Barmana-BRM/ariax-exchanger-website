<?php

declare(strict_types=1);

namespace Ariax\Queue\Handlers;

use Ariax\Queue\Contracts\JobHandlerInterface;
use Ariax\Queue\Models\Job;
use RuntimeException;

final class ReportJobHandler implements JobHandlerInterface
{
    private string $storageDirectory;

    public function __construct(string $storageDirectory)
    {
        $this->storageDirectory = $storageDirectory;
    }

    public function __invoke(Job $job): void
    {
        $payload = $job->getPayload();
        $reportName = trim((string) ($payload['reportName'] ?? ''));

        if ($reportName === '') {
            throw new RuntimeException('Report job payload is missing reportName.');
        }

        if (!is_dir($this->storageDirectory) && !mkdir($this->storageDirectory, 0775, true) && !is_dir($this->storageDirectory)) {
            throw new RuntimeException(sprintf('Unable to create directory "%s".', $this->storageDirectory));
        }

        $path = $this->storageDirectory . DIRECTORY_SEPARATOR . sprintf(
            '%s-%s-%s.json',
            preg_replace('/[^a-z0-9\-_.]+/i', '-', strtolower($reportName)) ?: 'report',
            date('Ymd-His'),
            $job->getId()
        );

        $report = [
            'jobId' => $job->getId(),
            'reportName' => $reportName,
            'payload' => $payload,
            'generatedAt' => date(DATE_ATOM),
        ];

        if (file_put_contents($path, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) {
            throw new RuntimeException('Unable to write generated report artifact.');
        }
    }
}
