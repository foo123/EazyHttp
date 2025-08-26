<?php
include(dirname(__FILE__) . '/../../src/php/EazyHttp.php');

function test()
{
    file_put_contents(dirname(__FILE__).'/test2-curl.php.html', (new EazyHttp())->option('methods', ['curl'])->get('https://github.com/foo123/EazyHttp')->content);
    file_put_contents(dirname(__FILE__).'/test2-file.php.html', (new EazyHttp())->option('methods', ['file'])->get('https://github.com/foo123/EazyHttp')->content);
    file_put_contents(dirname(__FILE__).'/test2-socket.php.html', (new EazyHttp())->option('methods', ['socket'])->get('https://github.com/foo123/EazyHttp')->content);
}

test();