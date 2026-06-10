<?php

declare(strict_types=1);

namespace Ariax\Tests\Scenarios;

use Ariax\Tests\Core\TestCase;

final class KycScenario extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module' => 'kyc',
            'positive' => [
                'draft step 1 accepts valid identity payload',
                'draft step 2 accepts valid selfie payload',
                'draft step 3 stores final supporting data',
                'admin report returns reviewable queue',
            ],
            'negative' => [
                'invalid national id is rejected',
                'missing selfie for step 2 is rejected',
                'non-admin access to report is rejected',
            ],
        ];
    }
}
