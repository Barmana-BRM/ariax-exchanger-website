<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json; charset=UTF-8');

echo json_encode(ariax_health_payload(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
