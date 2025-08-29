<?php
// run "php -S localhost:9000 test-server.php"
set_time_limit(0);
$method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper((string)$_SERVER['REQUEST_METHOD']) : 'GET';

// simulate timeout
$delay = isset($_GET['delay']) ? intval($_GET['delay']) : 5;

sleep($delay);

header('Content-Type: text/plain; charset=UTF-8', true, 200);
echo "content after {$delay} seconds";
