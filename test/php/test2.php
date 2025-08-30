<?php
include(dirname(__FILE__) . '/../../src/php/EazyHttp.php');

function request($do_http, $uri)
{
    return (new EazyHttp())->option('methods', [$do_http])->get($uri);
}
function test()
{
    file_put_contents(dirname(__FILE__).'/test2-curl.php.html', request('curl', 'https://github.com/foo123/EazyHttp')->content);

    file_put_contents(dirname(__FILE__).'/test2-file.php.html', request('file', 'https://github.com/foo123/EazyHttp')->content);

    file_put_contents(dirname(__FILE__).'/test2-socket.php.html', request('socket', 'https://github.com/foo123/EazyHttp')->content);
}

test();