<?php
// run "php -S localhost:9000 test-server.php"
$method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper((string)$_SERVER['REQUEST_METHOD']) : 'GET';

// simulate redirects
$max_redirects = isset($_GET['max_redirects']) ? intval($_GET['max_redirects']) : 2;
$num_redirects = isset($_GET['redirects']) ? intval($_GET['redirects']) : 0;
if ($num_redirects < $max_redirects)
{
    http_response_code(302);
    // should handle set cookies
    if (0 === $num_redirects)
    {
        setcookie("redirect", 'redirected', time()+3600);  /* expire in 1 hour */
        header('Custom-Redirect: once', true, 302);
    }
    // should handle relative location as well
    header('Content-Type: text/plain; charset=UTF-8', true, 302);
    header('Location: ./redirect.php?redirects='.($num_redirects+1).'&max_redirects='.($max_redirects), true, 302);
}
else
{
    http_response_code(200);
    header('Content-Type: text/plain; charset=UTF-8', true, 200);
    echo "content after {$num_redirects} of {$max_redirects} redirects; cookie 'redirect'=" . (isset($_COOKIE['redirect']) ? '\''.$_COOKIE['redirect'].'\'' : '<none>');
}
