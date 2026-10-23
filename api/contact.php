<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require __DIR__ . '/config.php';

function reply(int $code, array $data): never {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405,['ok'=>false,'message'=>'Method not allowed']);

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);
if (!is_array($data)) reply(400,['ok'=>false,'message'=>'Invalid request']);

if (!empty($data['website'] ?? '')) reply(200,['ok'=>true]); // honeypot

function clean(mixed $v, int $max=500): string {
  $v = trim((string)$v);
  $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u','',$v) ?? '';
  return mb_substr($v,0,$max);
}
$first=clean($data['first_name']??'',80);
$last=clean($data['last_name']??'',80);
$email=clean($data['email']??'',160);
$phone=clean($data['phone']??'',40);
$preferred=clean($data['preferred_contact']??'',30);
$type=clean($data['inquiry_type']??'',80);
$space=clean($data['space']??'',120);
$professional=clean($data['professional']??'',140);
$date=clean($data['date']??'',30);
$guests=clean($data['guests']??'',10);
$start=clean($data['start_time']??'',20);
$end=clean($data['end_time']??'',20);
$message=clean($data['message']??'',4000);

if ($first==='' || $last==='' || $message==='' || !filter_var($email,FILTER_VALIDATE_EMAIL)) {
  reply(422,['ok'=>false,'message'=>'Please complete your name, valid email and message.']);
}

// very lightweight per-IP rate limit
$ip=$_SERVER['REMOTE_ADDR'] ?? 'unknown';
$key=hash('sha256',$ip);
$rl=sys_get_temp_dir().'/visloft_'.substr($key,0,18).'.txt';
$now=time();
if (is_file($rl)) {
  $lastTime=(int)@file_get_contents($rl);
  if ($lastTime && ($now-$lastTime)<20) reply(429,['ok'=>false,'message'=>'Please wait a moment before sending another inquiry.']);
}
@file_put_contents($rl,(string)$now,LOCK_EX);

$record=[
  'timestamp'=>gmdate('c'),'first_name'=>$first,'last_name'=>$last,'email'=>$email,'phone'=>$phone,
  'preferred_contact'=>$preferred,'inquiry_type'=>$type,'space'=>$space,'professional'=>$professional,
  'date'=>$date,'guests'=>$guests,'start_time'=>$start,'end_time'=>$end,'message'=>$message,
  'ip_hash'=>substr($key,0,24)
];

// Backup every valid inquiry to a server-side JSONL file.
$store=dirname(__DIR__).'/data/inquiries.jsonl';
@file_put_contents($store,json_encode($record,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL,FILE_APPEND|LOCK_EX);

if (str_starts_with(VISLOFT_RECIPIENT,'REPLACE-')) {
  reply(503,['ok'=>false,'message'=>'The website form is installed but the Visloft recipient email still needs to be configured.']);
}

$host=preg_replace('/:\d+$/','',$_SERVER['HTTP_HOST']??'');
$from=VISLOFT_FROM_EMAIL;
if ($from==='' && $host && preg_match('/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/',$host)) $from='website@'.preg_replace('/^www\./','',$host);
if ($from==='' || !filter_var($from,FILTER_VALIDATE_EMAIL)) $from=VISLOFT_RECIPIENT;

$subject='New Visloft inquiry — '.($space ?: ($professional ?: $type));
$lines=[
  'NEW VISLOFT WEBSITE INQUIRY','',
  "Name: $first $last","Email: $email","Phone: $phone","Preferred contact: $preferred",
  "Inquiry type: $type","Space: $space","Professional: $professional","Preferred date: $date",
  "Time: $start - $end","Estimated guests: $guests",'',"Message:",$message,'',
  'Submitted: '.date('Y-m-d H:i:s T')
];
$body=implode("\r\n",$lines);
$headers=[
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=UTF-8',
  'From: Visloft Website <'.$from.'>',
  'Reply-To: '.$first.' '.$last.' <'.$email.'>',
  'X-Mailer: PHP/'.phpversion()
];

$sent=@mail(VISLOFT_RECIPIENT,$subject,$body,implode("\r\n",$headers));
if (!$sent) reply(502,['ok'=>false,'message'=>'The inquiry was saved, but email delivery failed. Please contact Visloft directly.']);

if (VISLOFT_SEND_AUTOREPLY) {
  $autoSubject='Visloft Studios — inquiry received';
  $autoBody="Hi $first,\r\n\r\nThanks for contacting Visloft Studios. We received your inquiry and will review availability before confirming next steps.\r\n\r\nThis message does not confirm a booking.\r\n\r\n— Visloft Studios";
  $autoHeaders=['MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','From: Visloft Studios <'.$from.'>'];
  @mail($email,$autoSubject,$autoBody,implode("\r\n",$autoHeaders));
}
reply(200,['ok'=>true]);
