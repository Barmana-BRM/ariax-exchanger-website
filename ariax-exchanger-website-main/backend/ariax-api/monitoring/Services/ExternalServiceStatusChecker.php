<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Services;

use Ariax\Monitoring\Contracts\StatusCheckInterface;
use Throwable;

final class ExternalServiceStatusChecker implements StatusCheckInterface
{
    /**
     * @var array<string, callable>
     */
    private array $probes;

    /**
     * @param array<string, callable> $probes
     */
    public function __construct(array $probes)
    {
        $this->probes = $probes;
    }

    public function check(): array
    {
        $details = [];
        $status = 'ok';

        foreach ($this->probes as $service => $probe) {
            try {
                $result = $probe();
                $serviceStatus = is_array($result) ? (string) ($result['status'] ?? 'ok') : 'ok';
                $details[$service] = is_array($result) ? $result : ['status' => 'ok', 'details' => $result];

                if ($serviceStatus === 'error') {
                    $status = 'error';
                } elseif ($serviceStatus !== 'ok' && $status !== 'error') {
                    $status = 'degraded';
                }
            } catch (Throwable $exception) {
                $details[$service] = [
                    'status' => 'error',
                    'error' => $exception->getMessage(),
                ];
                $status = 'error';
            }
        }

        return [
            'component' => 'external-services',
            'status' => $status,
            'details' => $details,
            'checkedAt' => time(),
        ];
    }
}
