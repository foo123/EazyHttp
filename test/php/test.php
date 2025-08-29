<?php
// run "php -S localhost:9000 test-server.php"

include(dirname(__FILE__) . '/../../src/php/EazyHttp.php');

function request($do_http, $method, $uri, $data = null, $headers = null, $cookies = null, $return_type = 'string')
{
    $http = (new EazyHttp())
        ->option('methods',     [$do_http])
        ->option('return_type', $return_type)
    ;
    return 'POST' === $method ? $http->post('http://localhost:9000' . $uri, $data, $headers, $cookies) : $http->get('http://localhost:9000' . $uri, $data, $headers, $cookies);
}
function test()
{
    try {
        $response = request('curl', 'GET', '/test/test.txt');
        file_put_contents(dirname(__FILE__).'/test-curl.txt', $response->content);
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('file', 'GET', '/test/test.txt');
        file_put_contents(dirname(__FILE__).'/test-file.txt', $response->content);
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('socket', 'GET', '/test/test.txt');
        file_put_contents(dirname(__FILE__).'/test-socket.txt', $response->content);
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('curl', 'GET', '/test/test.jpg');
        file_put_contents(dirname(__FILE__).'/test-curl.jpg', $response->content);
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('file', 'GET', '/test/test.jpg');
        file_put_contents(dirname(__FILE__).'/test-file.jpg', $response->content);
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('socket', 'GET', '/test/test.jpg');
        file_put_contents(dirname(__FILE__).'/test-socket.jpg', $response->content);
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('curl', 'GET', '/test/test.php', ['foo' => ['bar']], [], ['cookie' => 'value']);
        file_put_contents(dirname(__FILE__).'/test-get-curl.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('file', 'GET', '/test/test.php', ['foo' => ['bar']], [], ['cookie' => 'value']);
        file_put_contents(dirname(__FILE__).'/test-get-file.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('socket', 'GET', '/test/test.php', ['foo' => ['bar']], [], ['cookie' => 'value']);
        file_put_contents(dirname(__FILE__).'/test-get-socket.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('curl', 'POST', '/test/test.php', ['foo' => ['bar']], [], ['cookie' => 'value']);
        file_put_contents(dirname(__FILE__).'/test-post-curl.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('file', 'POST', '/test/test.php', ['foo' => ['bar']], [], ['cookie' => 'value']);
        file_put_contents(dirname(__FILE__).'/test-post-file.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }

    try {
        $response = request('socket', 'POST', '/test/test.php', ['foo' => ['bar']], [], ['cookie' => 'value']);
        file_put_contents(dirname(__FILE__).'/test-post-socket.php.txt', json_encode($response));
    } catch (Exception $error) {
        echo (string)$error;
    }
}

test();