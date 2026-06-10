<?php

declare(strict_types=1);

namespace Ariax\Tests\Scenarios;

use Ariax\Tests\Core\TestCase;

final class FinancialOperationsScenario extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module' => 'financial-operations',
            'positive' => [
                'valid transaction request is accepted',
                'admin can approve pending transaction',
                'admin can reject pending transaction',
            ],
            'negative' => [
                'invalid asset is rejected',
                'negative or zero amount is rejected',
                'non-admin transaction review is rejected',
            ],
        ];
    }
}
