/**
*    EazyHttp
*    easy, simple and fast HTTP requests for PHP, JavaScript, Python
*    https://github.com/foo123/EazyHttp
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

var VERSION = '0.1.0',

    PROTO = 'prototype',
    HAS = Object[PROTO].hasOwnProperty,
    toString = Object[PROTO].toString,

    trim = String[PROTO].trim
        ? function(s) {return s.trim();}
        : function(s) {return s.replace(/^\s+|\s+$/g, '');},

    isNode = ('undefined' !== typeof(global)) && ('[object Global]' === toString.call(global)),

    http = isNode ? require('http') : function() {return 'undefined' !== typeof(XMLHttpRequest) ? (new XMLHttpRequest()) : (new ActiveXObject('Microsoft.XMLHTTP'));}
;

function EazyHttp()
{
}
EazyHttp[PROTO] = {
    constructor: EazyHttp,

    get: function(uri, data, headers, cookies, cb) {
        return this._do_http('GET', uri, data, headers, cookies, cb);
    },

    post: function(uri, data, headers, cookies, cb) {
        return this._do_http('POST', uri, data, headers, cookies, cb);
    },

    _do_http: function(method, uri, data, headers, cookies, cb)  {
        var self = this, hs, name;

        method = String(method).toUpperCase();
        if ('POST' !== method) method = 'GET';

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
        if (('POST' === method) && !HAS.call(headers, 'Content-Type'))
        {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        if (isNode)
        {
            self._do_http_server(
                method,
                uri + (('GET' === method) && is_obj(data) ? ((-1 === uri.indexOf('?') ? '?' : '&') + http_build_query(data, '&')) : ''),
                'POST' === method ? data : '',
                headers,
                cookies,
                {
                    'timeout'   : 30, // sec
                },
                function(err, response) {
                    if (is_callable(cb)) cb(err, response);
                }
            );
        }
        else
        {
            self["undefined" !== typeof(fetch) ? '_do_http_fetch' : '_do_http_xhr'](
                method,
                uri + (('GET' === method) && is_obj(data) ? ((-1 === uri.indexOf('?') ? '?' : '&') + http_build_query(data, '&')) : ''),
                'POST' === method ? data : '',
                headers,
                cookies,
                {
                    'timeout'   : 30, // sec
                    'redirect'  : 'follow'
                },
                function(err, response) {
                    if (is_callable(cb)) cb(err, response);
                }
            );
        }
        return self;
    },

    _do_http_server: function(method, uri, data, headers, cookies, options, cb) {
        var protocol, port, host, path, query;

        uri = parse_url(uri);
        host = uri['host'];
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
        protocol = HAS.call(uri, 'scheme') ? uri['scheme'].toLowerCase() : 'http';
        port = HAS.call(uri, 'port') ? +uri['port'] : ('https' === protocol ? 443 : 80);
        path = HAS.call(uri, 'path') ? uri['path'] : '/';
        if (!path.length) path = '/';
        path += HAS.call(uri, 'query') && uri['query'].length ? ('?' + uri['query']) : '';

        var request = http.request({
            'method'    : method,
            'protocol'  : protocol,
            'host'      : host,
            'port'      : port,
            'path'      : path,
            'headers'   : format_http_cookies(cookies, headers),
            'timeout'   : 1000*options.timeout // ms
        });
        request.on('response', function(response) {
            var status = response.statusCode, content = '',
                headers = parse_http_header(response.headers),
                cookies = parse_http_cookies(headers);

            response.on('data', function(chunk) {
                content += chunk;
            });
            response.on('end', function() {
                cb(null, {
                    status  : status,
                    content : content,
                    headers : headers,
                    cookies : cookies

                });
            });
        });
        request.on('timeout', function() {
            cb(new EazyHttpException('Request timeout after '+options.timeout+' secs'), {
                status  : 0,
                content : false,
                headers : {},
                cookies : []
            });
        });
        request.on('error', function(err) {
            cb(err, {
                status  : 0,
                content : false,
                headers : {},
                cookies : []
            });
        });
    },

    _do_http_fetch: function(method, uri, data, headers, cookies, options, cb) {
        var status;
        fetch(uri, {
            'method'    : method,
            'headers'   : headers,
            'body'      : format_data(method, data),
            'redirect'  : options['redirect'],
            'keepalive' : false
        }).then(function(response){
            status = response.status;
            headers = parse_http_header(response.headers);
            cookies = parse_http_cookies(headers);
            return response.text();
        }).then(function(content) {
            cb(err, {
                status  : status,
                content : content,
                headers : headers,
                cookies : cookies
            });
        }).catch(function(err) {
            cb(err, {
                status  : 0,
                content : false,
                headers : {},
                cookies : []
            });
        })
    },

    _do_http_xhr: function(method, uri, data, headers, cookies, options, cb) {
        var xhr = http();
        //xhr.onreadystatechange
        // (2 /*HEADERS_RECEIVED*/ === xhr.readyState)
        // (3 /*LOADING*/ === xhr.readyState)
        // (4 /*DONE*/ === xhr.readyState)
        xhr.ontimeout = function() {
            cb(new EazyHttpException('Request timeout after '+options.timeout+' secs'), {
                status  : 0,
                content : false,
                headers : {},
                cookies : []
            });
        };
        xhr.onerror = function(err) {
            cb(err, {
                status  : 0,
                content : false,
                headers : {},
                cookies : []
            });
        };
        xhr.onload = function() {
            var headers = parse_http_header(xhr.getAllResponseHeaders()),
                cookies = parse_http_cookies(headers);
            cb(null, {
                status  : xhr.status,
                content : xhr.responseText,
                headers : headers,
                cookies : cookies
            });
        };
        xhr.open(method, uri, true /*,user,pass*/);  // 'true' makes the request asynchronous
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
        xhr.timeout = 1000*options.timeout; // ms
        xhr.send(format_data(method, data));
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
function format_data(method, data)
{
    if ('POST' === method)
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
        else if (("undefined" !== typeof(ArrayBuffer)) && (data instanceof ArrayBuffer))
        {
            // ArrayBuffer
            /*pass*/
        }
        else if (data.buffer && ("undefined" !== typeof(ArrayBuffer)) && (data.buffer instanceof ArrayBuffer))
        {
            // TypedArray
            /*pass*/
        }
        else if (is_obj(data))
        {
            data = http_build_query(data, '&');
        }
        else
        {
            data = '';
        }
    }
    else
    {
        data = '';
    }
    return data;
}
function parse_cookie(str, isRaw)
{
    var cookie, parts, part, i, n, name, value, data;
    cookie = {
        'isRaw' : isRaw,
        'expires' : 0,
        'path' : '/',
        'domain' : null,
        'secure' : false,
        'httponly' : false,
        'samesite' : null,
        'partitioned' : false
    };

    parts = String(str).split(';');
    for (i=0,n=parts.length; i<n; ++i) parts[i] = parts[i].split('=', 2);

    part = parts.shift();
    name = !isRaw ? urldecode(trim(part[0])) : trim(part[0]);
    value = (null != part[1]) ? (!isRaw ? urldecode(trim(part[1])) : trim(part[1])) : null;
    cookie['name'] = name;
    cookie['value'] = value;

    data = {};
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
function parse_http_header(responseHeader)
{
    var responseHeaders = {}, name, lines, parts, line, i, n;
    if ("undefined" !== typeof(Headers) && (responseHeader instanceof Headers))
    {
        responseHeader.forEach(function(value, name) {
            name = ucwords(trim(name).toLowerCase(), '-');
            if (HAS.call(responseHeaders, name)) responseHeaders[name].push(value);
            else responseHeaders[name] = [value];
        });
    }
    else if (is_obj(responseHeader))
    {
        for (name in responseHeader)
        {
            if (HAS.call(responseHeader, name))
            {
                name = ucwords(trim(name).toLowerCase(), '-');
                if (HAS.call(responseHeaders, name)) responseHeaders[name].push(value);
                else responseHeaders[name] = [value];
            }
        }
    }
    else
    {
        if (is_string(responseHeader)) responseHeader = responseHeader.split("\r\n");
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
                        name = ucwords(trim(parts[0]).toLowerCase(), '-');
                        if (HAS.call(responseHeaders, name)) responseHeaders[name].push(parts[1]);
                        else responseHeaders[name] = [parts[1]];
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
    if (responseHeaders && is_array(responseHeaders['Set-Cookie']) && responseHeaders['Set-Cookie'].length)
    {
        for (i=0,n=responseHeaders['Set-Cookie'].length; i<n; ++i)
        {
            cookie = parse_cookie(responseHeaders['Set-Cookie'][i]);
            if (is_obj(cookie)) cookies.push(cookie);
        }
    }
    return cookies;
}
function format_http_cookies(cookies, headers, toSet)
{
    if (is_array(cookies) && cookies.length)
    {
        for (var i=0,n=cookies.length,cookie_str; i<n; ++i)
        {
            if (is_obj(cookies[i]))
            {
                if (toSet)
                {
                    cookie_str = format_cookie(cookies[i], true);
                    if (cookie_str.length)
                    {
                        if (HAS.call(headers, 'Set-Cookie'))
                        {
                            if (!is_array(headers['Set-Cookie'])) headers['Set-Cookie'] = [headers['Set-Cookie']];
                            headers['Set-Cookie'].push(cookie_str);
                        }
                        else
                        {
                            headers['Set-Cookie'] = cookie_str;
                        }
                    }
                }
                else
                {
                    cookie_str = format_cookie(cookies[i], false);
                    if (cookie_str.length)
                    {
                        if (HAS.call(headers, 'Cookie'))
                        {
                            headers['Cookie'] = trim(headers['Cookie']);
                            headers['Cookie'] += (';' === headers['Cookie'].slice(-1) ? ' ' : '; ') + cookie_str;
                        }
                        else
                        {
                            headers['Cookie'] = cookie_str;
                        }
                    }
                }
            }
        }
    }
    return headers;
}
function is_array(x)
{
    return ('[object Array]' === toString.call(x)) || (x instanceof Array);
}
function is_obj(x)
{
    return ('[object Object]' === toString.call(x)) || (x instanceof Object);
}
function is_string(x)
{
    return ('[object String]' === toString.call(x)) || (x instanceof String);
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
    if ('function' === typeof Object.keys) return Object.keys(o);
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
    if ('function' === typeof Object.values) return Object.values(o);
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
function in_array(v, a, strict)
{
    var i, l = a.length;
    if (true === strict)
    {
        // Array.indexOf uses strict equality
        return (0 < l) && (-1 !== a.indexOf(v));
    }
    else
    {
        for (i=0; i<l; ++i)
        {
            if (v == a[i])
                return true;
        }
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
// adapted from https://github.com/kvz/phpjs
var uriParser = {
    php: /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/\/?)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // Added one optional slash to post-scheme to catch file:/// (should restrict this)
},
    uriComponent = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment']
;
function parse_url(s, component, mode/*, queryKey*/)
{
    var m = uriParser[mode || 'php'].exec(s),
        uri = {}, i = 14//, parser, name
    ;
    while (i--)
    {
        if (m[i])  uri[uriComponent[i]] = m[i]
    }
    if (HAS.call(uri, 'port')) uri['port'] = parseInt(uri['port'], 10);

    if (component)
    {
        return uri[component.replace('PHP_URL_', '').toLowerCase()] || null;
    }

    /*if ('php' !== mode)
    {
        name = queryKey || 'queryKey';
        parser = /(?:^|&)([^&=]*)=?([^&]*)/g;
        uri[name] = {};
        uri[uriComponent[12]].replace(parser, function ($0, $1, $2) {
            if ($1) {uri[name][$1] = $2;}
        });
    }*/
    if (null != uri.source) delete uri.source;
    return uri;
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
function parse_str(str)
{
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
// adapted from https://github.com/kvz/phpjs
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
function str_replace(from, to, str)
{
    for (var i=0,n=from.length; i<n; ++i)
    {
        str = str.split(from[i]).join(to[i]);
    }
    return str;
}

// export it
EazyHttp.VERSION = VERSION;
return EazyHttp;
});