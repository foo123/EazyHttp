// run "php -S localhost:9000 server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function request(uri, do_http, timeout)
    {
        // returns promise
        return (new EazyHttp()).option('methods', [do_http]).option('timeout', timeout).get(uri);
    }
    function write(file, content)
    {
        // promisify
        return new Promise(function(resolve, reject) {
            fs.writeFile(file, content, err => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    return request('http://localhost:9000/timeout.php?delay=2', 'fetch', 5).then(
        (response) => write(__dirname+'/timeout-fetch.php.txt', response.content)
    ).then(
        () => request('http://localhost:9000/timeout.php?delay=2', 'http', 5)
    ).then(
        (response) => write(__dirname+'/timeout-http.php.txt', response.content)
    ).then(
        () => request('http://localhost:9000/timeout.php?delay=10', 'fetch', 5)
    ).then(
        (response) => write(__dirname+'/max-timeout-fetch.php.txt', JSON.stringify(response))
    ).then(
        () => request('http://localhost:9000/timeout.php?delay=10', 'http', 5)
    ).then(
        (response) => write(__dirname+'/max-timeout-http.php.txt', JSON.stringify(response))
    );
}

test().then(() => 1).catch((error) => console.error(error));


