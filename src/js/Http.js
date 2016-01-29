/**
*    Http
*    http utilities class for PHP, Python, Node/XPCOM/JS
*    https://github.com/foo123/Http
**/
!function( root, name, factory ) {
"use strict";
var m;
if ( ('undefined'!==typeof Components)&&('object'===typeof Components.classes)&&('object'===typeof Components.classesByID)&&Components.utils&&('function'===typeof Components.utils['import']) ) /* XPCOM */
    (root.EXPORTED_SYMBOLS = [ name ]) && (root[ name ] = factory.call( root ));
else if ( ('object'===typeof module)&&module.exports ) /* CommonJS */
    module.exports = factory.call( root );
else if ( ('function'===typeof(define))&&define.amd&&('function'===typeof(require))&&('function'===typeof(require.specified))&&require.specified(name) ) /* AMD */
    define(name,['require','exports','module'],function( ){return factory.call( root );});
else if ( !(name in root) ) /* Browser/WebWorker/.. */
    (root[ name ] = (m=factory.call( root )))&&('function'===typeof(define))&&define.amd&&define(function( ){return m;} );
}(  /* current root */          this, 
    /* module name */           "Http",
    /* module factory */        function( undef ) {
"use strict";

var PROTO = "prototype", HAS = "hasOwnProperty",
    toString = Object[PROTO].toString, Keys = Object.keys,
    isNode = 'undefined' !== global && '[object Global]' === toString.call(global),
    
    __id = 0,
    
    xFormData, FormSerializer, Http,
    
    is_array = function( o ) { return ('[object Array]' === toString.call(o)) || (o instanceof Array); },
    is_obj = function( o ) { return ('[object Object]' === toString.call(o)) || (o instanceof Object); },
    is_string = function( o ) { return ('[object String]' === toString.call(o)) || (o instanceof String); },
    is_number = function( o ) { return ('number' === typeof(o)) || (o instanceof Number); },
    is_callable = function( o ) { return ('[object Function]' === toString.call(o)) || (o instanceof Function); },
    
    extend = function( o1, o2, deep ) {
        var k, v;
        deep = true === deep;
        if ( o2 )
        {
            for ( k in o2 )
            {
                if ( !o2[HAS](k) ) continue;
                v = o2[k];
                if ( is_number(v) ) o1[k] = 0+v;
                else if ( is_string(v) ) o1[k] = v.slice();
                else if ( is_array(v) ) o1[k] = deep ? extend(v.length ? new Array(v.length) : [], v, deep) : v;
                else if ( is_obj(v) ) o1[k] = deep ? extend({}, v, deep) : v;
                else o1[k] = v;
            }
        }
        return o1;
    },
    
    trim = String[PROTO].trim 
        ? function( s ) { return s.trim( ); }
        : function( s ) { return s.replace(/^\s+|\s+$/g, ''); },
    toBase64 = function toBase64( str ) {
        return (new Buffer(str || "", "ascii")).toString("base64");
    },
    json_encode = JSON.stringify, json_decode = JSON.parse,
    base64_encode = btoa, base64_decode = atob,
    
    uuid = function uuid( namespace ) {
        return [namespace||'uuid', ++__id, new Date().getTime()].join('_');
    },
    
    http = isNode 
        ? require('http') 
        : ("undefined" !== typeof XMLHttpRequest ? XMLHttpRequest : function(){ return new ActiveXObject("Microsoft.XMLHTTP");}),
    
    // adapted from https://github.com/kvz/phpjs
    uriParser = {
        php: /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/\/?)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // Added one optional slash to post-scheme to catch file:/// (should restrict this)
    },
    uriComponent = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port',
        'relative', 'path', 'directory', 'file', 'query', 'fragment'],
    parse_url = function(s, component, mode/*, queryKey*/) {
        var m = uriParser[mode || 'php'].exec( s ),
            uri = { }, i = 14//, parser, name
        ;
        while ( i-- ) 
        {
            if ( m[ i ] )  uri[ uriComponent[ i ] ] = m[ i ]
        }
        if ( uri[HAS]('port') ) uri['port'] = parseInt(uri['port'], 10);
        
        if ( component ) 
        {
            return uri[ component.replace('PHP_URL_', '').toLowerCase( ) ] || null;
        }
        
        /*if ( 'php' !== mode )
        {
            name = queryKey || 'queryKey';
            parser = /(?:^|&)([^&=]*)=?([^&]*)/g;
            uri[ name ] = { };
            uri[ uriComponent[12] ].replace(parser, function ($0, $1, $2) {
                if ($1) {uri[name][$1] = $2;}
            });
        }*/
        if ( uri.source ) delete uri.source;
        return uri;
    },
    rawurldecode = function( str ){
        return decodeURIComponent( ''+str );
    },
    rawurlencode = function( str ) {
        return encodeURIComponent( ''+str )
            .split('!').join('%21')
            .split("'").join('%27')
            .split('(').join('%28')
            .split(')').join('%29')
            .split('*').join('%2A')
            //.split('~').join('%7E')
        ;        
    },
    urldecode = function( str ) { 
        return rawurldecode( ('' + str).split('+').join('%20') ); 
    },
    urlencode = function( str ) {
        return rawurlencode( str ).split('%20').join('+');
    },
    parse_str = function( str ) {
        var strArr = str.replace(/^&/, '').replace(/&$/, '').split('&'),
            sal = strArr.length,
            i, j, ct, p, lastObj, obj, chr, tmp, key, value,
            postLeftBracketPos, keys, keysLen,
            array = { }
        ;

        for (i=0; i<sal; i++) 
        {
            tmp = strArr[ i ].split( '=' );
            key = rawurldecode( trim(tmp[0]) );
            value = (tmp.length < 2) ? '' : rawurldecode( trim(tmp[1]) );

            j = key.indexOf('\x00');
            if ( j > -1 ) key = key.slice(0, j);
                
            if ( key && '[' !== key.charAt(0) ) 
            {
                keys = [ ];
                
                postLeftBracketPos = 0;
                for (j=0; j<key.length; j++) 
                {
                    if ( '[' === key.charAt(j)  && !postLeftBracketPos ) 
                    {
                        postLeftBracketPos = j + 1;
                    }
                    else if ( ']' === key.charAt(j) ) 
                    {
                        if ( postLeftBracketPos ) 
                        {
                            if ( !keys.length ) 
                            {
                                keys.push( key.slice(0, postLeftBracketPos - 1) );
                            }
                            keys.push( key.substr(postLeftBracketPos, j - postLeftBracketPos) );
                            postLeftBracketPos = 0;
                            if ( '[' !== key.charAt(j + 1) ) break;
                        }
                    }
                }
                
                if ( !keys.length ) keys = [ key ];
                
                for (j=0; j<keys[0].length; j++) 
                {
                    chr = keys[0].charAt(j);
                    if ( ' ' === chr || '.' === chr || '[' === chr ) 
                    {
                        keys[0] = keys[0].substr(0, j) + '_' + keys[0].substr(j + 1);
                    }
                    if ( '[' === chr ) break;
                }

                obj = array;
                for (j=0, keysLen=keys.length; j<keysLen; j++) 
                {
                    key = keys[ j ].replace(/^['"]/, '').replace(/['"]$/, '');
                    lastObj = obj;
                    
                    if ( ('' !== key && ' ' !== key) || 0 === j ) 
                    {
                        if ( undef === obj[key] ) obj[key] = { };
                        obj = obj[ key ];
                    }
                    else 
                    { 
                        // To insert new dimension
                        ct = -1;
                        for ( p in obj ) 
                        {
                            if ( obj[HAS](p) ) 
                            {
                                if ( +p > ct && p.match(/^\d+$/g) ) 
                                {
                                    ct = +p;
                                }
                            }
                        }
                        key = ct + 1;
                    }
                }
                lastObj[ key ] = value;
            }
        }
        return array;
    },
    
    // adapted from https://github.com/kvz/phpjs
    http_build_query_helper = function( key, val, arg_separator, PHP_QUERY_RFC3986 ) {
        var k, tmp, encode = PHP_QUERY_RFC3986 ? rawurlencode : urlencode;
        
        if ( true === val ) val = "1";
        else if ( false === val ) val = "0";
        
        if ( null != val ) 
        {
            if ( "object" === typeof(val) ) 
            {
                tmp = [ ];
                for ( k in val ) 
                {
                    if ( val[HAS](k) && null != val[k] ) 
                    {
                        tmp.push( http_build_query_helper(key + "[" + k + "]", val[k], arg_separator, PHP_QUERY_RFC3986) );
                    }
                }
                return tmp.join( arg_separator );
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
    },
    http_build_query = function http_build_query( data, arg_separator, PHP_QUERY_RFC3986 ) {
        var value, key, query, tmp = [ ];

        if ( arguments.length < 2 ) arg_separator = "&";
        if ( arguments.length < 3 ) PHP_QUERY_RFC3986 = false;
        
        for ( key in data ) 
        {
            if ( !data[HAS](key) ) continue;
            value = data[ key ];
            query = http_build_query_helper(key, value, arg_separator, PHP_QUERY_RFC3986);
            if ( '' != query ) tmp.push( query );
        }

        return tmp.join( arg_separator );
    }, 

    // adapted from https://github.com/rse/node-xmlhttprequest-cookie
    //  - http://tools.ietf.org/html/rfc6265
    //  - http://en.wikipedia.org/wiki/HTTP_cookie
    //  Two example HTTP headers:
    //  - Set-Cookie: LSID=DQAAAK…Eaem_vYg; Domain=docs.foo.com; Path=/accounts; Expires=Wed, 13 Jan 2021 22:23:01 GMT; Secure; HttpOnly
    //  - Cookie: LSID=DQAAAK…Eaem_vYg; FOO=bArBaz
    http_cookie = function http_cookie(name, value, domain, path, expires, secure, httponly) {
        if ( is_obj(name) )
        {
            return extend({
             name     : ""
            ,value    : ""
            ,domain   : ""
            ,path     : "/"
            ,expires  : new Date(Date.now() + 31536000000)
            ,secure   : false
            ,httponly : false
            }, name);
        }
        return {
         name     : name     || ""
        ,value    : value    || ""
        ,domain   : domain   || ""
        ,path     : path     || "/"
        ,expires  : expires  || new Date(Date.now() + 31536000000)
        ,secure   : secure || false
        ,httponly : httponly || false
        };
    },
    
    // build/glue together a uri component from a params object
    glue = function glue( params ) {
        var component = '';
        // http://php.net/manual/en/function.http-build-query.php
        if ( params )  component += http_build_query( params, '&', true );
        return component;
    },

    // unglue/extract params object from uri component
    unglue = function unglue( s ) {
        var PARAMS = s ? parse_str( s ) : { };
        return PARAMS;
    },

    // parse and extract uri components and optional query/fragment params
    parse_url = function parse_url( s, query_p, fragment_p ) {
        var COMPONENTS = { };
        if ( s )
        {
            if ( arguments.length < 3 ) fragment_p = 'fragment_params';
            if ( arguments.length < 2 ) query_p = 'query_params';
            
            COMPONENTS = parse_url( s );
            
            if ( query_p ) 
            {
                if ( COMPONENTS[ 'query' ] ) 
                    COMPONENTS[ query_p ] = unglue( COMPONENTS[ 'query' ] );
                else
                    COMPONENTS[ query_p ] = { };
            }
            if ( fragment_p )
            {
                if ( COMPONENTS[ 'fragment' ] ) 
                    COMPONENTS[ fragment_p ] = unglue( COMPONENTS[ 'fragment' ] );
                else
                    COMPONENTS[ fragment_p ] = { };
            }
        }
        return COMPONENTS;
    },

    // build a url from baseUrl plus query/hash params
    build_url = function build_url( baseUrl, query, hash, q, h ) {
        var url = '' + baseUrl;
        if ( arguments.length < 5 ) h = '#';
        if ( arguments.length < 4 ) q = '?';
        if ( query )  url += q + glue( query );
        if ( hash )  url += h + glue( hash );
        return url;
    },

    // parse and extract headers from header_str
    parse_headers = function parse_headers( s ) {
        var headers = { },
            key = null, lines, parts, i, l, line;
        if ( s && s.length )
        {
            lines = s.split(/(\r\n)|\r|\n/g);
            l = lines.length;
            for (i=0; i<l; i++)
            {
                line = lines[i];
                parts = line.split(":");
                if ( parts.length > 1 )
                {
                    key = trim(parts.shift());
                    headers[key] = parts.join(":");
                }
                else if (key)
                {
                    headers[key] += "\r\n" + parts[0];
                }
            }
        }
        return headers;
    },

    // parse and extract headers from header_str
    build_headers = function build_headers( headers ) {
        var header = '',
            key = null, lines, parts, i, l, line;
        lines = s.split(/(\r\n)|\r|\n/g);
        l = lines.length;
        for (i=0; i<l; i++)
        {
            line = lines[i];
            parts = line.split(":");
            if ( parts.length > 1 )
            {
                key = trim(parts.shift());
                headers[key] = parts.join(":");
            }
            else if (key)
            {
                headers[key] += "\r\n" + parts[0];
            }
        }
        return header;
    },

    /*  parse a "Set-Cookie"-style header value  */
    parse_cookie = function parse_cookie( cookieString, url ) {
        /*  generate new cookie and initialize it according to the URL  */
        var cookie = http_cookie( );

        /*  optionally initialize for a particular URL  */
        if ( "undefined" !== typeof url ) 
        {
            if ( "string" === typeof url ) url = parse_url( url, false, false );
            cookie.domain = url.host;
            cookie.path   = url.path;
        }

        /*  parse value/name  */
        var equalsSplit = /([^=]+)(?:=(.*))?/;
        var cookieParams = ("" + cookieString).split("; ");
        var cookieParam;
        if ((cookieParam = cookieParams.shift().match(equalsSplit)) === null)
            throw new Error("failed to parse cookie string");
        cookie.name  = cookieParam[1];
        cookie.value = cookieParam[2];

        /*  parse remaining attributes  */
        for (var i = 0, len = cookieParams.length; i < len; i++) {
            cookieParam = cookieParams[i].match(equalsSplit);
            if (cookieParam !== null && cookieParam.length) {
                var attr = cookieParam[1].toLowerCase();
                if (typeof cookie[attr] !== "undefined")
                    cookie[attr] = typeof cookieParam[2] === "string" ? cookieParam[2] : true;
            }
        }

        /*  special post-processing for expire date  */
        if (typeof cookie.expires === "string")
            cookie.expires = new Date(cookie.expires);

        return cookie;
    },

    /*  generate "Set-Cookie"-style header value  */
    build_cookie = function build_cookie( cookie ) {
        var str = cookie.name + "=" + cookie.value;
        str += "; Domain=" + cookie.domain;
        str += "; Path=" + cookie.path;
        str += "; Expires=" + cookie.expires;
        if ( cookie.secure ) str += "; Secure";
        if ( cookie.httponly ) str += "; HttpOnly";
        return str;
    },
    
    parse_form = function parse_form( form, formData ) {
        var data = formData && formData instanceof xFormData ? formData : new xFormData();
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements
        if ( form && form.elements && form.elements.length )
        {
            var i, l = form.elements.length, field, fieldtype, type, key, value;
            for (i=0; i<l; i++)
            {
                field = form.elements[i];
                fieldtype = field.nodeName.toLowerCase( );
                if ( !/input|textarea|select/.test(fieldtype) || 
                    field.disabled || 
                    !field.name || 
                    !field.name.length ) continue;
                type = field.type.toLowerCase( );
                key = field.name;
                value = null;
                switch( fieldtype ) 
                {
                    case 'input':
                    case 'textarea':
                        switch( type ) 
                        {
                            case 'radio':
                                if (field.checked && "false" === field.value) 
                                {
                                    value = false;
                                    break;
                                }
                            case 'checkbox':
                                if (field.checked && "true" === field.value) 
                                {
                                    value = true;
                                    break;
                                }
                                if (!field.checked && "true" === field.value) 
                                {
                                    value = false;
                                    break;
                                }
                                if (field.checked) 
                                {
                                    value = field.value;
                                    break;
                                }
                                break;

                            case 'file':
                                value = field.files/*[0]??*/;
                                break;

                            case 'button':
                            case 'reset':
                            case 'submit':
                            case 'image':
                                break;

                            default:
                                value = field.value;
                                break;
                        }
                        break;

                    case 'select':
                        var selected, options, i, l;

                        if ( !field.multiple ) 
                        {
                            value = field.value;
                            break;
                        }
                        selected = [ ];
                        for (options = field.getElementsByTagName("option"), i = 0, l = options.length; i < l; i++)
                        {
                            if ( options[i].selected ) 
                                selected.push( options[i].value );
                        }

                        value = selected;
                        break;

                    default:
                        break;
                }
                if ( null === value ) continue;
            }
        }
        return data;
    },
    
    form_encode = function form_encode( form, formData ) {
        if ( form ) 
        {
            if ( !isNode && form instanceof HTMLFormElement ) form = parse_form( form, formData );
            // "multipart/form-data"
            if ( form instanceof xFormData ) return form.shim ? form.toString( ) : form;
            //'application/x-www-form-urlencoded; charset=utf-8'
            if ( is_string( form ) ) return urlencode(form.toString( 'utf8' ));
            else if ( is_obj( form ) || is_array( form ) ) return glue( form )/*.toString('utf8')*/;
        }
        return '';
    },
    
    http_request = isNode 
    ? function http_request( options, onComplete ) {
        var options = {
            host: 'example.com',
            port: 80,
            path: '/foo.html'
        };

        var headers = null, body = '';
        http
            .request(options, function( response ) {
                headers = response.headers;
                response.on('data', function( chunk ){
                    //do something with chunk
                    body += chunk;
                });
                response.on('end', function( ){
                    onComplete( headers, body );
                });
            })
            .on("error", function(e){
                //console.log("Got error: " + e.message);
                onComplete( e, null );
            })
        ;
    }
    : function http_request( options, onComplete ) {
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#getAllResponseHeaders%28%29
        var xmlhttp = new http(), headers = null, body = '';
        xmlhttp.onload = function( ) {
            if ( 2 /*HEADERS_RECEIVED*/ === xmlhttp.readyState )
            {
                if ( 200 === xmlhttp.status ) 
                {
                    headers = parse_headers( xmlhttp.getAllResponseHeaders( ) );
                }
            }
            else if  ( 3 /*LOADING*/ === xmlhttp.readyState ) { }
            else if  ( 4 /*DONE*/ === xmlhttp.readyState )
            {
                if ( 200 === xmlhttp.status ) 
                {
                    body = xmlhttp.responseText;
                    onComplete( headers, body );
                }
                else
                {                
                    onComplete( new Error('Request failed'), null );
                }
            }
        };
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Synchronous_and_Asynchronous_Requests#Example.3A_using_a_timeout
        xmlhttp.ontimeout = function( ) {
            onComplete( new Error('Request timeout'), null );
        };
        xmlhttp.open(method, url, true /*,user,pass*/);  // 'true' makes the request asynchronous
        xmlhttp.timeout = options.timeout || 0;
        xmlhttp.send(params);
    },
;

if ( isNode || "undefined" === typeof FormData )
{
    xFormData = function xFormData( form ) {
        var self = this;
        self.shim = true;
        self.boundary = "--------FormDataBoundary" + base64_encode(uuid('FormData'));
        self.fields = { };
        if ( !isNode && form instanceof HTMLFormElement ) 
            parse_form( form, self );
    };
    xFormData[PROTO] = {
        constructor: xFormData,
        shim: true,
        boundary: null,
        fields: null,
        
        dispose: function( ) {
            var self = this;
            self.boundary = null;
            self.fields = null;
            return self;
        },
        
        delete: function( key, value ) {
            var self = this, index;
            if ( key && self.fields[HAS](key) )
            {
                if ( arguments.length > 1 )
                {
                    index = self.fields[key].indexOf( value );
                    if ( -1 < index ) self.fields[key].splice(index, 1);
                }
                else
                {
                    delete self.fields[ key ];
                }
            }
            return self;
        },
        
        has: function( key, value ) {
            var self = this, index;
            if ( key && self.fields[HAS](key) )
            {
                if ( arguments.length > 1 )
                {
                    index = self.fields[key].indexOf( value );
                    return ( -1 < index );
                }
                else
                {
                    return true;
                }
            }
            return false;
        },
        
        append: function( key, value ) {
            var self = this;
            if ( !self.fields[HAS](key) ) self.fields[key] = is_array(value) ? value : [value];
            else if ( is_array(value) ) self.fields[key] = self.fields[key].concat( value );
            else self.fields[key].push( value );
            return self;
        },
        
        set: function( key, value ) {
            var self = this;
            self.fields[key] = is_array(value) ? value : [value];
            return self;
        },
        
        get: function( key ) {
            var self = this;
            if ( key && self.fields[HAS](key) && self.fields[key].length )
                return self.fields[key][0];
            return undef;
        },
        
        getAll: function( key ) {
            var self = this;
            if ( key && self.fields[HAS](key) && self.fields[key].length )
                return self.fields[key];
            return undef;
        },
        
        toString: function( ) {
            var self = this,
                boundary = self.boundary,
                fields = self.fields,
                keys = Keys(fields),
                f, fl, k, kl = keys.length, key, field, kfields,
                ks, file,
                body = "";
            for (k=0; k<kl; k++)
            {
                key = keys[ k ];
                ks = key.toString( );
                kfields = fields[ key ];
                fl = kfields.length;
                for (f=0; f<fl; f++)
                {
                    field = kfields[ f ];
                    body += "--" + boundary + "\r\n";
                    // file upload
                    if (field.name /*|| field instanceof Blob*/) 
                    {
                        file = field;
                        body += "Content-Disposition: form-data; name=\""+ ks +"\"; filename=\""+ file.name +"\"\r\n";
                        body += "Content-Type: "+ file.type +"\r\n\r\n";
                        body += file.getAsBinary( ) + "\r\n";
                    } 
                    else 
                    {
                        body += "Content-Disposition: form-data; name=\""+ ks +"\";\r\n\r\n";
                        body += field.toString('utf8') + "\r\n";
                    }
                }
            }
            body += "--" + boundary +"--";
            return body;
        }
    };
}
else
{
    xFormData = FormData;
}

Http = function Http( ){ };

// build/glue together a uri component from a params object
Http.glue = glue;
// unglue/extract params object from uri component
Http.unglue = unglue;
// parse and extract uri components and optional query/fragment params
Http.parse_url = parse_url;
// build a url from baseUrl plus query/hash params
Http.build_url = build_url;
// parse and extract headers from header_str
Http.parse_headers = parse_headers;
// parse and extract headers from header_str
Http.build_headers = build_headers;
/*  parse a "Set-Cookie"-style header value  */
Http.parse_cookie = parse_cookie;
/*  generate "Set-Cookie"-style header value  */
Http.build_cookie = build_cookie;

Http.FormData = xFormData;

Http[PROTO] = {
    constructor: Http,
    
    headers: null,
    cookies: null,
    body: null,
    
    dispose: function( ) {
        var self = this;
        self.headers = null;
        self.cookies = null;
        self.body = null;
        return self;
    }
    
    request: function( url, options )  {
        var self = this, onLoad = null, onError = null;
        if ( !url ) return;
        if ( !options ) options = {};
        if ( options[HAS]('onLoad') )
        {
            onLoad = is_callable(options.onLoad) ? options.onLoad : null;
            delete options.onLoad;
        }
        if ( options[HAS]('onError') )
        {
            onError = is_callable(options.onError) ? options.onError : null;
            delete options.onError;
        }
        options = extend({
            'method'    : 'GET',
            'port'      : 80,
            'user'      : null,
            'password'  : null,
            'cookies'   : [],
            'headers'   : {},
            'body'      : '',
            'data'      : {},
            'params'    : {}
        }, options);
        options.method = options.method.toUpperCase( );
        options.port = parseInt(options.port, 10);
        
        http_request( options, function( headers, body ){
            if ( headers instanceof Error )
            {
                if ( onError ) onError( headers );
            }
            else
            {                
                self.headers = headers;
                self.cookies = {};
                self.body = body;
                if ( onLoad ) onLoad( self );
            }
        });
    },
    
    get: function( url, onLoad, onError ) {
        var self = this;
        var options = {
            'method'    : 'GET',
            'onLoad'    : onLoad,
            'onError'   : onError
        };
        self.request( url, options );
    },
    
    post: function( url, data, onLoad, onError ) {
        var self = this;
        var options = array(
            'method'    : 'POST',
            'data'      : data||{}
            'onLoad'    : onLoad,
            'onError'   : onError
        );
        self.request( url, options );
    }
};

// export it
return Http;
});