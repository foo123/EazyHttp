<?php
// run "php -S localhost:9000 server.php"
$method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper((string)$_SERVER['REQUEST_METHOD']) : 'GET';

// simulate timeout
$delay = isset($_GET['delay']) ? intval($_GET['delay']) : 5;

sleep($delay);

echo "content after {$delay} seconds";
