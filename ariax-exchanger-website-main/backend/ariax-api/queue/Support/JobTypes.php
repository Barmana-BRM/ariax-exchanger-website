<?php

declare(strict_types=1);

namespace Ariax\Queue\Support;

final class JobTypes
{
    public const KYC = 'KYC';
    public const EMAIL = 'EMAIL';
    public const SMS = 'SMS';
    public const REPORT = 'REPORT';
    public const NOTIFICATION = 'NOTIFICATION';

    private function __construct()
    {
    }
}
