<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// ============================================================
//  НАСТРОЙКИ
//  1. Замените MAIL_TO на свою почту — туда придёт уведомление о заявке.
//  2. MAIL_FROM должен быть реальным ящиком на домене сайта,
//     иначе письма могут попадать под фильтры спама.
//  Если MAIL_TO не заменён — заявка всё равно сохранится в requests.json.
// ============================================================
define('SITE_NAME',      'Лендинг Майи Самчинской');
define('MAIL_TO',        'CHANGE-ME@example.com');   // ← ЗАМЕНИТЕ на свою почту
define('MAIL_FROM',      'CHANGE-ME@example.com');   // ← ЗАМЕНИТЕ на ящик на домене
define('MAIL_FROM_NAME', 'Сайт Майи Самчинской');

// ============================================================
//  КОРРЕКТНОЕ ПОЛУЧЕНИЕ IP КЛИЕНТА
// ============================================================
function isPublicIp($ip) {
    if (!filter_var($ip, FILTER_VALIDATE_IP)) return false;
    return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
}

function getClientIp() {
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    if (isPublicIp($remote)) {
        return $remote;
    }
    $candidates = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_X_REAL_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_FORWARDED',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED',
    ];
    foreach ($candidates as $key) {
        if (empty($_SERVER[$key])) continue;
        $parts = explode(',', $_SERVER[$key]);
        foreach ($parts as $part) {
            $part = trim($part);
            if (isPublicIp($part)) return $part;
        }
    }
    return $remote ?: 'unknown';
}

// ============================================================
//  САНТИЗАЦИЯ И ВАЛИДАЦИЯ ВХОДА
// ============================================================
// honeypot: боты заполняют скрытое поле — молча отбрасываем
if (trim($_POST['website'] ?? '') !== '') {
    echo json_encode(['status' => 'success', 'message' => 'Заявка отправлена']);
    exit;
}

$name    = trim($_POST['name'] ?? '');
$phone   = trim($_POST['phone'] ?? '');
$message = trim($_POST['message'] ?? '');
$agree   = ($_POST['agree_policy'] ?? '') === 'yes';
$pageUrl = trim($_POST['page_url'] ?? '');

if ($name === '' || $phone === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Имя и телефон обязательны для заполнения']);
    exit;
}

// защита от header injection
if (preg_match('/[\r\n]/', $name)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Некорректные данные']);
    exit;
}

$name    = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars(mb_substr($message, 0, 1000), ENT_QUOTES, 'UTF-8');

$phone = preg_replace('/[^0-9+]/', '', $phone);
if (!preg_match('/^\+[0-9]{7,15}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Некорректный номер телефона']);
    exit;
}

$ip        = getClientIp();
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$nowTs     = time();
$dateRu    = date('d.m.Y H:i', $nowTs);

// ============================================================
//  ЖУРНАЛ ЗАЯВОК (requests.json)
//  Внимание: файл содержит персональные данные —
//  не коммитить в репозиторий и не публиковать.
// ============================================================
$entry = [
    'timestamp'  => date('Y-m-d H:i:s P', $nowTs),
    'unix'       => $nowTs,
    'name'       => $name,
    'phone'      => $phone,
    'message'    => $message,
    'agree'      => $agree,
    'ip'         => $ip,
    'user_agent' => $userAgent,
    'page_url'   => $pageUrl,
];

$logFile = __DIR__ . '/requests.json';
$entries = [];
if (is_readable($logFile)) {
    $existing = file_get_contents($logFile);
    if (!empty($existing)) {
        $decoded = json_decode($existing, true);
        if (is_array($decoded)) $entries = $decoded;
    }
}
$entries[] = $entry;
@file_put_contents($logFile, json_encode($entries, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);

// ============================================================
//  ПИСЬМО ВЛАДЕЛЬЦУ (если почта настроена)
// ============================================================
$mailConfigured = MAIL_TO !== 'CHANGE-ME@example.com';
$sentOwner = true;

if ($mailConfigured) {
    function encodeSubject($subject) {
        return '=?UTF-8?B?' . base64_encode($subject) . '?=';
    }

    $subjectOwner = "✨ Новая заявка на консультацию";
    $messageRu = $message !== '' ? $message : '(не указан)';

    $textOwner =
        "Новая заявка на консультацию!\n\n" .
        "Имя: $name\n" .
        "Телефон: $phone\n" .
        "Запрос: $messageRu\n\n" .
        "IP: $ip\n" .
        "Дата: $dateRu\n" .
        "Страница: $pageUrl\n";

    $headersOwner =
        "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM . ">\r\n" .
        "MIME-Version: 1.0\r\n" .
        "Content-Type: text/plain; charset=UTF-8\r\n" .
        "X-Mailer: PHP/" . PHP_VERSION . "\r\n";

    $sentOwner = @mail(MAIL_TO, encodeSubject($subjectOwner), $textOwner, $headersOwner, '-f' . MAIL_FROM);
}

if (!$sentOwner) {
    error_log('send.php: не удалось отправить письмо владельцу (заявка сохранена в requests.json)');
}

echo json_encode([
    'status'  => 'success',
    'message' => 'Заявка успешно отправлена',
    'mailed'  => $mailConfigured ? (bool)$sentOwner : false,
]);
