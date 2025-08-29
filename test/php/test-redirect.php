<?php
// run "php -S localhost:9000 test-server.php"

include(dirname(__FILE__) . '/../../src/php/EazyHttp.php');

function request($do_http, $uri, $follow_redirects)
{
    return (new EazyHttp())
        ->option('methods',     [$do_http])
        ->option('follow_redirects', $follow_redirects)
        ->get('http://localhost:9000' . $uri)
    ;
}
function test()
{
    try {
        $response = request('curl', '/test/redirect.php?max_redirects=2', 3);
        file_put_contents(dirname(__FILE__).'/test-redirect-curl.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('file', '/test/redirect.php?max_redirects=2', 3);
        file_put_contents(dirname(__FILE__).'/test-redirect-file.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('socket', '/test/redirect.php?max_redirects=2', 3);
        file_put_contents(dirname(__FILE__).'/test-redirect-socket.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('curl', '/test/redirect.php?max_redirects=10', 3);
        file_put_contents(dirname(__FILE__).'/test-redirect-max-curl.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('file', '/test/redirect.php?max_redirects=10', 3);
        file_put_contents(dirname(__FILE__).'/test-redirect-max-file.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('socket', '/test/redirect.php?max_redirects=10', 3);
        file_put_contents(dirname(__FILE__).'/test-redirect-max-socket.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }
}

test();
