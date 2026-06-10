<?php
// ═══════════════════════════════════════════════════════════════
//  api/index.php — بک‌اند PHP برای اتصال React به MySQL
//  مسیر: C:\xampp\htdocs\ariax-api\index.php
// ═══════════════════════════════════════════════════════════════

// ── تنظیمات CORS (اجازه به React روی پورت ۵۱۷۳) ─────────────
$allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── اتصال به دیتابیس ────────────────────────────────────────
define('DB_HOST', '127.0.0.1');
define('DB_USER', 'root');
define('DB_PASS', '');           // در XAMPP پیش‌فرض خالی است
define('DB_NAME', 'ariax_exchange');
define('ACCESS_TOKEN_COOKIE', 'ariax_access_token');
define('REFRESH_TOKEN_COOKIE', 'ariax_refresh_token');
define('ACCESS_TOKEN_TTL', 86400);
define('REFRESH_TOKEN_TTL', 2592000);

require_once __DIR__ . '/lib/rbac.php';

function getDB(): mysqli {
    $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($db->connect_error) {
        http_response_code(500);
        die(json_encode(['error' => 'خطای اتصال به دیتابیس: ' . $db->connect_error]));
    }
    $db->set_charset('utf8mb4');
    $db->query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $db->query("SET collation_connection = 'utf8mb4_unicode_ci'");
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

function textLength(?string $value): int {
    $value = (string)($value ?? '');
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function isValidTransactionId(?string $value): bool {
    return is_string($value) && preg_match('/^tx-[A-Za-z0-9]+$/', $value) === 1;
}

function isHttpsRequest(): bool {
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
    if (($_SERVER['SERVER_PORT'] ?? '') === '443') return true;
    return strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function authCookieOptions(int $expiresAt): array {
    return [
        'expires' => $expiresAt,
        'path' => '/ariax-api',
        'secure' => isHttpsRequest(),
        'httponly' => true,
        'samesite' => 'Strict',
    ];
}

function setAuthCookie(string $name, string $value, int $expiresAt): void {
    setcookie($name, $value, authCookieOptions($expiresAt));
    $_COOKIE[$name] = $value;
}

function clearAuthCookie(string $name): void {
    setcookie($name, '', authCookieOptions(time() - 3600));
    unset($_COOKIE[$name]);
}

function accessTokenFromRequest(): string {
    $cookieToken = trim($_COOKIE[ACCESS_TOKEN_COOKIE] ?? '');
    if ($cookieToken !== '') return $cookieToken;

    $headerToken = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$headerToken && function_exists('getallheaders')) {
        $headers = getallheaders();
        $headerToken = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    $headerToken = str_replace('Bearer ', '', $headerToken);
    return trim((string)$headerToken);
}

function refreshTokenFromRequest(): string {
    return trim($_COOKIE[REFRESH_TOKEN_COOKIE] ?? '');
}

function generateAuthToken(): string {
    return bin2hex(random_bytes(32));
}

function ensureRefreshTokensSchema(mysqli $db): void {
    static $ready = false;
    if ($ready) return;
    $db->query("
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            token_hash CHAR(64) PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            revoked_at DATETIME DEFAULT NULL,
            INDEX idx_refresh_tokens_user (user_id),
            CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $ready = true;
}

function hashRefreshToken(string $token): string {
    return hash('sha256', $token);
}

function issueAccessSession(mysqli $db, string $userId): array {
    $token = generateAuthToken();
    $expiresAt = time() + ACCESS_TOKEN_TTL;
    $expires = date('Y-m-d H:i:s', $expiresAt);
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    $stmt = $db->prepare("INSERT INTO sessions (token, user_id, ip_address, user_agent, expires_at) VALUES (?,?,?,?,?)");
    $stmt->bind_param('sssss', $token, $userId, $ip, $ua, $expires);
    dbExecute($stmt);

    return ['token' => $token, 'expiresAt' => $expiresAt];
}

function revokeAccessSession(mysqli $db, ?string $token): void {
    $token = trim((string)($token ?? ''));
    if ($token === '') return;
    $stmt = $db->prepare("DELETE FROM sessions WHERE token = ?");
    $stmt->bind_param('s', $token);
    $stmt->execute();
}

function issueRefreshToken(mysqli $db, string $userId): array {
    ensureRefreshTokensSchema($db);
    $token = generateAuthToken();
    $hash = hashRefreshToken($token);
    $expiresAt = time() + REFRESH_TOKEN_TTL;
    $expires = date('Y-m-d H:i:s', $expiresAt);

    $stmt = $db->prepare("INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES (?,?,?)");
    $stmt->bind_param('sss', $hash, $userId, $expires);
    dbExecute($stmt);

    return ['token' => $token, 'expiresAt' => $expiresAt];
}

function revokeRefreshToken(mysqli $db, ?string $token): void {
    $token = trim((string)($token ?? ''));
    if ($token === '') return;
    ensureRefreshTokensSchema($db);
    $hash = hashRefreshToken($token);
    $stmt = $db->prepare("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL");
    $stmt->bind_param('s', $hash);
    $stmt->execute();
}

function findRefreshTokenOwner(mysqli $db, string $token): ?array {
    $token = trim($token);
    if ($token === '') return null;
    ensureRefreshTokensSchema($db);
    $hash = hashRefreshToken($token);
    $stmt = $db->prepare("
        SELECT r.user_id, u.role, u.name, u.username
        FROM refresh_tokens r
        JOIN users u ON u.id = r.user_id
        WHERE r.token_hash = ? AND r.revoked_at IS NULL AND r.expires_at > NOW() AND u.is_active = 1
        LIMIT 1
    ");
    $stmt->bind_param('s', $hash);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if ($row) {
        $row['role'] = ariaxCanonicalRole($row['role'] ?? 'user');
    }
    return $row ?: null;
}

function clientIpAddress(): string {
    return trim((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
}

function clientUserAgent(): string {
    return substr(trim((string)($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 255);
}

function allowedRequestOrigins(): array {
    $origins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
    ];
    $envOrigin = trim((string)(getenv('APP_ORIGIN') ?: ''));
    if ($envOrigin !== '') {
        $origins[] = rtrim($envOrigin, '/');
    }
    return array_values(array_unique($origins));
}

function assertAllowedOrigin(): void {
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') return;
    if (in_array(rtrim($origin, '/'), allowedRequestOrigins(), true)) return;
    respond(['error' => 'درخواست از منبع نامعتبر ارسال شده است'], 403);
}

function ensureAuditLogsSchema(mysqli $db): void {
    static $ready = false;
    if ($ready) return;
    $db->query("
        CREATE TABLE IF NOT EXISTS audit_logs (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            event VARCHAR(120) NOT NULL,
            actor_id VARCHAR(50) NULL,
            actor_role VARCHAR(40) NULL,
            target_id VARCHAR(80) NULL,
            target_type VARCHAR(40) NULL,
            meta JSON NULL,
            ip_address VARCHAR(64) NOT NULL,
            user_agent VARCHAR(255) NOT NULL DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_audit_event (event),
            INDEX idx_audit_actor (actor_id),
            INDEX idx_audit_target (target_id, target_type),
            INDEX idx_audit_created (created_at),
            INDEX idx_audit_ip (ip_address)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $ready = true;
}

function ensureRateLimitSchema(mysqli $db): void {
    static $ready = false;
    if ($ready) return;
    $db->query("
        CREATE TABLE IF NOT EXISTS api_rate_limits (
            bucket VARCHAR(128) PRIMARY KEY,
            action VARCHAR(80) NOT NULL,
            ip_address VARCHAR(64) NOT NULL,
            attempts INT NOT NULL DEFAULT 0,
            window_started_at DATETIME NOT NULL,
            blocked_until DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_rate_limits_action_ip (action, ip_address),
            INDEX idx_rate_limits_blocked_until (blocked_until)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $ready = true;
}

function enforceRateLimit(mysqli $db, string $action, int $limit, int $windowSeconds, int $blockSeconds = 0): void {
    ensureRateLimitSchema($db);
    $ip = clientIpAddress();
    $bucket = hash('sha256', $action . '|' . $ip);
    $now = time();

    $stmt = $db->prepare("SELECT attempts, window_started_at, blocked_until FROM api_rate_limits WHERE bucket = ? LIMIT 1");
    $stmt->bind_param('s', $bucket);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if ($row && !empty($row['blocked_until']) && strtotime((string)$row['blocked_until']) > $now) {
        respond(['error' => 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.'], 429);
    }

    $windowStart = $row ? strtotime((string)$row['window_started_at']) : 0;
    $expired = !$row || $windowStart <= 0 || ($now - $windowStart) >= $windowSeconds;
    $attempts = $expired ? 1 : ((int)$row['attempts'] + 1);
    $windowStamp = date('Y-m-d H:i:s', $expired ? $now : $windowStart);
    $blockedUntil = null;

    if ($attempts > $limit) {
        $blockSeconds = $blockSeconds > 0 ? $blockSeconds : $windowSeconds;
        $blockedUntil = date('Y-m-d H:i:s', $now + $blockSeconds);
        $attempts = $limit;
    }

    if ($row) {
        $upd = $db->prepare("UPDATE api_rate_limits SET attempts = ?, window_started_at = ?, blocked_until = ? WHERE bucket = ?");
        $upd->bind_param('isss', $attempts, $windowStamp, $blockedUntil, $bucket);
        dbExecute($upd);
    } else {
        $ins = $db->prepare("INSERT INTO api_rate_limits (bucket, action, ip_address, attempts, window_started_at, blocked_until) VALUES (?, ?, ?, ?, ?, ?)");
        $ins->bind_param('sssiss', $bucket, $action, $ip, $attempts, $windowStamp, $blockedUntil);
        dbExecute($ins);
    }

    if ($attempts >= $limit && $blockedUntil !== null) {
        respond(['error' => 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.'], 429);
    }
}

function logAuditEvent(mysqli $db, string $event, ?array $auth = null, array $meta = [], ?string $targetId = null, ?string $targetType = null): void {
    ensureAuditLogsSchema($db);
    $actorId = $auth['user_id'] ?? null;
    $actorRole = isset($auth['role']) ? ariaxCanonicalRole((string)$auth['role']) : null;
    $payload = json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($payload === false) {
        $payload = '{}';
    }

    $ip = clientIpAddress();
    $ua = clientUserAgent();
    $stmt = $db->prepare("
        INSERT INTO audit_logs (event, actor_id, actor_role, target_id, target_type, meta, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param('ssssssss', $event, $actorId, $actorRole, $targetId, $targetType, $payload, $ip, $ua);
    $stmt->execute();
}

function buildAuthenticatedUser(mysqli $db, array $user): array {
    $kycStmt = $db->prepare("
        SELECT user_id, full_name, national_id, phone, email, submitted_at, rejection_reason,
               national_id_image, selfie_image, supporting_document, home_address,
               draft_token, current_step, step1_status, step2_status, step3_status,
               overall_status, face_match_score
        FROM kyc_details
        WHERE user_id = ?
        ORDER BY submitted_at DESC
        LIMIT 1
    ");
    $kycStmt->bind_param('s', $user['id']);
    $kycStmt->execute();
    $kyc = $kycStmt->get_result()->fetch_assoc();

    return [
        'id'          => $user['id'],
        'name'        => $user['name'],
        'username'    => $user['username'],
        'role'        => ariaxCanonicalRole($user['role'] ?? 'user'),
        'avatarColor' => $user['avatar_color'],
        'kycStatus'   => $user['kyc_status'],
        'kycDetails'  => buildKycDetailsResponse($kyc),
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
        'permissions' => array_values(array_filter([
            ariaxCan(['role' => $user['role']], 'profile.view_own') ? 'profile.view_own' : null,
            ariaxCan(['role' => $user['role']], 'kyc.view_own') ? 'kyc.view_own' : null,
            ariaxCan(['role' => $user['role']], 'tickets.view_own') ? 'tickets.view_own' : null,
            ariaxCan(['role' => $user['role']], 'transactions.view_own') ? 'transactions.view_own' : null,
        ])),
    ];
}

function dbExecute(mysqli_stmt $stmt): void {
    if ($stmt->execute()) return;
    $err = $stmt->error ?: 'خطای ناشناخته دیتابیس';
    if (stripos($err, 'Unknown column') !== false || stripos($err, 'draft_token') !== false) {
        respond(['error' => 'ساختار دیتابیس KYC به‌روز نیست. فایل ariax_migrations_v4.sql را در phpMyAdmin اجرا کنید.'], 500);
    }
    respond(['error' => 'خطای دیتابیس: ' . $err], 500);
}

function buildKycDetailsResponse(?array $kyc): ?array {
    if (!$kyc) return null;
    return [
        'fullName'          => $kyc['full_name'],
        'nationalId'        => $kyc['national_id'],
        'phone'             => $kyc['phone'],
        'email'             => $kyc['email'] ?? null,
        'timestamp'         => $kyc['submitted_at'],
        'rejectionReason'   => $kyc['rejection_reason'] ?? null,
        'nationalIdImage'   => decryptStoredImage($kyc['national_id_image'] ?? null),
        'selfieImage'       => decryptStoredImage($kyc['selfie_image'] ?? null),
        'supportingDocument'=> decryptStoredImage($kyc['supporting_document'] ?? null),
        'draftToken'        => $kyc['draft_token'] ?? null,
        'currentStep'       => isset($kyc['current_step']) ? (int)$kyc['current_step'] : 1,
        'step1Status'       => $kyc['step1_status'] ?? 'pending',
        'step2Status'       => $kyc['step2_status'] ?? 'pending',
        'step3Status'       => $kyc['step3_status'] ?? 'pending',
        'overallStatus'     => $kyc['overall_status'] ?? 'draft',
        'faceMatchScore'    => isset($kyc['face_match_score']) ? (float)$kyc['face_match_score'] : null,
        'homeAddress'       => $kyc['home_address'] ?? null,
    ];
}

function buildKycDraftResponse(?array $kyc): ?array {
    if (!$kyc) return null;
    return [
        'draftToken' => $kyc['draft_token'] ?? '',
        'currentStep' => isset($kyc['current_step']) ? (int)$kyc['current_step'] : 1,
        'overallStatus' => $kyc['overall_status'] ?? 'draft',
        'step1Status' => $kyc['step1_status'] ?? 'pending',
        'step2Status' => $kyc['step2_status'] ?? 'pending',
        'step3Status' => $kyc['step3_status'] ?? 'pending',
        'faceMatchScore' => isset($kyc['face_match_score']) ? (float)$kyc['face_match_score'] : null,
        'kycDetails' => buildKycDetailsResponse($kyc),
    ];
}

function kycEncryptionKey(): string {
    $secret = getenv('KYC_ENCRYPTION_KEY') ?: getenv('APP_SECRET') ?: 'ariax-dev-kyc-secret';
    return hash('sha256', $secret, true);
}

function sealText(string $plain): string {
    $iv = random_bytes(12);
    $tag = '';
    $cipher = openssl_encrypt($plain, 'aes-256-gcm', kycEncryptionKey(), OPENSSL_RAW_DATA, $iv, $tag);
    if ($cipher === false) {
        respond(['error' => 'خطا در رمزگذاری داده'], 500);
    }
    return base64_encode(json_encode([
        'iv' => base64_encode($iv),
        'tag' => base64_encode($tag),
        'cipher' => base64_encode($cipher),
    ], JSON_UNESCAPED_SLASHES));
}

function openText(?string $sealed): ?string {
    if (!$sealed) return null;
    $decoded = json_decode(base64_decode($sealed), true);
    if (!is_array($decoded)) return null;
    $iv = base64_decode($decoded['iv'] ?? '', true);
    $tag = base64_decode($decoded['tag'] ?? '', true);
    $cipher = base64_decode($decoded['cipher'] ?? '', true);
    if ($iv === false || $tag === false || $cipher === false) return null;
    $plain = openssl_decrypt($cipher, 'aes-256-gcm', kycEncryptionKey(), OPENSSL_RAW_DATA, $iv, $tag);
    return $plain === false ? null : $plain;
}

function encryptPayload(array $payload): string {
    return sealText(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

function decryptPayload(?string $sealed): ?array {
    $plain = openText($sealed);
    if (!$plain) return null;
    return json_decode($plain, true) ?? null;
}

function projectKycStorageRoot(): string {
    return dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'secure-storage';
}

function legacyKycStorageRoot(): string {
    return dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'secure-storage';
}

function kycStorageRoot(): string {
    static $root = null;
    if ($root !== null) return $root;

    $configured = trim((string)(getenv('KYC_STORAGE_DIR') ?: ''));
    if ($configured !== '') {
        $root = rtrim($configured, "\\/");
        return $root;
    }

    $projectRoot = projectKycStorageRoot();
    $legacyRoot = legacyKycStorageRoot();
    $root = is_dir($projectRoot) || !is_dir($legacyRoot)
        ? $projectRoot
        : $legacyRoot;

    return $root;
}

function normalizeKycStorageSubpath(string $path): string {
    $normalized = str_replace('\\', '/', trim($path, "\\/ \t\n\r\0\x0B"));
    $segments = array_values(array_filter(explode('/', $normalized), 'strlen'));
    if (!$segments) {
        respond(['error' => 'مسیر ذخیره‌سازی KYC نامعتبر است'], 500);
    }
    foreach ($segments as $segment) {
        if ($segment === '.' || $segment === '..') {
            respond(['error' => 'مسیر ذخیره‌سازی KYC نامعتبر است'], 500);
        }
    }
    return implode(DIRECTORY_SEPARATOR, $segments);
}

function ensureKycStorageDirectory(string $subdir): string {
    $dir = kycStorageRoot() . DIRECTORY_SEPARATOR . normalizeKycStorageSubpath($subdir);
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        respond(['error' => 'خطا در آماده‌سازی فضای امن KYC'], 500);
    }
    return $dir;
}

function resolveStoredUploadPath(?string $relativePath): ?string {
    if (!$relativePath) return null;

    $normalized = str_replace('\\', '/', ltrim($relativePath, '/'));
    if (strpos($normalized, 'uploads/') !== 0) return null;

    $subpath = normalizeKycStorageSubpath(substr($normalized, strlen('uploads/')));
    $primary = kycStorageRoot() . DIRECTORY_SEPARATOR . $subpath;
    if (is_file($primary)) return $primary;

    $legacy = legacyKycStorageRoot() . DIRECTORY_SEPARATOR . $subpath;
    if ($legacy !== $primary && is_file($legacy)) return $legacy;

    return $primary;
}

function saveUploadedImage(string $field, string $subdir, array $allowedMime = ['image/jpeg', 'image/png'], int $maxBytes = 5242880): ?string {
    if (!isset($_FILES[$field]) || $_FILES[$field]['error'] === UPLOAD_ERR_NO_FILE) return null;
    if ($_FILES[$field]['error'] !== UPLOAD_ERR_OK) {
        respond(['error' => 'خطا در آپلود تصویر'], 400);
    }
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $_FILES[$field]['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mime, $allowedMime, true)) {
        respond(['error' => 'فرمت فایل نامعتبر است'], 400);
    }
    if ($_FILES[$field]['size'] > $maxBytes) {
        respond(['error' => 'حجم فایل بیش از حد مجاز است'], 400);
    }
    $dir = ensureKycStorageDirectory($subdir);
    $extMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'application/pdf' => 'pdf'];
    $ext = $extMap[$mime] ?? 'jpg';
    $name = uniqid('kyc_', true) . '.' . $ext . '.enc';
    $dest = $dir . DIRECTORY_SEPARATOR . $name;
    $contents = file_get_contents($_FILES[$field]['tmp_name']);
    $sealed = encryptPayload([
        'mime' => $mime,
        'originalName' => $_FILES[$field]['name'],
        'content' => base64_encode($contents),
    ]);
    if (file_put_contents($dest, $sealed) === false) {
        respond(['error' => 'خطا در ذخیره تصویر'], 500);
    }
    @chmod($dest, 0600);
    return 'uploads/' . $subdir . '/' . $name;
}

function decryptStoredImage(?string $relativePath): ?string {
    if (!$relativePath) return null;
    $path = resolveStoredUploadPath($relativePath);
    if (!$path) return null;
    if (!is_file($path)) return null;
    $sealed = file_get_contents($path);
    $payload = decryptPayload($sealed);
    if (!$payload || empty($payload['content'])) return null;
    $mime = $payload['mime'] ?? 'application/octet-stream';
    $binary = base64_decode($payload['content'], true);
    if ($binary === false) return null;
    return 'data:' . $mime . ';base64,' . base64_encode($binary);
}

function txRequiresExtended(string $asset, float $amount): bool {
    $limits = [
        'IRT'  => 10000000,
        'BTC'  => 0.01,
        'ETH'  => 0.5,
        'USDT' => 1000,
        'TRX'  => 50000,
    ];
    return isset($limits[$asset]) && $amount >= $limits[$asset];
}

function ensureTicketsSchema(mysqli $db): void {
    static $ready = false;
    if ($ready) return;
    $db->query("
        CREATE TABLE IF NOT EXISTS tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(50) NOT NULL,
            user_name VARCHAR(100) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            category ENUM('wallet', 'support', 'technical', 'kyc', 'other') NOT NULL DEFAULT 'support',
            status ENUM('open', 'in_progress', 'closed') NOT NULL DEFAULT 'open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_tickets_user (user_id),
            INDEX idx_tickets_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $db->query("
        CREATE TABLE IF NOT EXISTS ticket_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_id INT NOT NULL,
            sender_id VARCHAR(50) NOT NULL,
            sender_name VARCHAR(100) NOT NULL,
            sender_role ENUM('user', 'admin') NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ticket_messages_ticket (ticket_id),
            CONSTRAINT fk_ticket_messages_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $ready = true;
}

function authRequired(): array {
    $token = accessTokenFromRequest();
    if (!$token) respond(['error' => 'توکن لازم است'], 401);

    $db = getDB();
    enforceRateLimit($db, 'auth.register', 10, 3600, 3600);
    $stmt = $db->prepare("
        SELECT s.user_id, u.role, u.name, u.username
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = 1
    ");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) respond(['error' => 'سشن منقضی شده است'], 401);
    $row['role'] = ariaxCanonicalRole($row['role'] ?? 'user');
    return $row;
}

function optionalAuth(mysqli $db): ?array {
    $token = accessTokenFromRequest();
    if ($token === '') return null;

    $stmt = $db->prepare("
        SELECT s.user_id, u.role, u.name, u.username
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = 1
        LIMIT 1
    ");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) return null;
    $row['role'] = ariaxCanonicalRole($row['role'] ?? 'user');
    return $row;
}

// ── روتر ساده ────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$path   = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts  = explode('/', $path);
// حذف prefix اگر وجود دارد (ariax-api)
if ($parts[0] === 'ariax-api') array_shift($parts);
if (($parts[0] ?? '') === 'index.php') array_shift($parts);
$resource = $parts[0] ?? '';
$id       = $parts[1] ?? null;
$sub      = $parts[2] ?? null;

if (in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
    assertAllowedOrigin();
}

// ═══════════════════════════════════════════════════════════════
//  /health
// ═══════════════════════════════════════════════════════════════
if ($resource === 'health' && $method === 'GET') {
    $db = getDB();
    $kycReady = true;
    $check = $db->query("SHOW COLUMNS FROM kyc_details LIKE 'draft_token'");
    if (!$check || $check->num_rows === 0) {
        $kycReady = false;
    }
    respond([
        'ok' => true,
        'db' => 'connected',
        'kycReady' => $kycReady,
        'hint' => $kycReady ? null : 'مایگریشن KYC اجرا نشده — فایل ariax_migrations_v4.sql را در phpMyAdmin اجرا کنید',
    ]);
}

// ═══════════════════════════════════════════════════════════════
//  /auth/login
// ═══════════════════════════════════════════════════════════════
if ($resource === 'auth' && $id === 'login' && $method === 'POST') {
    $db = getDB();
    enforceRateLimit($db, 'auth.login', 5, 900, 1800);
    $body = getBody();
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (!$username || !$password)
        respond(['error' => 'نام کاربری و رمز عبور الزامی است'], 400);

    $stmt = $db->prepare("
        SELECT id, name, username, password_hash, role, avatar_color, balance_irt, balance_btc, balance_eth,
               balance_usdt, balance_trx, addr_btc, addr_usdt, addr_trx, card_no, shiba_no, kyc_status, is_active
        FROM users
        WHERE username = ? AND is_active = 1
        LIMIT 1
    ");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user || !password_verify($password, $user['password_hash']))
        {
            logAuditEvent($db, 'auth.login_failed', ['ip' => clientIpAddress()], ['username' => $username]);
            respond(['error' => 'نام کاربری یا رمز عبور اشتباه است'], 401);
        }

    revokeAccessSession($db, accessTokenFromRequest());
    revokeRefreshToken($db, refreshTokenFromRequest());
    $access = issueAccessSession($db, $user['id']);
    $refresh = issueRefreshToken($db, $user['id']);
    setAuthCookie(ACCESS_TOKEN_COOKIE, $access['token'], $access['expiresAt']);
    setAuthCookie(REFRESH_TOKEN_COOKIE, $refresh['token'], $refresh['expiresAt']);
    logAuditEvent($db, 'auth.login', ['user_id' => $user['id'], 'role' => $user['role']], ['username' => $username]);

    respond([
        'user'  => buildAuthenticatedUser($db, $user),
    ]);
}

if ($resource === 'auth' && $id === 'refresh' && $method === 'POST') {
    $db = getDB();
    enforceRateLimit($db, 'auth.refresh', 30, 300);
    $refreshToken = refreshTokenFromRequest();
    if ($refreshToken === '') {
        clearAuthCookie(ACCESS_TOKEN_COOKIE);
        clearAuthCookie(REFRESH_TOKEN_COOKIE);
        respond(['error' => 'رفرش توکن لازم است'], 401);
    }

    $owner = findRefreshTokenOwner($db, $refreshToken);
    if (!$owner) {
        revokeRefreshToken($db, $refreshToken);
        clearAuthCookie(ACCESS_TOKEN_COOKIE);
        clearAuthCookie(REFRESH_TOKEN_COOKIE);
        respond(['error' => 'رفرش توکن نامعتبر یا منقضی شده است'], 401);
    }

    revokeAccessSession($db, accessTokenFromRequest());
    revokeRefreshToken($db, $refreshToken);
    $access = issueAccessSession($db, $owner['user_id']);
    $nextRefresh = issueRefreshToken($db, $owner['user_id']);
    setAuthCookie(ACCESS_TOKEN_COOKIE, $access['token'], $access['expiresAt']);
    setAuthCookie(REFRESH_TOKEN_COOKIE, $nextRefresh['token'], $nextRefresh['expiresAt']);
    logAuditEvent($db, 'auth.refresh', $owner);

    respond(['success' => true]);
}

if ($resource === 'auth' && $id === 'logout' && $method === 'POST') {
    $db = getDB();
    enforceRateLimit($db, 'auth.logout', 20, 300);
    $auth = optionalAuth($db);
    revokeAccessSession($db, accessTokenFromRequest());
    revokeRefreshToken($db, refreshTokenFromRequest());
    clearAuthCookie(ACCESS_TOKEN_COOKIE);
    clearAuthCookie(REFRESH_TOKEN_COOKIE);
    if ($auth) {
        logAuditEvent($db, 'auth.logout', $auth);
    }
    respond(['success' => true]);
}

// ═══════════════════════════════════════════════════════════════
//  /auth/register
// ═══════════════════════════════════════════════════════════════
if ($resource === 'auth' && $id === 'register' && $method === 'POST') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    $isMultipart = !empty($_FILES) || stripos($contentType, 'multipart/form-data') !== false;
    $draftToken = '';

    if ($isMultipart) {
        $nationalId = trim($_POST['nationalId'] ?? '');
        $phone      = trim($_POST['phone']      ?? '');
        $firstName  = trim($_POST['firstName']  ?? '');
        $lastName   = trim($_POST['lastName']   ?? '');
        $email      = trim($_POST['email']      ?? '');
        $fullName   = trim($_POST['fullName']   ?? '');
        $username   = trim($_POST['username']   ?? '');
        $password   = $_POST['password']        ?? '';
        $draftToken = trim($_POST['draftToken'] ?? '');
        $homeAddress = trim($_POST['homeAddress'] ?? '');
        $faceMatchScore = isset($_POST['faceMatchScore']) ? (float)$_POST['faceMatchScore'] : null;
    } else {
        $body = getBody();
        $nationalId = trim($body['nationalId'] ?? '');
        $phone      = trim($body['phone']      ?? '');
        $firstName  = trim($body['firstName']  ?? '');
        $lastName   = trim($body['lastName']   ?? '');
        $email      = trim($body['email']      ?? '');
        $fullName   = trim($body['fullName']   ?? '');
        $username   = trim($body['username']   ?? '');
        $password   = $body['password']        ?? '';
        $draftToken = trim($body['draftToken'] ?? '');
        $homeAddress = trim($body['homeAddress'] ?? '');
        $faceMatchScore = isset($body['faceMatchScore']) ? (float)$body['faceMatchScore'] : null;
    }

    if (!preg_match('/^[A-Za-z0-9_.-]{4,50}$/', $username)) respond(['error' => 'نام کاربری باید ۴ تا ۵۰ کاراکتر لاتین، عدد یا . _ - باشد'], 400);
    if (strlen($password) < 6) respond(['error' => 'رمز عبور حداقل ۶ کاراکتر'], 400);

    $db = getDB();

    $draftRow = null;
    if ($draftToken !== '') {
        $draftStmt = $db->prepare("
            SELECT user_id, full_name, national_id, phone, email, submitted_at, rejection_reason,
                   national_id_image, selfie_image, supporting_document, home_address, draft_token,
                   current_step, step1_status, step2_status, step3_status, overall_status, face_match_score
            FROM kyc_details
            WHERE draft_token = ?
            LIMIT 1
        ");
        $draftStmt->bind_param('s', $draftToken);
        $draftStmt->execute();
        $draftRow = $draftStmt->get_result()->fetch_assoc();
        if (!$draftRow) respond(['error' => 'پیش‌نویس KYC پیدا نشد'], 404);
    }

    if ($draftRow) {
        $fullName = $draftRow['full_name'];
        $nationalId = $draftRow['national_id'];
        $phone = $draftRow['phone'];
        $email = $draftRow['email'] ?? '';
        $nationalIdImage = $draftRow['national_id_image'] ?? null;
        $selfieImage = $draftRow['selfie_image'] ?? null;
        $supportingDocument = $draftRow['supporting_document'] ?? null;
        $homeAddress = $draftRow['home_address'] ?? '';
        $faceMatchScore = $draftRow['face_match_score'] ?? $faceMatchScore;
    } else {
        if ($firstName !== '' || $lastName !== '') {
            $fullName = trim($firstName . ' ' . $lastName);
        }
        if (!preg_match('/^\d{10}$/', $nationalId)) respond(['error' => 'کد ملی باید ۱۰ رقم باشد'], 400);
        if (!preg_match('/^09\d{9}$/', $phone)) respond(['error' => 'شماره تماس باید ۱۱ رقم و با 09 شروع شود'], 400);
        if (!$firstName) respond(['error' => 'نام الزامی است'], 400);
        if (!$lastName) respond(['error' => 'نام خانوادگی الزامی است'], 400);
        if (!$fullName) respond(['error' => 'نام و نام خانوادگی الزامی است'], 400);
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'فرمت ایمیل نامعتبر است'], 400);
        $nationalIdImage = $isMultipart ? saveUploadedImage('nationalIdImage', 'kyc') : null;
        if (!$nationalIdImage) respond(['error' => 'تصویر کارت ملی یا شناسنامه الزامی است'], 400);
        $selfieImage = null;
        $supportingDocument = null;
    }

    // بررسی تکراری بودن اطلاعات حساب و احراز هویت
    $check = $db->prepare("
        SELECT u.id
        FROM users u
        LEFT JOIN kyc_details k ON k.user_id = u.id
        WHERE u.username = ?
           OR (k.national_id = ? AND COALESCE(k.draft_token, '') <> ?)
           OR (k.phone = ? AND COALESCE(k.draft_token, '') <> ?)
        LIMIT 1
    ");
    $check->bind_param('sssss', $username, $nationalId, $draftToken, $phone, $draftToken);
    $check->execute();
    if ($check->get_result()->num_rows > 0)
        respond(['error' => 'نام کاربری، کد ملی یا شماره تماس قبلاً ثبت شده است'], 409);

    $userId = 'u-' . uniqid();
    $hash   = password_hash($password, PASSWORD_BCRYPT);
    $displayName = $fullName !== '' ? $fullName : $nationalId;

    $stmt = $db->prepare("
        INSERT INTO users (id, name, username, password_hash, role, avatar_color, kyc_status)
        VALUES (?, ?, ?, ?, 'user', '#8b5cf6', 'pending')
    ");
    $stmt->bind_param('ssss', $userId, $displayName, $username, $hash);
    $stmt->execute();

    $emailDb = $email !== '' ? $email : '';
    if ($draftRow) {
        $kycStmt = $db->prepare("
            UPDATE kyc_details
            SET user_id = ?, full_name = ?, national_id = ?, phone = ?, email = ?, home_address = ?, overall_status = 'pending_review',
                current_step = 3, reviewed_at = NULL, reviewed_by = NULL
            WHERE draft_token = ?
        ");
        $kycStmt->bind_param('sssssss', $userId, $fullName, $nationalId, $phone, $emailDb, $homeAddress, $draftToken);
        $kycStmt->execute();
    } else {
        $step1Status = 'approved';
        $step2Status = $selfieImage ? 'approved' : 'pending';
        $step3Status = $supportingDocument || $homeAddress ? 'pending' : 'pending';
        $overallStatus = 'pending_review';
        $kycStmt = $db->prepare("
            INSERT INTO kyc_details (
                user_id, draft_token, full_name, national_id, phone, email, national_id_image,
                selfie_image, supporting_document, home_address, current_step,
                step1_status, step2_status, step3_status, overall_status, face_match_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3, ?, ?, ?, ?, ?)
        ");
        $kycStmt->bind_param(
            'ssssssssssssssd',
            $userId,
            $draftToken,
            $fullName,
            $nationalId,
            $phone,
            $emailDb,
            $nationalIdImage,
            $selfieImage,
            $supportingDocument,
            $homeAddress,
            $step1Status,
            $step2Status,
            $step3Status,
            $overallStatus,
            $faceMatchScore
        );
        $kycStmt->execute();
    }

    $kycQuery = $db->prepare("
        SELECT user_id, full_name, national_id, phone, email, submitted_at, rejection_reason,
               national_id_image, selfie_image, supporting_document, home_address, draft_token,
               current_step, step1_status, step2_status, step3_status, overall_status, face_match_score
        FROM kyc_details
        WHERE user_id = ?
        ORDER BY submitted_at DESC
        LIMIT 1
    ");
    $kycQuery->bind_param('s', $userId);
    $kycQuery->execute();
    $kyc = $kycQuery->get_result()->fetch_assoc();

    logAuditEvent($db, 'auth.register', ['user_id' => $userId, 'role' => 'user'], ['username' => $username, 'draft_token' => $draftToken], $userId, 'user');

    respond([
        'success' => true,
        'message' => 'ثبت‌نام موفق — KYC در انتظار بررسی',
        'user' => [
            'id' => $userId,
            'name' => $fullName,
            'username' => $username,
            'role' => 'user',
            'avatarColor' => '#8b5cf6',
            'kycStatus' => 'pending',
            'kycDetails' => [
                'fullName' => $fullName,
                'nationalId' => $nationalId,
                'phone' => $phone,
                'email' => $emailDb !== '' ? $emailDb : null,
                'timestamp' => date('Y-m-d H:i:s'),
                'nationalIdImage' => $nationalIdImage,
            ],
            'balances' => [
                'IRT' => 0,
                'BTC' => 0,
                'ETH' => 0,
                'USDT' => 0,
                'TRX' => 0,
            ],
            'cryptoAddresses' => [
                'BTC' => '',
                'USDT' => '',
                'TRX' => '',
            ],
            'cardNo' => '',
            'shibaNo' => '',
            'kycVerified' => false,
            'kycDetails' => buildKycDetailsResponse($kyc),
        ],
    ], 201);
}

// ═══════════════════════════════════════════════════════════════
//  /users  (فقط ادمین)
// ═══════════════════════════════════════════════════════════════
// --------------------------------------------------
//  /kyc
// --------------------------------------------------
if ($resource === 'kyc') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    $isMultipart = !empty($_FILES) || stripos($contentType, 'multipart/form-data') !== false;

    if ($id === 'drafts' && $method === 'POST') {
        $body = $isMultipart ? [] : getBody();
        $step = (int)($_POST['step'] ?? $body['step'] ?? 0);
        $draftToken = trim($_POST['draftToken'] ?? $body['draftToken'] ?? '');
        $db = getDB();

        if ($step < 1 || $step > 3) respond(['error' => 'مرحله نامعتبر است'], 400);

        if ($step === 1) {
            $firstName = trim($_POST['firstName'] ?? $body['firstName'] ?? '');
            $lastName = trim($_POST['lastName'] ?? $body['lastName'] ?? '');
            $nationalId = trim($_POST['nationalId'] ?? $body['nationalId'] ?? '');
            $phone = trim($_POST['phone'] ?? $body['phone'] ?? '');
            $email = trim($_POST['email'] ?? $body['email'] ?? '');
            $fullName = trim($firstName . ' ' . $lastName);
            $nationalIdImage = $isMultipart ? saveUploadedImage('nationalIdImage', 'kyc') : null;

            if (!$firstName || !$lastName) respond(['error' => 'نام و نام خانوادگی الزامی است'], 400);
            if (!preg_match('/^\d{10}$/', $nationalId)) respond(['error' => 'کد ملی باید ۱۰ رقم باشد'], 400);
            if (!preg_match('/^09\d{9}$/', $phone)) respond(['error' => 'شماره تماس باید ۱۱ رقم و با 09 شروع شود'], 400);
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'فرمت ایمیل نامعتبر است'], 400);
            if (!$nationalIdImage) respond(['error' => 'تصویر کارت ملی یا شناسنامه الزامی است'], 400);

            if (!$draftToken) {
                $draftToken = bin2hex(random_bytes(16));
                $payload = encryptPayload([
                    'step' => 1,
                    'firstName' => $firstName,
                    'lastName' => $lastName,
                    'nationalId' => $nationalId,
                    'phone' => $phone,
                    'email' => $email ?: null,
                ]);
                $insert = $db->prepare("
                    INSERT INTO kyc_details (
                        draft_token, full_name, national_id, phone, email, national_id_image,
                        current_step, step1_status, step2_status, step3_status, overall_status, step1_payload
                    ) VALUES (?, ?, ?, ?, ?, ?, 1, 'approved', 'pending', 'pending', 'draft', ?)
                ");
                $insert->bind_param('sssssss', $draftToken, $fullName, $nationalId, $phone, $email, $nationalIdImage, $payload);
                dbExecute($insert);
            } else {
                $payload = encryptPayload([
                    'step' => 1,
                    'firstName' => $firstName,
                    'lastName' => $lastName,
                    'nationalId' => $nationalId,
                    'phone' => $phone,
                    'email' => $email ?: null,
                ]);
                $update = $db->prepare("
                    UPDATE kyc_details
                    SET full_name = ?, national_id = ?, phone = ?, email = ?, national_id_image = ?,
                        current_step = 1, step1_status = 'approved', step2_status = 'pending', step3_status = 'pending',
                        overall_status = 'draft', step1_payload = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE draft_token = ?
                ");
                $update->bind_param('sssssss', $fullName, $nationalId, $phone, $email, $nationalIdImage, $payload, $draftToken);
                dbExecute($update);
            }
            logAuditEvent($db, 'kyc.draft_saved', null, ['step' => 1, 'draft_token' => $draftToken, 'national_id' => $nationalId], null, 'kyc');
        } elseif ($step === 2) {
            if (!$draftToken) respond(['error' => 'کد پیش‌نویس لازم است'], 400);
            $selfieImage = $isMultipart ? saveUploadedImage('selfieImage', 'kyc') : null;
            if (!$selfieImage) respond(['error' => 'عکس سلفی الزامی است'], 400);
            $faceMatchScore = isset($_POST['faceMatchScore']) ? (float)$_POST['faceMatchScore'] : (isset($body['faceMatchScore']) ? (float)$body['faceMatchScore'] : null);
            $faceMatchStatus = trim($_POST['faceMatchStatus'] ?? $body['faceMatchStatus'] ?? 'review');
            if (!in_array($faceMatchStatus, ['verified', 'review', 'unavailable', 'failed'], true)) {
                $faceMatchStatus = 'review';
            }
            $step2Status = $faceMatchStatus === 'verified' ? 'approved' : 'pending';
            $payload = encryptPayload([
                'step' => 2,
                'faceMatchStatus' => $faceMatchStatus,
                'faceMatchScore' => $faceMatchScore,
            ]);
            $update = $db->prepare("
                UPDATE kyc_details
                SET selfie_image = ?, face_match_score = ?, current_step = 2,
                    step2_status = ?, step2_payload = ?, overall_status = 'draft',
                    updated_at = CURRENT_TIMESTAMP
                WHERE draft_token = ?
            ");
            $update->bind_param('sdsss', $selfieImage, $faceMatchScore, $step2Status, $payload, $draftToken);
            dbExecute($update);
            logAuditEvent($db, 'kyc.draft_saved', null, ['step' => 2, 'draft_token' => $draftToken, 'face_match_score' => $faceMatchScore, 'face_match_status' => $faceMatchStatus], null, 'kyc');
        } else {
            if (!$draftToken) respond(['error' => 'کد پیش‌نویس لازم است'], 400);
            $homeAddress = trim($_POST['homeAddress'] ?? $body['homeAddress'] ?? '');
            $supportingDocumentType = trim($_POST['supportingDocumentType'] ?? $body['supportingDocumentType'] ?? '');
            $supportingDocument = $isMultipart ? saveUploadedImage('supportingDocument', 'kyc', ['image/jpeg', 'image/png', 'application/pdf'], 10 * 1024 * 1024) : null;
            $payload = encryptPayload([
                'step' => 3,
                'homeAddress' => $homeAddress ?: null,
                'supportingDocumentType' => $supportingDocumentType ?: null,
            ]);
            $update = $db->prepare("
                UPDATE kyc_details
                SET home_address = ?, supporting_document = COALESCE(?, supporting_document),
                    supporting_document_type = ?, current_step = 3,
                    step3_status = 'approved', step3_payload = ?, overall_status = 'draft',
                    updated_at = CURRENT_TIMESTAMP
                WHERE draft_token = ?
            ");
            $update->bind_param('sssss', $homeAddress, $supportingDocument, $supportingDocumentType, $payload, $draftToken);
            dbExecute($update);
            logAuditEvent($db, 'kyc.draft_saved', null, ['step' => 3, 'draft_token' => $draftToken, 'has_supporting_document' => $supportingDocument !== null], null, 'kyc');
        }

        $stmt = $db->prepare("
            SELECT user_id, full_name, national_id, phone, email, submitted_at, rejection_reason,
                   national_id_image, selfie_image, supporting_document, home_address, draft_token,
                   current_step, step1_status, step2_status, step3_status, overall_status, face_match_score
            FROM kyc_details
            WHERE draft_token = ?
            LIMIT 1
        ");
        $stmt->bind_param('s', $draftToken);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if (!$row) respond(['error' => 'پیش‌نویس یافت نشد'], 404);
        respond(buildKycDraftResponse($row));
    }

    if ($id === 'drafts' && $method === 'GET' && $sub) {
        $db = getDB();
        $stmt = $db->prepare("
            SELECT user_id, full_name, national_id, phone, email, submitted_at, rejection_reason,
                   national_id_image, selfie_image, supporting_document, home_address, draft_token,
                   current_step, step1_status, step2_status, step3_status, overall_status, face_match_score
            FROM kyc_details
            WHERE draft_token = ?
            LIMIT 1
        ");
        $stmt->bind_param('s', $sub);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if (!$row) respond(['error' => 'پیش‌نویس یافت نشد'], 404);
        respond(buildKycDraftResponse($row));
    }

    if ($id === 'me' && $method === 'GET') {
        $auth = authRequired();
        $db = getDB();
        $stmt = $db->prepare("
            SELECT user_id, full_name, national_id, phone, email, submitted_at, rejection_reason,
                   national_id_image, selfie_image, supporting_document, home_address, draft_token,
                   current_step, step1_status, step2_status, step3_status, overall_status, face_match_score
            FROM kyc_details
            WHERE user_id = ?
            ORDER BY submitted_at DESC
            LIMIT 1
        ");
        $stmt->bind_param('s', $auth['user_id']);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        respond(buildKycDraftResponse($row));
    }

    if ($id === 'report' && $method === 'GET') {
        $auth = authRequired();
        ariaxRequireRole($auth, ['admin', 'kyc_operator']);
        $db = getDB();
        $res = $db->query("
            SELECT id, user_id, draft_token, full_name, national_id, phone, email, current_step,
                   step1_status, step2_status, step3_status, overall_status, face_match_score,
                   submitted_at, reviewed_at, rejection_reason
            FROM kyc_details
            ORDER BY submitted_at DESC
            LIMIT 200
        ");
        $rows = $res->fetch_all(MYSQLI_ASSOC);
        $summary = [
            'draft' => 0,
            'pending_review' => 0,
            'approved' => 0,
            'rejected' => 0,
        ];
        foreach ($rows as $row) {
            $status = $row['overall_status'] ?? 'draft';
            if (isset($summary[$status])) $summary[$status]++;
        }
        respond([
            'rows' => array_map(function ($row) {
                return [
                    'id' => (int)$row['id'],
                    'userId' => $row['user_id'],
                    'draftToken' => $row['draft_token'],
                    'fullName' => $row['full_name'],
                    'nationalId' => $row['national_id'],
                    'phone' => $row['phone'],
                    'email' => $row['email'],
                    'currentStep' => (int)$row['current_step'],
                    'step1Status' => $row['step1_status'],
                    'step2Status' => $row['step2_status'],
                    'step3Status' => $row['step3_status'],
                    'overallStatus' => $row['overall_status'],
                    'faceMatchScore' => isset($row['face_match_score']) ? (float)$row['face_match_score'] : null,
                    'submittedAt' => $row['submitted_at'],
                    'reviewedAt' => $row['reviewed_at'],
                    'rejectionReason' => $row['rejection_reason'],
                ];
            }, $rows),
            'summary' => $summary,
        ]);
    }

    if ($id === 'report' && $sub && ($parts[3] ?? '') === 'step' && $method === 'PUT') {
        $auth = authRequired();
        ariaxRequireRole($auth, ['admin', 'kyc_operator']);
        $body = getBody();
        $applicationId = (int)$sub;
        $step = (int)($body['step'] ?? 0);
        $stepStatus = $body['status'] ?? '';
        $rejectionReason = trim($body['rejectionReason'] ?? '');
        if ($step < 1 || $step > 3) respond(['error' => 'مرحله نامعتبر است'], 400);
        if (!in_array($stepStatus, ['approved', 'rejected'], true)) {
            respond(['error' => 'وضعیت مرحله نامعتبر است'], 400);
        }

        $db = getDB();
        $fetch = $db->prepare("SELECT id, user_id, step1_status, step2_status, step3_status FROM kyc_details WHERE id = ? LIMIT 1");
        $fetch->bind_param('i', $applicationId);
        $fetch->execute();
        $existing = $fetch->get_result()->fetch_assoc();
        if (!$existing) respond(['error' => 'پرونده پیدا نشد'], 404);

        $stepColumn = 'step1_status';
        if ($step === 2) $stepColumn = 'step2_status';
        if ($step === 3) $stepColumn = 'step3_status';
        $update = $db->prepare("UPDATE kyc_details SET {$stepColumn} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $update->bind_param('si', $stepStatus, $applicationId);
        dbExecute($update);

        $reload = $db->prepare("SELECT step1_status, step2_status, step3_status, user_id FROM kyc_details WHERE id = ? LIMIT 1");
        $reload->bind_param('i', $applicationId);
        $reload->execute();
        $row = $reload->get_result()->fetch_assoc();

        $s1 = $row['step1_status'] ?? 'pending';
        $s2 = $row['step2_status'] ?? 'pending';
        $s3 = $row['step3_status'] ?? 'pending';
        $overallStatus = 'draft';
        $userKycStatus = null;

        if ($s1 === 'rejected' || $s2 === 'rejected' || $s3 === 'rejected') {
            $overallStatus = 'rejected';
            $userKycStatus = 'rejected';
        } elseif ($s1 === 'approved' && $s2 === 'approved' && $s3 === 'approved') {
            $overallStatus = 'approved';
            $userKycStatus = 'verified';
        } elseif ($s1 === 'approved' || $s2 === 'approved' || $s3 === 'approved') {
            $overallStatus = 'pending_review';
        }

        $reasonForRow = $stepStatus === 'rejected' ? ($rejectionReason ?: 'مرحله ' . $step . ' رد شد') : '';
        $overallUpdate = $db->prepare("
            UPDATE kyc_details
            SET overall_status = ?, rejection_reason = CASE WHEN ? <> '' THEN ? ELSE rejection_reason END,
                reviewed_at = NOW(), reviewed_by = ?
            WHERE id = ?
        ");
        $overallUpdate->bind_param('ssssi', $overallStatus, $reasonForRow, $reasonForRow, $auth['user_id'], $applicationId);
        dbExecute($overallUpdate);

        if (!empty($row['user_id']) && $userKycStatus) {
            $userUpdate = $db->prepare("UPDATE users SET kyc_status = ? WHERE id = ?");
            $userUpdate->bind_param('ss', $userKycStatus, $row['user_id']);
            $userUpdate->execute();
        }
        logAuditEvent($db, 'kyc.review_step', $auth, [
            'application_id' => $applicationId,
            'step' => $step,
            'step_status' => $stepStatus,
            'overall_status' => $overallStatus,
            'user_kyc_status' => $userKycStatus,
        ], (string)$applicationId, 'kyc');

        respond([
            'success' => true,
            'step' => $step,
            'stepStatus' => $stepStatus,
            'step1Status' => $s1,
            'step2Status' => $s2,
            'step3Status' => $s3,
            'overallStatus' => $overallStatus,
        ]);
    }

    if ($id === 'report' && $sub && $method === 'PUT') {
        $auth = authRequired();
        ariaxRequireRole($auth, ['admin']);
        $body = getBody();
        $overallStatus = $body['overallStatus'] ?? '';
        $rejectionReason = trim($body['rejectionReason'] ?? '');
        if (!in_array($overallStatus, ['approved', 'rejected'], true)) {
            respond(['error' => 'وضعیت نامعتبر است'], 400);
        }
        $db = getDB();
        $stmt = $db->prepare("SELECT user_id FROM kyc_details WHERE id = ? LIMIT 1");
        $stmt->bind_param('i', $sub);
        $stmt->execute();
        $existing = $stmt->get_result()->fetch_assoc();
        if (!$existing) respond(['error' => 'پرونده پیدا نشد'], 404);

        $update = $db->prepare("
            UPDATE kyc_details
            SET overall_status = ?, reviewed_at = NOW(), reviewed_by = ?, rejection_reason = ?
            WHERE id = ?
        ");
        $update->bind_param('sssi', $overallStatus, $auth['user_id'], $rejectionReason, $sub);
        $update->execute();

        if (!empty($existing['user_id'])) {
            $status = $overallStatus === 'approved' ? 'verified' : 'rejected';
            $userUpdate = $db->prepare("UPDATE users SET kyc_status = ? WHERE id = ?");
            $userUpdate->bind_param('ss', $status, $existing['user_id']);
            $userUpdate->execute();
        }
        logAuditEvent($db, 'kyc.review', $auth, [
            'application_id' => (int)$sub,
            'overall_status' => $overallStatus,
            'rejection_reason' => $rejectionReason,
        ], (string)$sub, 'kyc');

        respond(['success' => true]);
    }
}

if ($resource === 'users') {
    $auth = authRequired();

    // لیست کاربران
    if ($method === 'GET' && !$id) {
        ariaxRequireRole($auth, ['admin', 'kyc_operator', 'support', 'finance_manager']);
        $db = getDB();
        $res = $db->query("
            SELECT u.id, u.name, u.username, u.role, u.avatar_color, u.kyc_status,
                   u.balance_irt, u.balance_btc, u.balance_eth, u.balance_usdt, u.balance_trx,
                   u.addr_btc, u.addr_usdt, u.addr_trx, u.card_no, u.shiba_no,
                   k.full_name, k.national_id, k.phone, k.email, k.submitted_at, k.rejection_reason,
                   k.national_id_image, k.selfie_image, k.supporting_document, k.home_address,
                   k.draft_token, k.current_step, k.step1_status, k.step2_status, k.step3_status,
                   k.overall_status, k.face_match_score
            FROM users u
            LEFT JOIN kyc_details k ON k.id = (
                SELECT id FROM kyc_details WHERE user_id = u.id ORDER BY submitted_at DESC LIMIT 1
            )
            ORDER BY u.created_at DESC
        ");
        $rows = $res->fetch_all(MYSQLI_ASSOC);
        $users = array_map(function ($u) {
            return [
                'id'            => $u['id'],
                'name'          => $u['name'],
                'username'      => $u['username'],
                'role'          => $u['role'],
                'avatarColor'   => $u['avatar_color'],
                'kycStatus'     => $u['kyc_status'],
                'balances'      => [
                    'IRT'  => (float)$u['balance_irt'],
                    'BTC'  => (float)$u['balance_btc'],
                    'ETH'  => (float)$u['balance_eth'],
                    'USDT' => (float)$u['balance_usdt'],
                    'TRX'  => (float)$u['balance_trx'],
                ],
                'cryptoAddresses' => [
                    'BTC'  => $u['addr_btc']  ?? '',
                    'USDT' => $u['addr_usdt'] ?? '',
                    'TRX'  => $u['addr_trx']  ?? '',
                ],
                'cardNo'  => $u['card_no']  ?? '',
                'shibaNo' => $u['shiba_no'] ?? '',
                'kycDetails' => $u['full_name'] ? [
                    'fullName'        => $u['full_name'],
                    'nationalId'      => $u['national_id'],
                    'phone'           => $u['phone'],
                    'email'           => $u['email'] ?? null,
                    'timestamp'       => $u['submitted_at'],
                    'rejectionReason' => $u['rejection_reason'],
                    'nationalIdImage' => decryptStoredImage($u['national_id_image'] ?? null),
                    'selfieImage'     => decryptStoredImage($u['selfie_image'] ?? null),
                    'supportingDocument' => decryptStoredImage($u['supporting_document'] ?? null),
                    'draftToken'      => $u['draft_token'] ?? null,
                    'currentStep'     => isset($u['current_step']) ? (int)$u['current_step'] : 1,
                    'step1Status'     => $u['step1_status'] ?? 'pending',
                    'step2Status'     => $u['step2_status'] ?? 'pending',
                    'step3Status'     => $u['step3_status'] ?? 'pending',
                    'overallStatus'   => $u['overall_status'] ?? 'draft',
                    'faceMatchScore'  => isset($u['face_match_score']) ? (float)$u['face_match_score'] : null,
                    'homeAddress'     => $u['home_address'] ?? null,
                ] : null,
            ];
        }, $rows);
        respond(['users' => $users]);
    }

    // پروفایل کاربر جاری
    if ($method === 'GET' && $id === 'me') {
        $db = getDB();
        $userId = $auth['user_id'];
        $stmt = $db->prepare("
            SELECT u.id, u.name, u.username, u.role, u.avatar_color, u.kyc_status,
                   u.balance_irt, u.balance_btc, u.balance_eth, u.balance_usdt, u.balance_trx,
                   u.addr_btc, u.addr_usdt, u.addr_trx, u.card_no, u.shiba_no,
                   k.full_name, k.national_id, k.phone, k.email, k.submitted_at, k.rejection_reason,
                   k.national_id_image, k.selfie_image, k.supporting_document, k.home_address,
                   k.draft_token, k.current_step, k.step1_status, k.step2_status, k.step3_status,
                   k.overall_status, k.face_match_score
            FROM users u
            LEFT JOIN kyc_details k ON k.id = (
                SELECT id FROM kyc_details WHERE user_id = u.id ORDER BY submitted_at DESC LIMIT 1
            )
            WHERE u.id = ?
            LIMIT 1
        ");
        $stmt->bind_param('s', $userId);
        $stmt->execute();
        $u = $stmt->get_result()->fetch_assoc();
        if (!$u) respond(['error' => 'کاربر پیدا نشد'], 404);
        respond(['user' => [
            'id'            => $u['id'],
            'name'          => $u['name'],
            'username'      => $u['username'],
            'role'          => $u['role'],
            'avatarColor'   => $u['avatar_color'],
            'kycStatus'     => $u['kyc_status'],
            'balances'      => [
                'IRT'  => (float)$u['balance_irt'],
                'BTC'  => (float)$u['balance_btc'],
                'ETH'  => (float)$u['balance_eth'],
                'USDT' => (float)$u['balance_usdt'],
                'TRX'  => (float)$u['balance_trx'],
            ],
            'cryptoAddresses' => [
                'BTC'  => $u['addr_btc']  ?? '',
                'USDT' => $u['addr_usdt'] ?? '',
                'TRX'  => $u['addr_trx']  ?? '',
            ],
            'cardNo'  => $u['card_no']  ?? '',
            'shibaNo' => $u['shiba_no'] ?? '',
            'kycDetails' => $u['full_name'] ? [
                'fullName'        => $u['full_name'],
                'nationalId'      => $u['national_id'],
                'phone'           => $u['phone'],
                'email'           => $u['email'] ?? null,
                'timestamp'       => $u['submitted_at'],
                'rejectionReason' => $u['rejection_reason'],
                'nationalIdImage' => decryptStoredImage($u['national_id_image'] ?? null),
                'selfieImage'     => decryptStoredImage($u['selfie_image'] ?? null),
                'supportingDocument' => decryptStoredImage($u['supporting_document'] ?? null),
                'draftToken'      => $u['draft_token'] ?? null,
                'currentStep'     => isset($u['current_step']) ? (int)$u['current_step'] : 1,
                'step1Status'     => $u['step1_status'] ?? 'pending',
                'step2Status'     => $u['step2_status'] ?? 'pending',
                'step3Status'     => $u['step3_status'] ?? 'pending',
                'overallStatus'   => $u['overall_status'] ?? 'draft',
                'faceMatchScore'  => isset($u['face_match_score']) ? (float)$u['face_match_score'] : null,
                'homeAddress'     => $u['home_address'] ?? null,
            ] : null,
        ]]);
    }

    // ویرایش پروفایل توسط کاربر
    if ($method === 'PUT' && $id === 'me') {
        $body = getBody();
        $db   = getDB();
        $userId = $auth['user_id'];
        $cardNo   = trim($body['cardNo']   ?? '');
        $shibaNo  = trim($body['shibaNo']  ?? '');
        $addrBtc  = trim($body['cryptoAddresses']['BTC']  ?? $body['addrBtc']  ?? '');
        $addrUsdt = trim($body['cryptoAddresses']['USDT'] ?? $body['addrUsdt'] ?? '');
        $addrTrx  = trim($body['cryptoAddresses']['TRX']  ?? $body['addrTrx']  ?? '');

        if ($cardNo !== '' && preg_match('/^\d{16}$/', $cardNo) !== 1) {
            respond(['error' => 'شماره کارت باید ۱۶ رقم باشد'], 400);
        }
        if ($shibaNo !== '' && preg_match('/^IR\d{24}$/i', $shibaNo) !== 1) {
            respond(['error' => 'شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد'], 400);
        }
        foreach (['BTC' => $addrBtc, 'USDT' => $addrUsdt, 'TRX' => $addrTrx] as $asset => $address) {
            if ($address !== '' && textLength($address) > 128) {
                respond(['error' => 'آدرس ' . $asset . ' بیش از حد مجاز است'], 400);
            }
        }

        $stmt = $db->prepare("UPDATE users SET card_no=?, shiba_no=?, addr_btc=?, addr_usdt=?, addr_trx=? WHERE id=?");
        $stmt->bind_param('ssssss', $cardNo, $shibaNo, $addrBtc, $addrUsdt, $addrTrx, $userId);
        $stmt->execute();
        respond(['success' => true]);
    }

    // آپدیت کاربر (مثلاً KYC)
    if ($method === 'PUT' && $id) {
        ariaxRequireRole($auth, ['admin']);
        $body = getBody();
        $db   = getDB();

        if (isset($body['kycStatus'])) {
            $status = $body['kycStatus'];
            $stmt = $db->prepare("UPDATE users SET kyc_status = ? WHERE id = ?");
            $stmt->bind_param('ss', $status, $id);
            $stmt->execute();

            $adminId = $auth['user_id'];
            if ($status === 'verified') {
                $upd = $db->prepare("
                    UPDATE kyc_details SET reviewed_at=NOW(), reviewed_by=?
                    WHERE user_id=? ORDER BY submitted_at DESC LIMIT 1
                ");
                $upd->bind_param('ss', $adminId, $id);
                $upd->execute();
            }

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

            logAuditEvent($db, 'user.kyc_status_updated', $auth, [
                'target_user_id' => $id,
                'status' => $status,
                'rejection_reason' => $body['rejectionReason'] ?? null,
            ], $id, 'user');
        }
        if (!empty(array_diff(array_keys($body), ['kycStatus', 'rejectionReason']))) {
            logAuditEvent($db, 'user.updated', $auth, [
                'target_user_id' => $id,
                'changed_fields' => array_values(array_diff(array_keys($body), ['kycStatus', 'rejectionReason'])),
            ], $id, 'user');
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
    if ($method === 'GET' && !$id) {
        if (ariaxCan($auth, 'transactions.view_all')) {
            $res = $db->query("
                SELECT id, user_id, user_name, type, asset, amount, fee, destination, tx_id,
                       status, note, created_at, updated_at, home_address, postal_code, requires_extended
                FROM transactions
                ORDER BY created_at DESC
                LIMIT 200
            ");
        } else {
            $stmt = $db->prepare("
                SELECT id, user_id, user_name, type, asset, amount, fee, destination, tx_id,
                       status, note, created_at, updated_at, home_address, postal_code, requires_extended
                FROM transactions
                WHERE user_id=?
                ORDER BY created_at DESC
            ");
            $stmt->bind_param('s', $auth['user_id']);
            $stmt->execute();
            $res = $stmt->get_result();
        }
        respond(['transactions' => $res->fetch_all(MYSQLI_ASSOC)]);
    }
    if ($method === 'GET' && $id) {
        respond(['error' => 'مسیر تراکنش نامعتبر است'], 404);
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
        $homeAddress = trim($body['homeAddress'] ?? '');
        $postalCode  = trim($body['postalCode'] ?? '');
        $fee    = round($amount * 0.002, 8);

        if (!isset($body['amount']) || !is_numeric($body['amount'])) {
            respond(['error' => 'مقدار نامعتبر است'], 400);
        }
        if ($dest !== '' && textLength($dest) > 255) respond(['error' => 'مقصد بیش از حد مجاز است'], 400);
        if ($homeAddress !== '' && textLength($homeAddress) > 300) respond(['error' => 'آدرس محل سکونت بیش از حد مجاز است'], 400);
        if ($postalCode !== '' && preg_match('/^\d{10}$/', $postalCode) !== 1) {
            respond(['error' => 'کد پستی باید ۱۰ رقم باشد'], 400);
        }

        $kycStmt = $db->prepare("SELECT kyc_status FROM users WHERE id = ? LIMIT 1");
        $kycStmt->bind_param('s', $userId);
        $kycStmt->execute();
        $kycRow = $kycStmt->get_result()->fetch_assoc();
        $kycVerified = ($kycRow['kyc_status'] ?? '') === 'verified';

        $needsExtendedCheck = txRequiresExtended($asset, $amount);
        if ($type === 'withdraw' && $kycVerified) {
            $needsExtendedCheck = false;
        }
        $requiresExtended = $needsExtendedCheck ? 1 : 0;

        if (!in_array($type, ['deposit','withdraw','trade'])) respond(['error' => 'نوع نامعتبر'], 400);
        if (!in_array($asset, ['IRT','BTC','ETH','USDT','TRX'])) respond(['error' => 'دارایی نامعتبر'], 400);
        if ($amount <= 0) respond(['error' => 'مقدار باید بیشتر از صفر باشد'], 400);

        if ($requiresExtended && strlen($homeAddress) < 10) {
            respond(['error' => 'برای مبالغ بالا، آدرس محل سکونت (حداقل ۱۰ کاراکتر) الزامی است'], 400);
        }

        $stmt = $db->prepare("
            INSERT INTO transactions (id, user_id, user_name, type, asset, amount, fee, destination, status, home_address, postal_code, requires_extended)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        ");
        $stmt->bind_param('sssssddsssi', $txId, $userId, $uname, $type, $asset, $amount, $fee, $dest, $homeAddress, $postalCode, $requiresExtended);
        $stmt->execute();
        logAuditEvent($db, 'transaction.created', $auth, [
            'transaction_id' => $txId,
            'type' => $type,
            'asset' => $asset,
            'amount' => $amount,
            'fee' => $fee,
        ], $txId, 'transaction');

        respond(['success' => true, 'transactionId' => $txId, 'fee' => $fee, 'requiresExtended' => (bool)$requiresExtended], 201);
    }

    // تأیید / رد تراکنش (فقط ادمین)
    if ($method === 'PUT' && $id) {
        ariaxRequireRole($auth, ['admin', 'finance_manager']);
        $body = getBody();
        $newStatus = $body['status'] ?? '';
        $note = trim($body['note'] ?? '');
        if (!isValidTransactionId($id)) respond(['error' => 'شناسه تراکنش نامعتبر است'], 400);
        if (!in_array($newStatus, ['completed', 'rejected'], true)) {
            respond(['error' => 'وضعیت نامعتبر است'], 400);
        }
        if ($note !== '' && textLength($note) > 1000) respond(['error' => 'یادداشت بیش از حد مجاز است'], 400);

        $stmt = $db->prepare("
            SELECT id, user_id, user_name, type, asset, amount, fee, destination, tx_id,
                   status, note, created_at, updated_at, home_address, postal_code, requires_extended
            FROM transactions
            WHERE id = ?
            LIMIT 1
        ");
        $stmt->bind_param('s', $id);
        $stmt->execute();
        $tx = $stmt->get_result()->fetch_assoc();
        if (!$tx) respond(['error' => 'تراکنش پیدا نشد'], 404);
        if ($tx['status'] !== 'pending') respond(['error' => 'فقط تراکنش‌های در انتظار قابل بررسی هستند'], 400);

        $asset = $tx['asset'];
        $amount = (float)$tx['amount'];
        $fee = (float)$tx['fee'];
        $userId = $tx['user_id'];
        $type = $tx['type'];
        $balanceCol = 'balance_' . strtolower($asset);
        $allowedCols = ['balance_irt', 'balance_btc', 'balance_eth', 'balance_usdt', 'balance_trx'];
        if (!in_array($balanceCol, $allowedCols, true)) respond(['error' => 'دارایی نامعتبر'], 400);

        if ($newStatus === 'completed') {
            if ($type === 'deposit') {
                $credit = $amount - $fee;
                if ($credit < 0) respond(['error' => 'مبلغ واریز نامعتبر است'], 400);
                $upd = $db->prepare("UPDATE users SET {$balanceCol} = {$balanceCol} + ? WHERE id = ?");
                $upd->bind_param('ds', $credit, $userId);
                dbExecute($upd);
            } elseif ($type === 'withdraw') {
                $debit = $amount + $fee;
                $chk = $db->prepare("SELECT {$balanceCol} AS bal FROM users WHERE id = ? LIMIT 1");
                $chk->bind_param('s', $userId);
                $chk->execute();
                $userRow = $chk->get_result()->fetch_assoc();
                if (!$userRow || (float)$userRow['bal'] < $debit) {
                    respond(['error' => 'موجودی کاربر برای برداشت کافی نیست'], 400);
                }
                $upd = $db->prepare("UPDATE users SET {$balanceCol} = {$balanceCol} - ? WHERE id = ?");
                $upd->bind_param('ds', $debit, $userId);
                dbExecute($upd);
            }
        }

        $update = $db->prepare("UPDATE transactions SET status = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $update->bind_param('sss', $newStatus, $note, $id);
        dbExecute($update);
        logAuditEvent($db, 'transaction.reviewed', $auth, [
            'transaction_id' => $id,
            'status' => $newStatus,
            'note' => $note,
        ], $id, 'transaction');

        respond(['success' => true, 'id' => $id, 'status' => $newStatus]);
    }
}

// ═══════════════════════════════════════════════════════════════
//  /messages
// ═══════════════════════════════════════════════════════════════
if ($resource === 'messages') {
    $auth = authRequired();
    $db   = getDB();

    if ($method === 'GET') {
        ariaxRequireRole($auth, ['admin', 'support', 'finance_manager', 'kyc_operator']);
        $res = $db->query("
            SELECT id, sender_id, sender_name, message, created_at
            FROM team_messages
            ORDER BY created_at ASC
            LIMIT 100
        ");
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
        logAuditEvent($db, 'message.created', $auth, [
            'message_id' => (int)$db->insert_id,
            'sender_name' => $senderName,
        ], (string)$db->insert_id, 'message');

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
        ariaxRequireRole($auth, ['admin', 'support', 'finance_manager', 'kyc_operator']);
        $res = $db->query("
            SELECT t.id, t.title, t.assigned_to, t.created_by, t.status, t.category, t.created_at, u.name AS assignee_name
            FROM team_tasks t
            JOIN users u ON u.id = t.assigned_to
            ORDER BY t.created_at DESC
        ");
        respond(['tasks' => $res->fetch_all(MYSQLI_ASSOC)]);
    }

    if ($method === 'POST') {
        ariaxRequireRole($auth, ['admin', 'support', 'finance_manager', 'kyc_operator']);
        $body     = getBody();
        $title    = trim($body['title']    ?? '');
        $assignTo = $body['assignedTo']    ?? $auth['user_id'];
        $cat      = $body['category']      ?? 'wallet';
        $createdBy = $auth['user_id'];

        if (!$title) respond(['error' => 'عنوان الزامی است'], 400);

        $stmt = $db->prepare("INSERT INTO team_tasks (title, assigned_to, created_by, status, category) VALUES (?,?,?,'todo',?)");
        $stmt->bind_param('ssss', $title, $assignTo, $createdBy, $cat);
        $stmt->execute();
        logAuditEvent($db, 'task.created', $auth, [
            'task_id' => (int)$db->insert_id,
            'title' => $title,
            'assigned_to' => $assignTo,
            'category' => $cat,
        ], (string)$db->insert_id, 'task');

        respond(['success' => true, 'id' => $db->insert_id], 201);
    }

    if ($method === 'PUT' && $id) {
        ariaxRequireRole($auth, ['admin', 'support', 'finance_manager', 'kyc_operator']);
        $body   = getBody();
        $status = $body['status'] ?? '';
        if (!in_array($status, ['todo','in_progress','done'])) respond(['error' => 'وضعیت نامعتبر'], 400);

        $stmt = $db->prepare("UPDATE team_tasks SET status=? WHERE id=?");
        $stmt->bind_param('si', $status, $id);
        $stmt->execute();
        logAuditEvent($db, 'task.updated', $auth, [
            'task_id' => (int)$id,
            'status' => $status,
        ], (string)$id, 'task');
        respond(['success' => true]);
    }
}

// ═══════════════════════════════════════════════════════════════
//  /tickets
// ═══════════════════════════════════════════════════════════════
if ($resource === 'tickets') {
    $auth = authRequired();
    $db   = getDB();
    ensureTicketsSchema($db);

    if ($method === 'GET' && !$id) {
        if (ariaxCan($auth, 'tickets.view_all')) {
            $res = $db->query("
                SELECT id, user_id, user_name, subject, category, status, created_at, updated_at
                FROM tickets
                ORDER BY updated_at DESC
                LIMIT 200
            ");
        } else {
            $stmt = $db->prepare("
                SELECT id, user_id, user_name, subject, category, status, created_at, updated_at
                FROM tickets
                WHERE user_id=?
                ORDER BY updated_at DESC
                LIMIT 100
            ");
            $stmt->bind_param('s', $auth['user_id']);
            $stmt->execute();
            $res = $stmt->get_result();
        }
        respond(['tickets' => $res->fetch_all(MYSQLI_ASSOC)]);
    }

    if ($method === 'GET' && $id && ($parts[2] ?? '') === 'messages') {
        $ticketId = (int)$id;
        $stmt = $db->prepare("
            SELECT id, user_id, user_name, subject, category, status, created_at, updated_at
            FROM tickets
            WHERE id=?
            LIMIT 1
        ");
        $stmt->bind_param('i', $ticketId);
        $stmt->execute();
        $ticket = $stmt->get_result()->fetch_assoc();
        if (!$ticket) respond(['error' => 'تیکت پیدا نشد'], 404);
        if (!ariaxCan($auth, 'tickets.view_all') && $ticket['user_id'] !== $auth['user_id']) {
            respond(['error' => 'دسترسی ندارید'], 403);
        }
        $msgStmt = $db->prepare("
            SELECT id, ticket_id, sender_id, sender_name, sender_role, message, created_at
            FROM ticket_messages
            WHERE ticket_id=?
            ORDER BY created_at ASC
        ");
        $msgStmt->bind_param('i', $ticketId);
        $msgStmt->execute();
        respond(['ticket' => $ticket, 'messages' => $msgStmt->get_result()->fetch_all(MYSQLI_ASSOC)]);
    }

    if ($method === 'POST' && !$id) {
        $body     = getBody();
        $subject  = trim($body['subject'] ?? '');
        $message  = trim($body['message'] ?? '');
        $category = $body['category'] ?? 'support';
        $allowedCats = ['wallet', 'support', 'technical', 'kyc', 'other'];
        if (!in_array($category, $allowedCats, true)) $category = 'support';
        if (!$subject) respond(['error' => 'موضوع الزامی است'], 400);
        if (!$message) respond(['error' => 'متن پیام الزامی است'], 400);

        $userId   = $auth['user_id'];
        $userName = $auth['name'];
        $role     = in_array(ariaxCanonicalRole($auth['role']), ['admin', 'support', 'finance_manager', 'kyc_operator'], true) ? 'admin' : 'user';

        $stmt = $db->prepare("INSERT INTO tickets (user_id, user_name, subject, category) VALUES (?,?,?,?)");
        $stmt->bind_param('ssss', $userId, $userName, $subject, $category);
        $stmt->execute();
        $ticketId = $db->insert_id;

        $msgStmt = $db->prepare("INSERT INTO ticket_messages (ticket_id, sender_id, sender_name, sender_role, message) VALUES (?,?,?,?,?)");
        $msgStmt->bind_param('issss', $ticketId, $userId, $userName, $role, $message);
        $msgStmt->execute();

        respond(['success' => true, 'id' => $ticketId], 201);
    }

    if ($method === 'POST' && $id && ($parts[2] ?? '') === 'messages') {
        $ticketId = (int)$id;
        $body     = getBody();
        $message  = trim($body['message'] ?? '');
        if (!$message) respond(['error' => 'پیام خالی است'], 400);

        $stmt = $db->prepare("
            SELECT id, user_id, user_name, subject, category, status, created_at, updated_at
            FROM tickets
            WHERE id=?
            LIMIT 1
        ");
        $stmt->bind_param('i', $ticketId);
        $stmt->execute();
        $ticket = $stmt->get_result()->fetch_assoc();
        if (!$ticket) respond(['error' => 'تیکت پیدا نشد'], 404);
        if (!ariaxCan($auth, 'tickets.view_all') && $ticket['user_id'] !== $auth['user_id']) {
            respond(['error' => 'دسترسی ندارید'], 403);
        }
        if ($ticket['status'] === 'closed' && !ariaxCan($auth, 'tickets.reply_all')) {
            respond(['error' => 'این تیکت بسته شده است'], 400);
        }

        $senderId   = $auth['user_id'];
        $senderName = $auth['name'];
        $role       = ariaxCan($auth, 'tickets.reply_all') ? 'admin' : 'user';

        $msgStmt = $db->prepare("INSERT INTO ticket_messages (ticket_id, sender_id, sender_name, sender_role, message) VALUES (?,?,?,?,?)");
        $msgStmt->bind_param('issss', $ticketId, $senderId, $senderName, $role, $message);
        $msgStmt->execute();

        if ($ticket['status'] === 'open' && $auth['role'] === 'admin') {
            $upd = $db->prepare("UPDATE tickets SET status='in_progress' WHERE id=?");
            $upd->bind_param('i', $ticketId);
            $upd->execute();
        }

        respond(['success' => true, 'id' => $db->insert_id], 201);
    }

    if ($method === 'PUT' && $id) {
        $ticketId = (int)$id;
        $body     = getBody();
        $status   = $body['status'] ?? '';
        if (!in_array($status, ['open', 'in_progress', 'closed'], true)) {
            respond(['error' => 'وضعیت نامعتبر است'], 400);
        }

        $stmt = $db->prepare("
            SELECT id, user_id, user_name, subject, category, status, created_at, updated_at
            FROM tickets
            WHERE id=?
            LIMIT 1
        ");
        $stmt->bind_param('i', $ticketId);
        $stmt->execute();
        $ticket = $stmt->get_result()->fetch_assoc();
        if (!$ticket) respond(['error' => 'تیکت پیدا نشد'], 404);

        if (ariaxCan($auth, 'tickets.update_all')) {
            $upd = $db->prepare("UPDATE tickets SET status=? WHERE id=?");
            $upd->bind_param('si', $status, $ticketId);
            $upd->execute();
            respond(['success' => true]);
        }

        if ($ticket['user_id'] !== $auth['user_id']) respond(['error' => 'دسترسی ندارید'], 403);
        if ($status !== 'closed') respond(['error' => 'فقط بستن تیکت مجاز است'], 400);

        $upd = $db->prepare("UPDATE tickets SET status='closed' WHERE id=?");
        $upd->bind_param('i', $ticketId);
        $upd->execute();
        respond(['success' => true]);
    }
}

// ═══════════════════════════════════════════════════════════════
//  /market  — آخرین قیمت‌ها
// ═══════════════════════════════════════════════════════════════
if ($resource === 'market' && $method === 'GET') {
    $db = getDB();
    $res = $db->query("
        SELECT m1.id, m1.symbol, m1.price_irt, m1.price_usd, m1.change_24h, m1.volume_24h, m1.high_24h, m1.low_24h, m1.recorded_at
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
    ariaxRequireRole($auth, ['admin', 'finance_manager']);

    $db  = getDB();
    $res = $db->query("SELECT total_users, pending_kyc, verified_users, pending_txs, today_txs, total_irt_held, total_fees_collected FROM v_system_stats");
    respond(['stats' => $res->fetch_assoc()]);
}

// ─── مسیر پیدا نشد ────────────────────────────────────────────
respond(['error' => 'مسیر پیدا نشد: ' . $resource], 404);
