/**
*   EazyHttp
*   easy, simple and fast HTTP requests for PHP, JavaScript, Python
*   @version: 1.0.0
*
*   https://github.com/foo123/EazyHttp
**/
!function(root, name, factory) {
"use strict";
var m;
if (('object' === typeof module) && module.exports) /* CommonJS */
    module.exports = factory.call(root);
else if (('function' === typeof(define)) && define.amd && ('function' === typeof(require)) && ('function' === typeof(require.specified)) && require.specified(name)) /* AMD */
    define(name,['require','exports','module'],function() {return factory.call(root);});
else if (!(name in root)) /* Browser/WebWorker/.. */
    (root[name] = (m=factory.call(root))) && ('function' === typeof(define)) && define.amd && define(function() {return m;});
}(/* current root */          'undefined' !== typeof self ? self : this,
  /* module name */           "EazyHttp",
  /* module factory */        function(undef) {
"use strict";

var VERSION = '1.0.0',

    PROTO = 'prototype',
    HAS = Object[PROTO].hasOwnProperty,
    toString = Object[PROTO].toString,

    isNode = ('undefined' !== typeof(global)) && ('[object Global]' === toString.call(global)),

    http = isNode ? require('http') : null,
    https = isNode ? require('https') : null,

    ID = 0
;

function EazyHttp()
{
    var self = this;
    self.opts = {};
    // some defaults
    self.option('timeout',          30); // sec, default
    self.option('follow_redirects', 3); // default
    self.option('return_type',      'string'); // default
    self.option('methods',          ['http', 'fetch', 'xhr', 'iframe']); // default
}
EazyHttp[PROTO] = {
    constructor: EazyHttp,

    opts: null,
    option: function(key, val) {
        var nargs = arguments.length;
        if (1 == nargs)
        {
            return HAS.call(this.opts, key) ? this.opts[key] : undef;
        }
        else if (1 < nargs)
        {
            this.opts[key] = val;
        }
        return this;
    },

    get: function(uri, data, headers, cookies, cb) {
        var self = this;
        if ((null == cb) && ('undefined' !== typeof(Promise)))
        {
            // promisify
            return new Promise(function(resolve, reject) {
                self._do_http('GET', uri, data, headers, cookies, function(error, response) {
                    if (error) reject(error);
                    else resolve(response);
                });
            });
        }
        else
        {
            self._do_http('GET', uri, data, headers, cookies, cb);
            return self;
        }
    },

    post: function(uri, data, headers, cookies, cb) {
        var self = this;
        if ((null == cb) && ('undefined' !== typeof(Promise)))
        {
            // promisify
            return new Promise(function(resolve, reject) {
                self._do_http('POST', uri, data, headers, cookies, function(error, response) {
                    if (error) reject(error);
                    else resolve(response);
                });
            });
        }
        else
        {
            self._do_http('POST', uri, data, headers, cookies, cb);
            return self;
        }
    },

    _do_http: function(method, uri, data, headers, cookies, cb)  {
        var self = this, hs, name, methods, i, n,
            send_method, do_http = null, cb_called = false;

        // for POST files user can pass the multipart encoded data and set Content-Type
        // binary data are passed as Buffers/Uint8 and set appropriate Content-Type
        // for PUT, PATCH and DELETE methods code is ready
        method = String(method).toUpperCase();
        if (!('POST' === method || 'PUT' === method || 'PATCH' === method)) method = 'GET';

        if (!headers || !is_obj(headers)) headers = {};
        if (!cookies || !is_array(cookies)) cookies = [];

        hs = headers; headers = {};
        for (name in hs)
        {
            if (HAS.call(hs, name))
            {
                headers[ucwords(trim(name).toLowerCase())] = hs[name];
            }
        }
        headers = extend({'User-Agent': 'EazyHttp', 'Accept': '*/*'}, headers);
        if (!('POST' === method || 'PUT' === method || 'PATCH' === method))
        {
            uri += is_obj(data) ? ((-1 === uri.indexOf('?') ? '?' : '&') + http_build_query(data, '&')) : '';
            data = null;
        }

        methods = self.option('methods');
        if (is_array(methods) && methods.length)
        {
            for (i=0,n=methods.length; i<n; ++i)
            {
                send_method = String(methods[i]).toLowerCase();
                if (
                    ('http' === send_method)
                    && isNode
                    && (https && http)
                )
                {
                    do_http = 'node';
                    break;
                }
                else if (
                    ('fetch' === send_method)
                    && !isNode
                    && ('undefined' !== typeof(fetch))
                )
                {
                    do_http = 'fetch';
                    break;
                }
                else if (
                    ('xhr' === send_method)
                    && !isNode
                    && (
                        ('undefined' !== typeof(XMLHttpRequest))
                        || ('undefined' !== typeof(ActiveXObject))
                    )
                )
                {
                    do_http = 'xhr';
                    break;
                }
                else if (
                    ('iframe' === send_method)
                    && !isNode
                    && (
                        ('undefined' !== typeof(document))
                        && (document.body)
                        && ('function' === typeof(document.createElement))
                    )
                )
                {
                    do_http = 'iframe';
                    break;
                }
            }
            if (do_http)
            {
                self['_do_http_' + do_http](
                    method,
                    uri,
                    format_data(method, do_http, data, headers),
                    headers,
                    cookies,
                    function(error, response) {
                        if (cb_called) return;
                        cb_called = true;
                        if (is_callable(cb)) cb(error, response);
                    }
                );
            }
        }
        if (!do_http && is_callable(cb))
        {
            cb(new EazyHttpException('No request made'), {
                status  : 0,
                content : false,
                headers : {},
                cookies : []
            });
        }
        do_http = null;
    },

    _do_http_node: function(method, uri, data, headers, cookies, cb) {
        var self = this, do_request,
            timeout = parseInt(self.option('timeout')),
            follow_redirects = +(self.option('follow_redirects')),
            return_type = String(self.option('return_type')).toLowerCase();

        headers = format_http_cookies(cookies, headers);

        do_request = function(uri, redirect) {
            var request = null, error = null, opts,
                parts, protocol, host, port, path, query,
                abort_on_redirect = null;
            if (redirect > follow_redirects)
            {
                cb(new EazyHttpException('Too many redirects'), {
                    status  : 0,
                    content : false,
                    headers : {},
                    cookies : []
                });
                return;
            }
            parts = parse_url(uri);
            host = parts['host'];
            if (!host || !host.length)
            {
                cb(new EazyHttpException('No host'), {
                    status  : 0,
                    content : false,
                    headers : {},
                    cookies : []
                });
                return;
            }
            protocol = (null != parts['scheme']) ? parts['scheme'].toLowerCase() : 'http';
            port = (null != parts['port']) ? +parts['port'] : ('https' === protocol ? 443 : 80);
            path = (null != parts['path']) ? parts['path'] : '/';
            if (!path.length) path = '/';
            path += (null != parts['query']) && parts['query'].length ? ('?' + parts['query']) : '';

            opts = {
                'method'    : method,
                'protocol'  : protocol + ':',
                'host'      : host,
                'port'      : port,
                'path'      : path,
                'headers'   : headers,
                'timeout'   : 1000*timeout // ms
            };
            /*if ('undefined' !== typeof(AbortController))
            {
                abort_on_redirect = new AbortController();
                opts['signal'] = abort_on_redirect.signal;
            }*/

            try {
                request = ('https' === protocol ? https : http).request(opts);
            } catch (e) {
                request = null;
                error = e;
            }
            if (request)
            {
                request.on('response', function(response) {
                    var m, status = +response.statusCode, body,
                        received_headers = parse_http_header(response.headers),
                        received_cookies = parse_http_cookies(received_headers);

                    if ((0 < follow_redirects) && (301 <= status && status <= 308) && (received_headers['location']) && (m=received_headers['location'][0].match(/^\s*(\S+)/i)) && (uri !== m[1]))
                    {
                        //abort_on_redirect.abort(new EazyHttpException('redirected'));
                        request.abort();
                        request.destroy();
                        do_request(m[1], redirect+1);
                    }
                    else
                    {
                        body = [];
                        response.on('data', function(chunk) {
                            body.push('buffer' === return_type ? Buffer.from(chunk) : chunk);
                        });
                        response.on('end', function() {
                            cb(null, {
                                status  : status,
                                content : 'buffer' === return_type ? (Buffer.concat(body)) : (body.join('')),
                                headers : received_headers,
                                cookies : received_cookies
                            });
                        });
                    }
                });
                request.on('timeout', function() {
                    cb(new EazyHttpException('Request timeout after '+timeout+' secs'), {
                        status  : 0,
                        content : false,
                        headers : {},
                        cookies : []
                    });
                });
                request.on('error', function(error) {
                    //if ('redirected' === error.message) return;
                    cb(error, {
                        status  : 0,
                        content : false,
                        headers : {},
                        cookies : []
                    });
                });
                if ('POST' === method || 'PUT' === method || 'PATCH' === method) request.write(data);
                request.end();
            }
            else
            {
                cb(error || new EazyHttpException('No http request'), {
                    status  : 0,
                    content : false,
                    headers : {},
                    cookies : []
                });
            }
        };
        do_request(uri, 0);
    },

    _do_http_fetch: function(method, uri, data, headers, cookies, cb) {
        var self = this, do_request,
            timeout = parseInt(self.option('timeout')),
            follow_redirects = +(self.option('follow_redirects')),
            return_type = String(self.option('return_type')).toLowerCase();

        headers = format_http_cookies(cookies, headers);

        do_request = function(uri, redirect) {
            var request = null, error = null, done = false,
                on_timeout = null, abort_on_timeout = null, opts;
            if (redirect > follow_redirects)
            {
                cb(new EazyHttpException('Too many redirects'), {
                    status  : 0,
                    content : false,
                    headers : {},
                    cookies : []
                });
                return;
            }
            opts = {
                'method'    : method,
                'headers'   : headers,
                'redirect'  : 0 < follow_redirects ? 'follow' : 'manual',
                'keepalive' : false
            };
            if ('POST' === method || 'PUT' === method || 'PATCH' === method) opts['body'] = data;
            if ('undefined' !== typeof(AbortController))
            {
                abort_on_timeout = new AbortController();
                opts['signal'] = abort_on_timeout.signal;
            }

            try {
                request = fetch(uri, opts);
            } catch (e) {
                request = null;
                error = e;
            }
            if (request)
            {
                on_timeout = setTimeout(function() {
                    if (!done)
                    {
                        abort_on_timeout.abort();
                    }
                }, 1000*timeout); // ms
                request.then(function(response) {
                    var m, status = +response.status, body,
                        received_headers = parse_http_header(response.headers),
                        received_cookies = parse_http_cookies(received_headers);

                    done = true;
                    if (on_timeout) clearTimeout(on_timeout);
                    on_timeout = null;

                    /*if ((0 < follow_redirects) && (301 <= status && status <= 308) && (received_headers['location']) && (m=received_headers['location'][0].match(/^\s*(\S+)/i)) && (uri !== m[1]))
                    {
                        // does not work, response.redirected is after the fact and inaccessible
                        do_request(m[1], redirect+1);
                    }
                    else
                    {*/
                        body = 'buffer' === return_type ? response.arrayBuffer() : response.text();
                        body.then(function(content) {
                            cb(null, {
                                status  : status,
                                content : content,
                                headers : received_headers,
                                cookies : received_cookies
                            });
                        }).catch(function(error) {
                            cb(error, {
                                status  : 0,
                                content : false,
                                headers : {},
                                cookies : []
                            });
                        });
                    /*}*/
                }).catch(function(error) {
                    done = true;
                    if (on_timeout) clearTimeout(on_timeout);
                    on_timeout = null;

                    cb(error, {
                        status  : 0,
                        content : false,
                        headers : {},
                        cookies : []
                    });
                });
            }
            else
            {
                cb(error || new EazyHttpException('No fetch request'), {
                    status  : 0,
                    content : false,
                    headers : {},
                    cookies : []
                });
            }
        };
        do_request(uri, 0);
    },

    _do_http_xhr: function(method, uri, data, headers, cookies, cb) {
        var self = this, xhr = null, error = null,
            timeout = parseInt(self.option('timeout')),
            follow_redirects = +(self.option('follow_redirects')),
            return_type = String(self.option('return_type')).toLowerCase();
        try {
            xhr = 'undefined' !== typeof(XMLHttpRequest) ? (new XMLHttpRequest()) : (new ActiveXObject('Microsoft.XMLHTTP'));
        } catch (e) {
            xhr = null;
            error = e;
        }
        if (xhr)
        {
            //xhr.onreadystatechange
            // (2 /*HEADERS_RECEIVED*/ === xhr.readyState)
            // (3 /*LOADING*/ === xhr.readyState)
            // (4 /*DONE*/ === xhr.readyState)
            xhr.ontimeout = function() {
                cb(new EazyHttpException('Request timeout after '+timeout+' secs'), {
                    status  : 0,
                    content : false,
                    headers : {},
                    cookies : []
                });
            };
            xhr.onerror = function() {
                cb(new EazyHttpException('Request error'), {
                    status  : 0,
                    content : false,
                    headers : {},
                    cookies : []
                });
            };
            xhr.onload = function() {
                if (4/*DONE*/ === xhr.readyState)
                {
                    var status = +xhr.status,
                        content = 'buffer' === return_type ? (new Uint8Array(xhr.response)) : xhr.responseText,
                        received_headers = parse_http_header(xhr.getAllResponseHeaders()),
                        received_cookies = parse_http_cookies(received_headers);
                    cb(null, {
                        status  : status,
                        content : content,
                        headers : received_headers,
                        cookies : received_cookies
                    });
                }
                else
                {
                    cb(new EazyHttpException('Request incomplete'), {
                        status  : 0,
                        content : false,
                        headers : {},
                        cookies : []
                    });
                }
            };
            xhr.responseType = 'buffer' === return_type ? 'arraybuffer' : 'text';
            xhr.timeout = 1000*timeout; // ms
            xhr.open(method, uri, true/*, user, pass*/);  // 'true' makes the request asynchronous
            headers = format_http_cookies(cookies, headers);
            for (var name in headers)
            {
                if (HAS.call(headers, name))
                {
                    try {
                    xhr.setRequestHeader(name, headers[name]);
                    } catch (e) {
                    /*pass*/
                    }
                }
            }
            xhr.send(data);
        }
        else
        {
            cb(error || new EazyHttpException('No XMLHttpRequest request'), {
                status  : 0,
                content : false,
                headers : {},
                cookies : []
            });
        }
    },

    _do_http_iframe: function(method, uri, data, headers, cookies, cb) {
        var self = this, form = null, iframe = null, error = null, uid,
            timeout = parseInt(self.option('timeout')),
            follow_redirects = +(self.option('follow_redirects')),
            return_type = String(self.option('return_type')).toLowerCase(),
            on_timeout = null, finish = null, done = false;
        try {
            form = document.createElement('form');
            iframe = document.createElement('iframe');
        } catch (e) {
            form = null;
            iframe = null;
            error = e;
        }
        if (form && iframe)
        {
            finish = function() {
                if (iframe)
                {
                    iframe.onload = iframe.onerror = null;
                    iframe.remove();
                    iframe = null;
                }
                if (form)
                {
                    form.remove();
                    form = null;
                }
            };
            on_timeout = setTimeout(function() {
                if (!done)
                {
                    finish();
                    cb(new EazyHttpException('Request timeout after '+timeout+' secs'), {
                        status  : 0,
                        content : false,
                        headers : {},
                        cookies : []
                    });
                }
            }, 1000*timeout); // ms

            iframe.onerror = function() {
                done = true;
                if (on_timeout) clearTimeout(on_timeout);
                on_timeout = null;

                cb(new EazyHttpException('Request error'), {
                    status  : 0,
                    content : false,
                    headers : {},
                    cookies : []
                });
            };
            iframe.onload = function() {
                done = true;
                if (on_timeout) clearTimeout(on_timeout);
                on_timeout = null;

                var doc = iframe.contentDocument || iframe.contentWindow.document,
                    content = (doc && doc.body ? doc.body.innerHTML : '') || '',
                    received_headers = doc && doc.contentType ? {'content-type': [doc.contentType + (doc.characterSet ? '; charset=' + doc.characterSet : '')]} : {},
                    received_cookies = doc && doc.cookie && doc.cookie.length ? doc.cookie.split(';').map(function(cookie) {return parse_cookie(cookie, false, true);}) : [];

                finish();

                cb(null, {
                    status  : 200,
                    content : content,
                    headers : received_headers,
                    cookies : received_cookies
                });
            };
            uid = String(++ID) + '_' + Date.now();
            iframe.id = '_eazy_http_iframe_' + uid;
            iframe.name = iframe.id;
            iframe.style.height = '0px';
            iframe.style.width = '0px';
            iframe.style.overflow = 'hidden';
            form.id = '_eazy_http_form_' + uid;
            form.style.height = '0px';
            form.style.width = '0px';
            form.style.overflow = 'hidden';
            form.action = uri;
            form.method = method;
            form.enctype = /*HAS.call(headers, 'Content-Type') ? headers['Content-Type'] : */'application/x-www-form-urlencoded';
            form.target = iframe.id;
            if (is_obj(data))
            {
                data = flatten(data, {});
                array_keys(data).forEach(function(key) {
                    var input, value = data[key];
                    if (("undefined" !== typeof(File)) && (value instanceof File))
                    {
                        // File
                        if ("undefined" !== typeof(DataTransfer))
                        {
                            var dt = new DataTransfer();
                            dt.items.add(value);
                            input = document.createElement('input');
                            input.type = 'file';
                            input.name = key;
                            input.files = dt.files;
                            form.enctype = 'multipart/form-data';
                        }
                        else
                        {
                            // bypass
                            return;
                        }
                    }
                    else
                    {
                        // default
                        input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = key;
                        input.value = String(value);
                    }
                    form.appendChild(input);
                });
            }
            document.body.appendChild(form);
            document.body.appendChild(iframe);
            try {
                form.submit();
            } catch (e) {
                error = e;
            }
            if (error)
            {
                finish();
                cb(error || new EazyHttpException('Form submit failed'), {
                    status  : 0,
                    content : false,
                    headers : {},
                    cookies : []
                });
            }
        }
        else
        {
            cb(error || new EazyHttpException('No iframe request'), {
                status  : 0,
                content : false,
                headers : {},
                cookies : []
            });
        }
    }
};
function EazyHttpException(message)
{
    Error.call(this, message);
    this.name = 'EazyHttpException';
}
EazyHttpException[PROTO] = Object.create(Error[PROTO]);
EazyHttpException[PROTO].constructor = EazyHttpException;
EazyHttp.Exception = EazyHttpException;

// utils ---------------------------------
function format_data(method, do_http, data, headers)
{
    if ('POST' === method || 'PUT' === method || 'PATCH' === method)
    {
        if (isNode)
        {
            if (is_string(data))
            {
                // String
                /*pass*/
            }
            else if (("undefined" !== typeof(Buffer)) && (data instanceof Buffer))
            {
                // Buffer
                /*pass*/
            }
            else if (("undefined" !== typeof(Uint8Array)) && (data instanceof Uint8Array))
            {
                // TypedArray
                /*pass*/
            }
            else if (is_obj(data))
            {
                data = http_build_query(data, '&');
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            else
            {
                data = '';
            }
        }
        else
        {
            if (is_string(data))
            {
                // String
                /*pass*/
            }
            else if (("undefined" !== typeof(FormData)) && (data instanceof FormData))
            {
                // FormData
                /*pass*/
            }
            else if (("undefined" !== typeof(URLSearchParams)) && (data instanceof URLSearchParams))
            {
                // URLSearchParams
                /*pass*/
            }
            else if (("undefined" !== typeof(File)) && (data instanceof File))
            {
                // File
                /*pass*/
            }
            else if (("undefined" !== typeof(Blob)) && (data instanceof Blob))
            {
                // Blob
                /*pass*/
            }
            else if (("undefined" !== typeof(ReadableStream)) && (data instanceof ReadableStream))
            {
                // ReadableStream
                /*pass*/
            }
            else if (("undefined" !== typeof(DataView)) && (data instanceof DataView))
            {
                // DataView
                /*pass*/
            }
            else if (("undefined" !== typeof(ArrayBuffer)) && (data instanceof ArrayBuffer))
            {
                // ArrayBuffer
                /*pass*/
            }
            else if (data && data.buffer && ("undefined" !== typeof(ArrayBuffer)) && (data.buffer instanceof ArrayBuffer))
            {
                // TypedArray
                /*pass*/
            }
            else if (is_obj(data))
            {
                if ('iframe' !== do_http) data = http_build_query(data, '&');
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            else
            {
                data = '';
            }
        }
        return data;
    }
    return null;
}
function parse_http_header(responseHeader)
{
    var responseHeaders = {}, name, lines, parts, line, i, n;
    // return lowercase headers as in spec
    if ("undefined" !== typeof(Headers) && (responseHeader instanceof Headers))
    {
        responseHeader.forEach(function(value, name) {
            name = /*ucwords(*/trim(name).toLowerCase()/*, '-')*/;
            if (HAS.call(responseHeaders, name)) responseHeaders[name].push(trim(value));
            else responseHeaders[name] = [trim(value)];
        });
    }
    else if (is_obj(responseHeader))
    {
        for (name in responseHeader)
        {
            if (HAS.call(responseHeader, name))
            {
                name = /*ucwords(*/trim(name).toLowerCase()/*, '-')*/;
                if (HAS.call(responseHeaders, name)) responseHeaders[name].push(trim(value));
                else responseHeaders[name] = [trim(value)];
            }
        }
    }
    else
    {
        if (is_string(responseHeader)) responseHeader = responseHeader.split(/[\r\n]+/g);
        if (is_array(responseHeader) && responseHeader.length)
        {
            for (i=0,n=responseHeader.length; i<n; ++i)
            {
                line = responseHeader[i];
                if (trim(line).length)
                {
                    parts = line.split(':', 2);
                    if (parts.length > 1)
                    {
                        name = /*ucwords(*/trim(parts[0]).toLowerCase()/*, '-')*/;
                        if (HAS.call(responseHeaders, name)) responseHeaders[name].push(trim(parts[1]));
                        else responseHeaders[name] = [trim(parts[1])];
                    }
                }
            }
        }
    }
    return responseHeaders;
}
function parse_http_cookies(responseHeaders)
{
    var cookies = [], cookie, i, n;
    if (responseHeaders && is_array(responseHeaders['set-cookie']) && responseHeaders['set-cookie'].length)
    {
        for (i=0,n=responseHeaders['set-cookie'].length; i<n; ++i)
        {
            cookie = parse_cookie(responseHeaders['set-cookie'][i]);
            if (is_obj(cookie)) cookies.push(cookie);
        }
    }
    return cookies;
}
function format_http_cookies(cookies, headers)
{
    if (is_array(cookies) && cookies.length)
    {
        for (var i=0,n=cookies.length,cookie_str,valid_cookies=[]; i<n; ++i)
        {
            if (is_obj(cookies[i]))
            {
                cookie_str = format_cookie(cookies[i], false);
                if (cookie_str.length)
                {
                    valid_cookies.push(cookie_str);
                }
            }
        }
        if (valid_cookies.length)
        {
            headers['Cookie'] = (HAS.call(headers, 'Cookie') ? (String(headers['Cookie']) + '; ') : '') + valid_cookies.join('; ');
        }
    }
    return headers;
}
function parse_cookie(str, isRaw, nameValueOnly)
{
    var cookie, parts, part, i, n, name, value, data;
    cookie = {};

    parts = String(str).split(';');
    for (i=0,n=parts.length; i<n; ++i) parts[i] = parts[i].split('=', 2);

    part = parts.shift();
    name = !isRaw ? urldecode(trim(part[0])) : trim(part[0]);
    value = (null != part[1]) ? (!isRaw ? urldecode(trim(part[1])) : trim(part[1])) : null;
    cookie['name'] = name;
    cookie['value'] = value;
    if (nameValueOnly) return cookie;

    data = {
        'isRaw' : isRaw,
        'expires' : 0,
        'path' : '/',
        'domain' : null,
        'secure' : false,
        'httponly' : false,
        'samesite' : null,
        'partitioned' : false
    };
    for (i=0,n=parts.length; i<n; ++i)
    {
        part = parts[i];
        name = trim(part[0]).toLowerCase();
        value = (null != part[1]) ? trim(part[1]) : true;
        data[name] = value;
    }
    cookie = extend(cookie, data);

    cookie['expires'] = new Date(/^[0-9]+$/.test(cookie['expires']) ? (1000*parseInt(cookie['expires'])) : cookie['expires']);

    if ((null != cookie['max-age']) && ((+cookie['max-age']) > 0 || cookie['expires'].getTime() > Date.now()))
    {
        cookie['expires'] = new Date(Date.now() + 1000*parseInt(cookie['max-age']));
    }

    return cookie;
}
function format_cookie(cookie, toSet)
{
    var RESERVED_CHARS_LIST = "=,; \t\r\n\v\f",
        RESERVED_CHARS_FROM = ['=', ',', ';', ' ', "\t", "\r", "\n", "\v", "\f"],
        RESERVED_CHARS_TO = ['%3D', '%2C', '%3B', '%20', '%09', '%0D', '%0A', '%0B', '%0C'],
        isRaw, str;

    if ((null == cookie) || !is_obj(cookie)) return '';

    if ((null == cookie['name'])) return '';

    isRaw = (true === cookie['isRaw']);

    str = '';

    if (isRaw)
    {
        str = String(cookie['name']);
    }
    else
    {
        str = str_replace(RESERVED_CHARS_FROM, RESERVED_CHARS_TO, String(cookie['name']));
    }

    str += '=';

    if (null == cookie['value'] || !String(cookie['value']).length)
    {
        if (toSet)
        {
            str += 'deleted; Expires='+(new Date(Date.now() - 1000*31536001)).toUTCString()+'; Max-Age=0';
        }
        else
        {
            return '';
        }
    }
    else
    {
        str += isRaw ? String(cookie['value']) : rawurlencode(String(cookie['value']));
        if (toSet)
        {
            if (!(cookie['expires'] instanceof Date)) cookie['expires'] = new Date();
            str += '; Expires='+cookie['expires'].toUTCString()+'; Max-Age='+Math.max(0, cookie['expires'].getTime()-Date.now());
        }
    }

    if (toSet)
    {
        if ((null != cookie['path']))
        {
            str += '; Path='+cookie['path'];
        }

        if ((null != cookie['domain']))
        {
            str += '; Domain='+cookie['domain'];
        }

        if (cookie['secure'])
        {
            str += '; Secure';
        }

        if (cookie['httponly'])
        {
            str += '; HttpOnly';
        }

        if ((null != cookie['samesite']))
        {
            str += '; SameSite='+cookie['samesite'];
        }

        if (cookie['partitioned'])
        {
            str += '; Partitioned';
        }
    }

    return str;
}
function is_string(x)
{
    return ('[object String]' === toString.call(x)) || ('string' === typeof(x));
}
function is_array(x)
{
    return '[object Array]' === toString.call(x);
}
function is_obj(x)
{
    return '[object Object]' === toString.call(x);
}
function is_number(x)
{
    return ('number' === typeof(x)) || (x instanceof Number);
}
function is_callable(x)
{
    return 'function' === typeof(x);
}
function array_keys(o)
{
    if ('function' === typeof Object.keys)
    {
        return Object.keys(o);
    }
    var v, k, l;
    if (is_array(o))
    {
        v = new Array(l=o.length);
        for (k=0; k<l; ++k)
        {
            v[k] = String(k);
        }
    }
    else
    {
        v = [];
        for (k in o)
        {
            if (HAS.call(o, k))
                v.push(k);
        }
    }
    return v;
}
function array_values(o)
{
    if (is_array(o)) return o;
    if ('function' === typeof Object.values)
    {
        return Object.values(o);
    }
    var v = [], k;
    for (k in o)
    {
        if (HAS.call(o, k))
            v.push(o[k]);
    }
    return v;
}
function is_numeric_array(o)
{
    if (is_array(o)) return true;
    if (is_obj(o))
    {
        var k = array_keys(o), i, l = k.length;
        for (i=0; i<l; ++i)
        {
            if (i !== +k[i]) return false;
        }
        return true;
    }
    return false;
}
function extend(o1, o2, deep)
{
    var k, v;
    deep = true === deep;
    if (o2)
    {
        for (k in o2)
        {
            if (!HAS.call(o2,k)) continue;
            v = o2[k];
            if (is_number(v)) o1[k] = 0+v;
            else if (is_string(v)) o1[k] = v.slice();
            else if (is_array(v)) o1[k] = deep ? extend(v.length ? new Array(v.length) : [], v, deep) : v;
            else if (is_obj(v)) o1[k] = deep ? extend({}, v, deep) : v;
            else o1[k] = v;
        }
    }
    return o1;
}
var trim = String[PROTO].trim ? function(s) {return s.trim();} : function(s) {return s.replace(/^\s+|\s+$/g, '');};
function ucwords(str, sep)
{
    var words = String(str).split(sep), i, n;
    str = '';
    for (i=0,n=words.length; i<n; ++i)
    {
        str += words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    return str;
}
function str_replace(from, to, str)
{
    for (var i=0,n=from.length; i<n; ++i)
    {
        str = str.split(from[i]).join(to[i]);
    }
    return str;
}
function rawurldecode(str)
{
    return decodeURIComponent(String(str));
}
function rawurlencode(str)
{
    return encodeURIComponent(String(str))
        .split('!').join('%21')
        .split("'").join('%27')
        .split('(').join('%28')
        .split(')').join('%29')
        .split('*').join('%2A')
        //.split('~').join('%7E')
    ;
}
function urldecode(str)
{
    return rawurldecode(String(str).split('+').join('%20'));
}
function urlencode(str)
{
    return rawurlencode(str).split('%20').join('+');
}
// adapted from https://github.com/kvz/phpjs
var uriParser = {
        php: /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/\/?)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // Added one optional slash to post-scheme to catch file:/// (should restrict this)
    },
    uriComponent = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment']
;
function parse_url(str, component, mode)
{
    var uri = null, m, i;
    if ('undefined' !== typeof(URL))
    {
        try {
            m = new URL(str);
        } catch (e) {
            m = null;
        }
        if (m)
        {
            uri = {};
            if (m.protocol) uri['scheme'] = m.protocol.slice(0, -1);
            if (m.username) uri['user'] = m.username;
            if (m.password) uri['pass'] = m.password;
            if (m.hostname) uri['host'] = m.hostname;
            if (m.port && m.port.length) uri['port'] = m.port;
            if (m.pathname && m.pathname.length) uri['path'] = m.pathname;
            else uri['path'] = '';
            if (m.search && m.search.length) uri['query'] = m.search.slice(1);
            else uri['query'] = '';
            if (m.hash && m.hash.length) uri['fragment'] = m.hash.slice(1);
            else uri['fragment'] = '';
        }
    }
    if (!uri)
    {
        m = uriParser[mode || 'php'].exec(str);
        i = uriComponent.length;
        uri = {};
        while (i--) if (i && m[i]) uri[uriComponent[i]] = m[i];
    }
    if (HAS.call(uri, 'port')) uri['port'] = parseInt(uri['port'], 10);

    if (component)
    {
        return uri[component.replace('PHP_URL_', '').toLowerCase()] || null;
    }

    return uri;
}
function parse_str(str)
{
    /*if ('undefined' !== typeof(URLSearchParams))
    {
        // NOTE: nesting is not supported
        var params;
        try {
            params = new URLSearchParams(str);
        } catch (e) {
            params = null;
        }
        if (params) return params;
    }*/

    var strArr = str.replace(/^&+|&+$/g, '').split('&'),
        sal = strArr.length,
        i, j, ct, p, lastObj, obj, chr, tmp, key, value,
        postLeftBracketPos, keys, keysLen, lastkey,
        array = {}, possibleLists = [], prevkey, prevobj
    ;

    for (i=0; i<sal; ++i)
    {
        tmp = strArr[i].split('=');
        key = rawurldecode(trim(tmp[0]));
        value = (tmp.length < 2) ? '' : rawurldecode(trim(tmp[1]));

        j = key.indexOf('\x00');
        if (j > -1) key = key.slice(0, j);

        if (key && ('[' !== key.charAt(0)))
        {
            keys = [];

            postLeftBracketPos = 0;
            for (j=0; j<key.length; ++j)
            {
                if (('[' === key.charAt(j)) && !postLeftBracketPos)
                {
                    postLeftBracketPos = j + 1;
                }
                else if (']' === key.charAt(j))
                {
                    if (postLeftBracketPos)
                    {
                        if (!keys.length)
                        {
                            keys.push(key.slice(0, postLeftBracketPos - 1));
                        }
                        keys.push(key.substr(postLeftBracketPos, j - postLeftBracketPos));
                        postLeftBracketPos = 0;
                        if ('[' !== key.charAt(j + 1)) break;
                    }
                }
            }

            if (!keys.length) keys = [key];

            for (j=0; j<keys[0].length; ++j)
            {
                chr = keys[0].charAt(j);
                if (' ' === chr || '.' === chr || '[' === chr)
                {
                    keys[0] = keys[0].substr(0, j) + '_' + keys[0].substr(j + 1);
                }
                if ('[' === chr) break;
            }

            obj = array; key = null; lastObj = obj;
            lastkey = keys.length ? trim(keys[ keys.length-1 ].replace(/^['"]|['"]$/g, '')) : null;
            for (j=0, keysLen=keys.length; j<keysLen; ++j)
            {
                prevkey = key;
                key = keys[j].replace(/^['"]|['"]$/g, '');
                prevobj = lastObj;
                lastObj = obj;

                if ('' !== trim(key) || 0 === j)
                {
                    if (!HAS.call(obj, key)) obj[key] = (j+1 === keysLen-1) && (''===lastkey) ? [] : {};
                    obj = obj[key];
                }
                else
                {
                    // To insert new dimension
                    /*ct = -1;
                    for (p in obj)
                    {
                        if (HAS.call(obj,p))
                        {
                            if (+p > ct && p.match(/^\d+$/g))
                            {
                                ct = +p;
                            }
                        }
                    }
                    key = ct + 1;*/
                    key = true;
                }
            }
            if (true === key)
            {
                lastObj.push(value);
            }
            else
            {
                if (key == +key)
                    possibleLists.push({key:prevkey, obj:prevobj});
                lastObj[key] = value;
            }
        }
    }
    for (i=possibleLists.length-1; i>=0; --i)
    {
        // safe to pass multiple times same obj, it is possible
        obj = possibleLists[i].key ? possibleLists[i].obj[possibleLists[i].key] : possibleLists[i].obj;
        if (is_numeric_array(obj))
        {
            obj = array_values(obj);
            if (possibleLists[i].key)
                possibleLists[i].obj[possibleLists[i].key] = obj;
            else
                array = obj;
        }
    }
    return array;
}
function flatten(input, output, prefix)
{
    if (is_obj(input) || is_array(input))
    {
        for (var k=array_keys(input),i=0,n=k.length; i<n; ++i)
        {
            var key = k[i], val = input[key],
                name = String((null == prefix) ? key : (prefix+'['+key+']'));

            if (is_obj(val) || is_array(val)) output = flatten(val, output, name);
            else output[name] = val;
        }
        return output;
    }
    return input;
}
function http_build_query_helper(key, val, arg_separator, PHP_QUERY_RFC3986)
{
    var k, tmp, encode = PHP_QUERY_RFC3986 ? rawurlencode : urlencode;

    if (true === val) val = "1";
    else if (false === val) val = "0";

    if (null != val)
    {
        if ('object' === typeof val)
        {
            tmp = [];
            for (k in val)
            {
                if (HAS.call(val, k) && (null != val[k]))
                {
                    tmp.push(http_build_query_helper(key + "[" + k + "]", val[k], arg_separator, PHP_QUERY_RFC3986));
                }
            }
            return tmp.join(arg_separator);
        }
        else
        {
            return encode(key) + "=" + encode(val);
        }
    }
    else
    {
        return '';
    }
}
function http_build_query(data, arg_separator, PHP_QUERY_RFC3986)
{
    if ('undefined' !== typeof(URLSearchParams))
    {
        // NOTE: nesting is handled via flatten
        var params;
        try {
            params = new URLSearchParams(flatten(data, {}));
        } catch (e) {
            params = null;
        }
        if (params)
        {
            params = params.toString();
            if ('&' !== arg_separator) params = params.split('&').join(arg_separator);
            return params;
        }
    }

    var value, key, query, tmp = [];

    if (arguments.length < 2) arg_separator = "&";
    if (arguments.length < 3) PHP_QUERY_RFC3986 = false;

    for (key in data)
    {
        if (!HAS.call(data, key)) continue;
        value = data[key];
        query = http_build_query_helper(key, value, arg_separator, PHP_QUERY_RFC3986);
        if ('' != query) tmp.push(query);
    }

    return tmp.join(arg_separator);
}

// export it
EazyHttp.VERSION = VERSION;
return EazyHttp;
});