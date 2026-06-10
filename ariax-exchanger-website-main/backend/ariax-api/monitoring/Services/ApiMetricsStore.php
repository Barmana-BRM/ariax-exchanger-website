<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Services;

final class ApiMetricsStore
{
    private string $storagePath;

    public function __construct(string $storagePath)
    {
        $this->storagePath = $storagePath;
    }

    public function record(string $path, string $method, int $statusCode, float $durationMs): void
    {
        $state = $this->readState();
        $state[] = [
            'path' => $path,
            'method' => $method,
            'statusCode' => $statusCode,
            'durationMs' => round($durationMs, 2),
            'timestamp' => time(),
        ];

        $maxEntries = 500;
        if (count($state) > $maxEntries) {
            $state = array_slice($state, -1 * $maxEntries);
        }

        $this->writeState($state);
    }

    public function summary(int $windowSeconds = 900): array
    {
        $entries = array_values(array_filter(
            $this->readState(),
            static fn (array $entry): bool => (int) ($entry['timestamp'] ?? 0) >= time() - $windowSeconds
        ));

        $total = count($entries);
        $errors = 0;
        $durationTotal = 0.0;

        foreach ($entries as $entry) {
            $durationTotal += (float) ($entry['durationMs'] ?? 0);
            if ((int) ($entry['statusCode'] ?? 0) >= 500) {
                $errors++;
            }
        }

        return [
            'windowSeconds' => $windowSeconds,
            'requestCount' => $total,
            'errorCount' => $errors,
            'errorRate' => $total > 0 ? round(($errors / $total) * 100, 2) : 0.0,
            'averageResponseTimeMs' => $total > 0 ? round($durationTotal / $total, 2) : 0.0,
            'lastRequestAt' => $entries ? (int) end($entries)['timestamp'] : null,
        ];
    }

    private function readState(): array
    {
        if (!is_file($this->storagePath)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($this->storagePath), true);

        return is_array($decoded) ? $decoded : [];
    }

    private function writeState(array $state): void
    {
        $directory = dirname($this->storagePath);
        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        file_put_contents(
            $this->storagePath,
            json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            LOCK_EX
        );
    }
}
