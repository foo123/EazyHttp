<?php
// This file allows us to emulate Apache's "mod_rewrite" functionality from the
// built-in PHP web server. This provides a convenient way to test an
// application without having installed a "real" web server software here.
// run as: "php -S localhost:9000 server.php"

$__DIR__ = dirname(__FILE__);

$uri = /*urldecode(*/parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)/*)*/;

if (file_exists($__DIR__ . '/' . $uri)) {
    if ('test.php' === substr($uri, -8))
    {
        include($__DIR__  . '/test.php');
    }
    elseif ('redirect.php' === substr($uri, -12))
    {
        include($__DIR__  . '/redirect.php');
    }
    else
    {
        return false; // existing file, serve as-is
    }
}
else
{
    http_response_code(404);
    echo '404';
}
