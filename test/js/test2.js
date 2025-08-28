"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function request(uri, do_http)
    {
        // returns Promise
        return (new EazyHttp()).option('methods', [do_http]).get('https://github.com/foo123/EazyHttp');
    }
    function write(file, content)
    {
        return new Promise(function(resolve, reject) {
            fs.writeFile(file, content, err => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    return request('https://github.com/foo123/EazyHttp', 'http').then(
        (response) => write(__dirname+'/test2-http.js.html', response.content)
    ).then(
        () => request('https://github.com/foo123/EazyHttp', 'fetch')
    ).then(
        (response) => write(__dirname+'/test2-fetch.js.html', response.content)
    );
}

test().then(() => 1).catch((error) => console.error(error));


