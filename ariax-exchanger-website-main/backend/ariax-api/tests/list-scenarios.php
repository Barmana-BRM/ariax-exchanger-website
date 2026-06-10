<?php

declare(strict_types=1);

use Ariax\Tests\Core\TestRunner;
use Ariax\Tests\Scenarios\AuthenticationScenario;
use Ariax\Tests\Scenarios\FinancialOperationsScenario;
use Ariax\Tests\Scenarios\KycScenario;
use Ariax\Tests\Scenarios\MessagingScenario;
use Ariax\Tests\Scenarios\TaskManagementScenario;
use Ariax\Tests\Scenarios\UserManagementScenario;
use Ariax\Tests\Scenarios\WalletScenario;

require_once __DIR__ . '/Core/TestCase.php';
require_once __DIR__ . '/Core/TestRunner.php';
require_once __DIR__ . '/Scenarios/AuthenticationScenario.php';
require_once __DIR__ . '/Scenarios/KycScenario.php';
require_once __DIR__ . '/Scenarios/WalletScenario.php';
require_once __DIR__ . '/Scenarios/UserManagementScenario.php';
require_once __DIR__ . '/Scenarios/MessagingScenario.php';
require_once __DIR__ . '/Scenarios/TaskManagementScenario.php';
require_once __DIR__ . '/Scenarios/FinancialOperationsScenario.php';

header('Content-Type: application/json; charset=UTF-8');

$runner = new TestRunner();
$runner->add(new AuthenticationScenario('Authentication'));
$runner->add(new KycScenario('KYC Flow'));
$runner->add(new WalletScenario('Wallet Operations'));
$runner->add(new UserManagementScenario('User Management'));
$runner->add(new MessagingScenario('Messaging'));
$runner->add(new TaskManagementScenario('Task Management'));
$runner->add(new FinancialOperationsScenario('Financial Operations'));

echo json_encode($runner->listDefinitions(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
