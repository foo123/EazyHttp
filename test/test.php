<?php
// run "php -S localhost:9000 test-server.php"
$method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper((string)$_SERVER['REQUEST_METHOD']) : 'GET';

header('Content-Type: text/plain; charset=UTF-8', true, 200);
if ('POST' === $method)
{
    setcookie("test_cookie", 'cookie value', time()+3600);  /* expire in 1 hour */
    echo "COOKIE:";
    echo json_encode($_COOKIE)."\n\n";
    echo "POST:";
    echo json_encode($_POST)."\n\n";
    echo "FILES:";
    echo json_encode($_FILES)."\n\n";
}
elseif ('GET' === $method)
{
    setcookie("test_cookie", 'cookie value', time()+3600);  /* expire in 1 hour */
    echo "COOKIE:";
    echo json_encode($_COOKIE)."\n\n";
    echo "GET:";
    echo json_encode($_GET)."\n\n";
}
else
{
    echo "METHOD: $method\n\n";
}
