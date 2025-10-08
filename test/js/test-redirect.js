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
    function request(do_http, uri, redirects)
    {
        // returns promise
        return (new EazyHttp()).option('methods', [do_http]).option('follow_redirects', redirects).get('http://127.0.0.1:9000' + uri);
    }

    let response;

    try {
        response = await request('http', '/test/redirect.php?max_redirects=2', 3);
        await file_put_contents(__dirname+'/test-redirect-http.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('fetch', '/test/redirect.php?max_redirects=2', 3);
        await file_put_contents(__dirname+'/test-redirect-fetch.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('http', '/test/redirect.php?max_redirects=10', 3);
        await file_put_contents(__dirname+'/test-redirect-max-http.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('fetch', '/test/redirect.php?max_redirects=10', 3);
        await file_put_contents(__dirname+'/test-redirect-max-fetch.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }
}

test().then(() => 1).catch((error) => console.error(error));


