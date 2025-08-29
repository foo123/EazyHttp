<?php
// run "php -S localhost:9000 test-server.php"

include(dirname(__FILE__) . '/../../src/php/EazyHttp.php');

function request($do_http, $uri, $timeout)
{
    return (new EazyHttp())
        ->option('methods',     [$do_http])
        ->option('timeout', $timeout)
        ->get('http://localhost:9000' . $uri)
    ;
}
function test()
{
    try {
        $response = request('curl', '/test/timeout.php?delay=2', 5);
        file_put_contents(dirname(__FILE__).'/test-timeout-curl.php.txt', $response->content);
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('file', '/test/timeout.php?delay=2', 5);
        file_put_contents(dirname(__FILE__).'/test-timeout-file.php.txt', $response->content);
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('socket', '/test/timeout.php?delay=2', 5);
        file_put_contents(dirname(__FILE__).'/test-timeout-socket.php.txt', $response->content);
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('curl', '/test/timeout.php?delay=10', 5);
        file_put_contents(dirname(__FILE__).'/test-timeout-max-curl.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('file', '/test/timeout.php?delay=10', 5);
        file_put_contents(dirname(__FILE__).'/test-timeout-max-file.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('socket', '/test/timeout.php?delay=10', 5);
        file_put_contents(dirname(__FILE__).'/test-timeout-max-socket.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }
}

test();