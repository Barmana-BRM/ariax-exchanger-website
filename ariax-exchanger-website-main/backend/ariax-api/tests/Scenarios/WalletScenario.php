<?php

declare(strict_types=1);

namespace Ariax\Tests\Scenarios;

use Ariax\Tests\Core\TestCase;

final class WalletScenario extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module' => 'wallet',
            'positive' => [
                'user wallet balances load successfully',
                'transaction history returns user-owned records',
            ],
            'negative' => [
                'unauthenticated access is rejected',
            ],
        ];
    }
}
