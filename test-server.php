<?php
// This file allows us to emulate Apache's "mod_rewrite" functionality from the
// built-in PHP web server. This provides a convenient way to test an
// application without having installed a "real" web server software here.
// run as: "php -S localhost:9000 test-server.php"

$__DIR__ = dirname(__FILE__);

$uri = /*urldecode(*/parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)/*)*/;

if (file_exists($__DIR__ . '/' . $uri))
{
    $file = basename($uri);
    if (('.php' === substr($file, -4)) && file_exists($__DIR__ . '/test/' . $file))
    {
        // php script
        include($__DIR__ . '/test/' . $file);
    }
    else
    {
        // other resource
        return false; // serve as-is
    }
}
else
{
    // not found
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8', true, 404);
    echo '404';
}
