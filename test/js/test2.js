"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function file_put_contents(file, content)
    {
        return new Promise(function(resolve, reject) {
            fs.writeFile(file, content, err => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }
    function request(do_http, uri)
    {
        // returns Promise
        return (new EazyHttp()).option('methods', [do_http]).get(uri);
    }

    return request('http', 'https://github.com/foo123/EazyHttp').then(
        (response) => file_put_contents(__dirname+'/test2-http.js.html', response.content)
    ).then(
        () => request('fetch', 'https://github.com/foo123/EazyHttp')
    ).then(
        (response) => file_put_contents(__dirname+'/test2-fetch.js.html', response.content)
    );
}

test().then(() => 1).catch((error) => console.error(error));


