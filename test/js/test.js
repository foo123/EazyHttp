// run "php -S localhost:9000 server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

async function test()
{
    const http = new EazyHttp();
    let response1, response2, response3, response4;

    try {
        response1 = await http.option('return_type','string').get('http://localhost:9000/test.txt');
    } catch (err) {
        response1 = null;
        console.error(err);
    }
    if (response1) fs.writeFile(__dirname+'/test.txt', response1.content, err => {
        if (err) console.error(err);
    });

    try {
        response2 = await http.option('return_type','buffer').get('http://localhost:9000/test.jpg');
    } catch (err) {
        response2 = null;
        console.error(err);
    }
    if (response2) fs.writeFile(__dirname+'/test.jpg', response2.content, err => {
        if (err) console.error(err);
    });

    try {
        response3 = await http.option('return_type','string').get('http://localhost:9000/test.php', {'foo' : 'bar'});
    } catch (err) {
        response3 = null;
        console.error(err);
    }
    if (response3) fs.writeFile(__dirname+'/get-test.php.txt', JSON.stringify(response3), err => {
        if (err) console.error(err);
    });

    try {
        response4 = await http.option('return_type','string').post('http://localhost:9000/test.php', {'foo' : 'bar'});
    } catch (err) {
        response4 = null;
        console.error(err);
    }
    if (response4) fs.writeFile(__dirname+'/post-test.php.txt', JSON.stringify(response4), err => {
        if (err) console.error(err);
    });
}

test().then(() => process.exit());


