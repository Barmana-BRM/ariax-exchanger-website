<?php
// ═══════════════════════════════════════════════════════════════
//  api/index.php — بک‌اند PHP برای اتصال React به MySQL
//  مسیر: C:\xampp\htdocs\ariax-api\index.php
// ═══════════════════════════════════════════════════════════════

// ── تنظیمات CORS (اجازه به React روی پورت ۵۱۷۳) ─────────────
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── اتصال به دیتابیس ────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');           // در XAMPP پیش‌فرض خالی است
define('DB_NAME', 'ariax_exchange');

function getDB(): mysqli {
    $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    $db->set_charset('utf8mb4');
    if ($db->connect_error) {
        http_response_code(500);
        die(json_encode(['error' => 'خطای اتصال به دیتابیس: ' . $db->connect_error]));
    }
    return $db;
}

function respond($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function authRequired(): array {
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = str_replace('Bearer ', '', $token);
    if (!$token) respond(['error' => 'توکن لازم است'], 401);

    $db = getDB();
    $stmt = $db->prepare("
        SELECT s.user_id, u.role, u.name, u.username
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > NOW()
    ");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) respond(['error' => 'سشن منقضی شده است'], 401);
    return $row;
}

// ── روتر ساده ────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$path   = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts  = explode('/', $path);
// حذف prefix اگر وجود دارد (ariax-api)
if ($parts[0] === 'ariax-api') array_shift($parts);
$resource = $parts[0] ?? '';
$id       = $parts[1] ?? null;

// ═══════════════════════════════════════════════════════════════
//  /auth/login
// ═══════════════════════════════════════════════════════════════
if ($resource === 'auth' && $id === 'login' && $method === 'POST') {
    $body = getBody();
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (!$username || !$password)
        respond(['error' => 'نام کاربری و رمز عبور الزامی است'], 400);

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user || !password_verify($password, $user['password_hash']))
        respond(['error' => 'نام کاربری یا رمز عبور اشتباه است'], 401);

    // ساخت توکن سشن
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+24 hours'));
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    $stmt2 = $db->prepare("INSERT INTO sessions (token, user_id, ip_address, user_agent, expires_at) VALUES (?,?,?,?,?)");
    $stmt2->bind_param('sssss', $token, $user['id'], $ip, $ua, $expires);
    $stmt2->execute();

    // اطلاعات KYC
    $kycStmt = $db->prepare("SELECT * FROM kyc_details WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1");
    $kycStmt->bind_param('s', $user['id']);
    $kycStmt->execute();
    $kyc = $kycStmt->get_result()->fetch_assoc();

    respond([
        'token' => $token,
        'user'  => [
            'id'          => $user['id'],
            'name'        => $user['name'],
            'username'    => $user['username'],
            'role'        => $user['role'],
            'avatarColor' => $user['avatar_color'],
            'kycStatus'   => $user['kyc_status'],
            'kycDetails'  => $kyc ? [
                'fullName'   => $kyc['full_name'],
                'nationalId' => $kyc['national_id'],
                'phone'      => $kyc['phone'],
                'timestamp'  => $kyc['submitted_at'],
                'rejectionReason' => $kyc['rejection_reason'],
            ] : null,
            'balances' => [
                'IRT'  => (float)$user['balance_irt'],
                'BTC'  => (float)$user['balance_btc'],
                'ETH'  => (float)$user['balance_eth'],
                'USDT' => (float)$user['balance_usdt'],
                'TRX'  => (float)$user['balance_trx'],
            ],
            'cryptoAddresses' => [
                'BTC'  => $user['addr_btc']  ?? '',
                'USDT' => $user['addr_usdt'] ?? '',
                'TRX'  => $user['addr_trx']  ?? '',
            ],
            'cardNo'  => $user['card_no']  ?? '',
            'shibaNo' => $user['shiba_no'] ?? '',
        ],
    ]);
}

// ═══════════════════════════════════════════════════════════════
//  /auth/register
// ═══════════════════════════════════════════════════════════════
if ($resource === 'auth' && $id === 'register' && $method === 'POST') {
    $body = getBody();
    $nationalId = trim($body['nationalId'] ?? '');
    $phone      = trim($body['phone']      ?? '');
    $fullName   = trim($body['fullName']   ?? '');
    $username   = trim($body['username']   ?? '');
    $password   = $body['password']        ?? '';

    if (strlen($nationalId) !== 10) respond(['error' => 'کد ملی باید ۱۰ رقم باشد'], 400);
    if (strlen($password) < 6)       respond(['error' => 'رمز عبور حداقل ۶ کاراکتر'], 400);
    if (!$username)                   respond(['error' => 'نام کاربری الزامی است'], 400);

    $db = getDB();

    // بررسی تکراری بودن username
    $check = $db->prepare("SELECT id FROM users WHERE username = ?");
    $check->bind_param('s', $username);
    $check->execute();
    if ($check->get_result()->num_rows > 0)
        respond(['error' => 'این نام کاربری قبلاً ثبت شده است'], 409);

    $userId = 'u-' . uniqid();
    $hash   = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $db->prepare("
        INSERT INTO users (id, name, username, password_hash, role, avatar_color, kyc_status)
        VALUES (?, ?, ?, ?, 'user', '#8b5cf6', 'pending')
    ");
    $stmt->bind_param('ssss', $userId, $fullName ?: $nationalId, $username, $hash);
    $stmt->execute();

    // ذخیره اطلاعات KYC
    $kycStmt = $db->prepare("INSERT INTO kyc_details (user_id, full_name, national_id, phone) VALUES (?,?,?,?)");
    $kycStmt->bind_param('ssss', $userId, $fullName, $nationalId, $phone);
    $kycStmt->execute();

    respond(['success' => true, 'message' => 'ثبت‌نام موفق — KYC در انتظار بررسی'], 201);
}

// ═══════════════════════════════════════════════════════════════
//  /users  (فقط ادمین)
// ═══════════════════════════════════════════════════════════════
if ($resource === 'users') {
    $auth = authRequired();

    // لیست کاربران
    if ($method === 'GET' && !$id) {
        if ($auth['role'] !== 'admin') respond(['error' => 'دسترسی ندارید'], 403);
        $db = getDB();
        $res = $db->query("SELECT * FROM v_user_summary");
        respond(['users' => $res->fetch_all(MYSQLI_ASSOC)]);
    }

    // آپدیت کاربر (مثلاً KYC)
    if ($method === 'PUT' && $id) {
        if ($auth['role'] !== 'admin') respond(['error' => 'دسترسی ندارید'], 403);
        $body = getBody();
        $db   = getDB();

        if (isset($body['kycStatus'])) {
            $status = $body['kycStatus'];
            $stmt = $db->prepare("UPDATE users SET kyc_status = ? WHERE id = ?");
            $stmt->bind_param('ss', $status, $id);
            $stmt->execute();

            if ($status === 'rejected' && isset($body['rejectionReason'])) {
                $reason   = $body['rejectionReason'];
                $adminId  = $auth['user_id'];
                $upd = $db->prepare("
                    UPDATE kyc_details SET rejection_reason=?, reviewed_at=NOW(), reviewed_by=?
                    WHERE user_id=? ORDER BY submitted_at DESC LIMIT 1
                ");
                $upd->bind_param('sss', $reason, $adminId, $id);
                $upd->execute();
            }
        }
        respond(['success' => true]);
    }
}

// ═══════════════════════════════════════════════════════════════
//  /transactions
// ═══════════════════════════════════════════════════════════════
if ($resource === 'transactions') {
    $auth = authRequired();
    $db   = getDB();

    // لیست (ادمین = همه، کاربر = مال خودش)
    if ($method === 'GET') {
        if ($auth['role'] === 'admin') {
            $res = $db->query("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200");
        } else {
            $stmt = $db->prepare("SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC");
            $stmt->bind_param('s', $auth['user_id']);
            $stmt->execute();
            $res = $stmt->get_result();
        }
        respond(['transactions' => $res->fetch_all(MYSQLI_ASSOC)]);
    }

    // ثبت تراکنش جدید
    if ($method === 'POST') {
        $body   = getBody();
        $txId   = 'tx-' . uniqid();
        $userId = $auth['user_id'];
        $uname  = $auth['name'];
        $type   = $body['type']   ?? '';
        $asset  = $body['asset']  ?? '';
        $amount = (float)($body['amount'] ?? 0);
        $dest   = $body['destination'] ?? '';
        $fee    = round($amount * 0.002, 8);

        if (!in_array($type, ['deposit','withdraw','trade'])) respond(['error' => 'نوع نامعتبر'], 400);
        if (!in_array($asset, ['IRT','BTC','ETH','USDT','TRX'])) respond(['error' => 'دارایی نامعتبر'], 400);
        if ($amount <= 0) respond(['error' => 'مقدار باید بیشتر از صفر باشد'], 400);

        $stmt = $db->prepare("
            INSERT INTO transactions (id, user_id, user_name, type, asset, amount, fee, destination, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->bind_param('sssssdds', $txId, $userId, $uname, $type, $asset, $amount, $fee, $dest);
        $stmt->execute();

        respond(['success' => true, 'transactionId' => $txId, 'fee' => $fee], 201);
    }
}

// ═══════════════════════════════════════════════════════════════
//  /messages
// ═══════════════════════════════════════════════════════════════
if ($resource === 'messages') {
    $auth = authRequired();
    $db   = getDB();

    if ($method === 'GET') {
        $res = $db->query("SELECT * FROM team_messages ORDER BY created_at ASC LIMIT 100");
        respond(['messages' => $res->fetch_all(MYSQLI_ASSOC)]);
    }

    if ($method === 'POST') {
        $body    = getBody();
        $message = trim($body['message'] ?? '');
        if (!$message) respond(['error' => 'پیام خالی است'], 400);

        $senderId   = $auth['user_id'];
        $senderName = $auth['name'];
        $stmt = $db->prepare("INSERT INTO team_messages (sender_id, sender_name, message) VALUES (?,?,?)");
        $stmt->bind_param('sss', $senderId, $senderName, $message);
        $stmt->execute();

        respond(['success' => true, 'id' => $db->insert_id], 201);
    }
}

// ═══════════════════════════════════════════════════════════════
//  /tasks
// ═══════════════════════════════════════════════════════════════
if ($resource === 'tasks') {
    $auth = authRequired();
    $db   = getDB();

    if ($method === 'GET') {
        $res = $db->query("SELECT t.*, u.name as assignee_name FROM team_tasks t JOIN users u ON u.id=t.assigned_to ORDER BY created_at DESC");
        respond(['tasks' => $res->fetch_all(MYSQLI_ASSOC)]);
    }

    if ($method === 'POST') {
        $body     = getBody();
        $title    = trim($body['title']    ?? '');
        $assignTo = $body['assignedTo']    ?? $auth['user_id'];
        $cat      = $body['category']      ?? 'wallet';
        $createdBy = $auth['user_id'];

        if (!$title) respond(['error' => 'عنوان الزامی است'], 400);

        $stmt = $db->prepare("INSERT INTO team_tasks (title, assigned_to, created_by, status, category) VALUES (?,?,?,'todo',?)");
        $stmt->bind_param('ssss', $title, $assignTo, $createdBy, $cat);
        $stmt->execute();

        respond(['success' => true, 'id' => $db->insert_id], 201);
    }

    if ($method === 'PUT' && $id) {
        $body   = getBody();
        $status = $body['status'] ?? '';
        if (!in_array($status, ['todo','in_progress','done'])) respond(['error' => 'وضعیت نامعتبر'], 400);

        $stmt = $db->prepare("UPDATE team_tasks SET status=? WHERE id=?");
        $stmt->bind_param('si', $status, $id);
        $stmt->execute();
        respond(['success' => true]);
    }
}

// ═══════════════════════════════════════════════════════════════
//  /market  — آخرین قیمت‌ها
// ═══════════════════════════════════════════════════════════════
if ($resource === 'market' && $method === 'GET') {
    $db = getDB();
    $res = $db->query("
        SELECT m1.*
        FROM market_prices m1
        INNER JOIN (
            SELECT symbol, MAX(recorded_at) AS max_time
            FROM market_prices
            GROUP BY symbol
        ) m2 ON m1.symbol = m2.symbol AND m1.recorded_at = m2.max_time
    ");
    respond(['market' => $res->fetch_all(MYSQLI_ASSOC)]);
}

// ═══════════════════════════════════════════════════════════════
//  /stats  — آمار داشبورد ادمین
// ═══════════════════════════════════════════════════════════════
if ($resource === 'stats' && $method === 'GET') {
    $auth = authRequired();
    if ($auth['role'] !== 'admin') respond(['error' => 'دسترسی ندارید'], 403);

    $db  = getDB();
    $res = $db->query("SELECT * FROM v_system_stats");
    respond(['stats' => $res->fetch_assoc()]);
}

// ─── مسیر پیدا نشد ────────────────────────────────────────────
respond(['error' => 'مسیر پیدا نشد: ' . $resource], 404);
