// run "php -S localhost:9000 test-server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

async function test()
{
    function request(do_http, uri, redirects)
    {
        // returns promise
        return (new EazyHttp()).option('methods', [do_http]).option('follow_redirects', redirects).get('http://localhost:9000' + uri);
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

    let response;

    try {
        response = await request('http', '/test/redirect.php?max_redirects=2', 3);
        await write(__dirname+'/test-redirect-http.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('fetch', '/test/redirect.php?max_redirects=2', 3);
        await write(__dirname+'/test-redirect-fetch.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('http', '/test/redirect.php?max_redirects=10', 3);
        await write(__dirname+'/test-redirect-max-http.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('fetch', '/test/redirect.php?max_redirects=10', 3);
        await write(__dirname+'/test-redirect-max-fetch.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }
}

test().then(() => 1).catch((error) => console.error(error));


