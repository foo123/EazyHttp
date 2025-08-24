EazyHttp
=========

EazyHttp, easy, simple and fast HTTP requests for PHP, JavaScript, Python

(**in progress do not use**)

**supports**

**PHP (in order of priority)**

* `curl` (if available)
* `file_get_contents` (if available)
* `sockets/fsockopen` (if available)

**JavaScript/Browser (in order of priority)**

* `fetch` (if available)
* `xmlhttprequest` (if available)

**JavaScript/Node**

* `http` (if available)

**example**

**PHP**
```php
$http = new EazyHttp();

// HTTP GET request, with custom URL params, custom Headers and custom Cookies
$response = $http->get('https://example.com/', ['foo' => 'bar'], ['User-Agent' => 'EazyHttp'], [['name' => 'a_cookie', 'value' => 'some cookie value']]);

// HTTP POST request, with custom POST data, custom Headers and custom Cookies
$response = $http->post('https://example.com/', ['foo' => 'bar'], ['User-Agent' => 'EazyHttp'], [['name' => 'a_cookie', 'value' => 'some cookie value']]);

print_r($response); // stdClass: {status}, {content}, {headers}, {cookies}
```

**JavaScript (browser and node)**
```js
const http = new EazyHttp();

// HTTP GET request, with custom URL params, custom Headers and custom Cookies
http.get('https://example.com/', {'foo' : 'bar'}, {'User-Agent' : 'EazyHttp'}, [{'name' : 'a_cookie', 'value' : 'some cookie value'}], function(err, response) {
    console.log(response); // Object: {status}, {content}, {headers}, {cookies}
});

// HTTP POST request, with custom POST data, custom Headers and custom Cookies
http.post('https://example.com/', {'foo' : 'bar'}, {'User-Agent' : 'EazyHttp'}, [{'name' : 'a_cookie', 'value' : 'some cookie value'}], function(err, response) {
    console.log(response); // Object: {status}, {content}, {headers}, {cookies}
});
```

