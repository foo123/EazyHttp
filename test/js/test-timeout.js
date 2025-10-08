// run "php -S 127.0.0.1:9000 test-server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

async function test()
{
    function file_put_contents(file, content)
    {
        // promisify
        return new Promise(function(resolve, reject) {
            fs.writeFile(file, content, err => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }
    function request(do_http, uri, timeout)
    {
        // returns promise
        return (new EazyHttp()).option('methods', [do_http]).option('timeout', timeout).get('http://127.0.0.1:9000' + uri);
    }

    let response;

    try {
        response = await request('fetch', '/test/timeout.php?delay=2', 5);
        await file_put_contents(__dirname+'/test-timeout-fetch.php.txt', response.content);
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('http', '/test/timeout.php?delay=2', 5);
        await file_put_contents(__dirname+'/test-timeout-http.php.txt', response.content);
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('fetch', '/test/timeout.php?delay=10', 5);
        await file_put_contents(__dirname+'/test-timeout-max-fetch.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('http', '/test/timeout.php?delay=10', 5);
        await file_put_contents(__dirname+'/test-timeout-max-http.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }
}
test().then(() => 1).catch((error) => console.error(error));


