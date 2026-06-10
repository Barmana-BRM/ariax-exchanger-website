<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Services;

use Ariax\Monitoring\Contracts\StatusCheckInterface;
use Throwable;

final class DatabaseStatusChecker implements StatusCheckInterface
{
    /** @var callable */
    private $probe;

    public function __construct(callable $probe)
    {
        $this->probe = $probe;
    }

    /**
     * @return array<string, mixed>
     */
    public function check(): array
    {
        try {
            $result = ($this->probe)();
            $status = 'ok';
            $details = $result;

            if (is_array($result) && isset($result['status'])) {
                $status = (string) $result['status'];
                unset($details['status']);
            }

            return [
                'component' => 'database',
                'status' => $status,
                'details' => $details,
                'checkedAt' => time(),
            ];
        } catch (Throwable $exception) {
            return [
                'component' => 'database',
                'status' => 'error',
                'error' => $exception->getMessage(),
                'checkedAt' => time(),
            ];
        }
    }
}
