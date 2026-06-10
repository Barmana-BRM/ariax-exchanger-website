<?php
// ═══════════════════════════════════════════════════════════════
//  Controllers/MarketController.php
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Controllers;

use Ariax\Core\Database;
use Ariax\Core\Request;
use Ariax\Core\Response;

class MarketController
{
    public function index(Request $req): never
    {
        try {
            $db  = Database::getInstance();
            $res = $db->query("
                SELECT m1.*
                FROM market_prices m1
                INNER JOIN (
                    SELECT symbol, MAX(recorded_at) AS max_time
                    FROM market_prices GROUP BY symbol
                ) m2 ON m1.symbol = m2.symbol AND m1.recorded_at = m2.max_time
            ");
            Response::success(['market' => $res->fetch_all(MYSQLI_ASSOC)]);
        } catch (\Throwable $e) {
            Response::serverError($e, 'market.index');
        }
    }
}
