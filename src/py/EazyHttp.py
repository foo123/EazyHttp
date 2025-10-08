##
#   EazyHttp
#   easy, simple and fast HTTP requests for PHP, JavaScript, Python
#   @version: 1.2.0
#
#   https://github.com/foo123/EazyHttp
##
import urllib.request
import urllib.parse
import socket
import ssl
import re
import math
from datetime import datetime, timezone

class EazyHttp:
    VERSION = "1.2.0"

    def __init__(self):
        self.opts = {}
        # some defaults
        self.option('timeout',            30) # sec, default
        self.option('follow_redirects',   3) # default
        self.option('return_type',        'string') # default
        self.option('methods',            ['urllib', 'socket']) # default

    def option(self, *args):
        nargs = len(args)
        if 1 == nargs:
            key = str(args[0])
            return self.opts[key] if key in self.opts else None
        elif 1 < nargs:
            key = str(args[0])
            val = args[1]
            self.opts[key] = val
        return self

    def get(self, uri, data = None, headers = None, cookies = None):
        return self.do_http('GET', uri, data, headers, cookies)

    def post(self, uri, data = None, headers = None, cookies = None):
        return self.do_http('POST', uri, data, headers, cookies)

    def do_http(self, method = 'GET', uri = '', data = None, headers = None, cookies = None):
        # for POST files user can pass the multipart encoded data and set Content-Type
        # binary data are passed also as strings and set appropriate Content-Type
        # for PUT, PATCH and DELETE methods code is ready

        if isinstance(uri, str) and len(uri):
            method = str(method).upper()
            if method not in ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']: method = 'GET'

            if not headers: headers = {}
            o = headers
            headers = {'User-Agent' : 'EazyHttp', 'Accept' : '*/*'}
            for name, value in o.items():
                headers[ucwords(name.strip().lower(), '-')] = value

            if not cookies: cookies = {}
            o = cookies
            cookies = {}
            for name, value in o.items():
                cookies[name] = {'value' : value}
                cookies[name]['name'] = name

            if ('POST' == method or 'PUT' == method or 'PATCH' == method) and isinstance(data, dict):
                headers['Content-Type'] = 'application/x-www-form-urlencoded'

            if 'POST' == method or 'PUT' == method or 'PATCH' == method:
                data = bytes(http_build_query(data, '&'), 'ascii') if isinstance(data, dict) else (data.encode('ascii') if isinstance(data, str) else (data if isinstance(data, bytes) else None))
            else:
                uri += (('?' if -1 == uri.find('?') else '&') + http_build_query(data, '&')) if isinstance(data, dict) else ''
                data = None

            methods = self.option('methods')
            if isinstance(methods, (list,tuple)) and len(methods):
                for do_http in methods:
                    do_http = str(do_http).lower()

                    if 'urllib' == do_http:
                        return self._do_http_urllib(
                            method,
                            uri,
                            data,
                            headers,
                            cookies
                        )
                        break
                    elif 'socket' == do_http:
                        return self._do_http_socket(
                            method,
                            uri,
                            data,
                            headers,
                            cookies
                        )
                        break
            return None

    def _do_http_urllib(self, method, uri, data, headers, cookies):
        if len(cookies):
            cookieHeader =  '; '.join(list(filter(lambda s: 0 < len(s), [format_cookie(cookie) for cookie in cookies.values()])))
            headers['Cookie'] = cookieHeader if not ('Cookie' in headers) else (headers['Cookie'] + '; ' + cookieHeader)

        request = None
        response = None
        opener = urllib.request.build_opener(EazyHttpRedirectHandler(int(self.option('follow_redirects'))))

        try:
            request = urllib.request.Request(url=uri, data=data, headers=headers, method=method)
            response = opener.open(request, None, int(self.option('timeout'))) # sec
        except Exception as e:
            status = 0
            content = False
            headers = {}
            cookies = {}
        else:
            status = response.status if hasattr(response, 'status') else response.code
            headers = parse_http_header(response.getheaders())
            cookies = parse_http_cookies(headers['set-cookie']) if 'set-cookie' in headers else {}
            if 300 < status and status < 400:
                content = False
            else:
                body = response.read()
                content = body.decode('utf-8') if 'string' == self.option('return_type') else body
            response.close()

        return {
            'status' : status,
            'content': content,
            'headers': headers,
            'cookies': cookies
        }

    def _do_http_socket(self, method, uri, data, headers, cookies):
        timeout = int(self.option('timeout')) # sec
        follow_redirects = int(self.option('follow_redirects'))
        redirect = 0
        scheme0 = None
        host0 = None
        port0 = None
        path0 = None
        responseStatus = 0
        responseBody = b''
        responseHeaders = {}
        responseCookies = {}
        while redirect <= follow_redirects:
            parts = urllib.parse.urlparse(uri)
            host = parts.hostname
            if not host: host = host0
            if not host:
                return {
                    'status' : 0,
                    'content': False,
                    'headers': {},
                    'cookies': {}
                }
            scheme = parts.scheme.lower()
            if not scheme: scheme = scheme0 if scheme0 else 'http'
            port = int(parts.port) if parts.port else (port0 if port0 else (443 if 'https' == scheme else 80))
            path = '/' if not parts.path else parts.path
            path = path_resolve(path, path0)
            path0 = path
            if parts.query: path += '?' + parts.query

            if 0 < redirect:
                method = 'GET'
                data = None

                if 'Content-Type' in headers: del headers['Content-Type']
                if 'Content-Encoding' in headers: del headers['Content-Encoding']
                if 'Content-Length' in headers: del headers['Content-Length']

                if not is_same_origin(host, host0, port, port0, scheme, scheme0):
                    responseHeaders = {}
                    cookies = {}
                    if 'Authorization' in headers: del headers['Authorization']
                    if 'Proxy-Authorization' in headers: del headers['Proxy-Authorization']
                if 'Referer' in headers: del headers['Referer']

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)

            # make request
            address = (host, port)

            try:
                if 'https' == scheme:
                    sock = socket.create_connection(address)
                    ctx = ssl.create_default_context()
                    sock = ctx.wrap_socket(sock, server_hostname=host)
                else:
                    sock.connect(address)
            except Exception as e:
                return {
                    'status' : 0,
                    'content': False,
                    'headers': {},
                    'cookies': {}
                }

            contentLength = len(data) if data is not None else 0
            headers['Content-Length'] = contentLength
            headers['Host'] = host + ('' if ('https' == scheme and 443 == port) or ('http' == scheme and 80 == port) else (':'+str(port)))
            headers['Connection'] = 'close'
            if 'Cookie' in headers: del headers['Cookie']
            requestHeaders = format_http_cookies(cookies, format_http_header(headers, []))

            # send request
            request = (method + ' ' + path + ' HTTP/1.1' + "\r\n" + "\r\n".join(requestHeaders) + "\r\n\r\n").encode('ascii')
            if contentLength: request += data
            sent = 0
            total = len(request)
            while sent < total: sent = sent + sock.send(request[sent:])

            # receive response
            response = b''
            chunk = 1024 # bytes
            try:
                while True:
                    data = sock.recv(chunk) # bytes
                    if not len(data): break
                    response += data
            except TimeoutError as e:
                sock.close()
                return {
                    'status' : 0,
                    'content': False,
                    'headers': {},
                    'cookies': {}
                }
            else:
                sock.close()
                response = response.split(b"\r\n\r\n", 2)
                responseHeader = response[0].decode('ascii')
                responseBody = response[1] if 1 < len(response) else b''
                responseStatus = 0
                if responseHeader:
                    m = re.search(HTTP_RE, responseHeader)
                    responseStatus = int(m.group(1)) if m else 0
                responseHeaders = parse_http_header(responseHeader.split("\r\n"))
                #responseHeaders.update(_responseHeaders)
                responseCookies = parse_http_cookies(responseHeaders['set-cookie']) if 'set-cookie' in responseHeaders else {}
                if ('transfer-encoding' in responseHeaders) and ('chunked' == responseHeaders['transfer-encoding'].lower()):
                    # https://en.wikipedia.org/wiki/Chunked_transfer_encoding
                    responseBody = parse_chunked(responseBody)
                if (0 < follow_redirects) and (301 <= responseStatus and responseStatus <= 308):
                    m = re.search(LOCATION_RE, responseHeader)
                    if m: #and m.group(1) != uri
                        redirect += 1
                        uri = m.group(1)
                        #cookies = merge_cookies(cookies, responseCookies)
                        cookies = {} # do not send any cookies
                        scheme0 = scheme
                        host0 = host
                        port0 = port
                        continue
                    else:
                        break
                else:
                    break

        return {
            'status' : responseStatus,
            'content': False if redirect > follow_redirects else (responseBody.decode('utf-8') if 'string' == self.option('return_type') else responseBody),
            'headers': responseHeaders,
            'cookies': responseCookies
        }


class EazyHttpException(Exception):
    pass

EazyHttp.Exception = EazyHttpException

class EazyHttpRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self, max_redirects):
        self.max_redirects = max_redirects
        self.redirect_count = 0

    def http_error_301(self, request, response, code, msg, headers):
        self.redirect_count += 1
        return response if self.redirect_count > self.max_redirects else super().http_error_301(request, response, code, msg, headers)

    def http_error_302(self, request, response, code, msg, headers):
        self.redirect_count += 1
        return response if self.redirect_count > self.max_redirects else super().http_error_302(request, response, code, msg, headers)

    def http_error_303(self, request, response, code, msg, headers):
        self.redirect_count += 1
        return response if self.redirect_count > self.max_redirects else super().http_error_303(request, response, code, msg, headers)

    def http_error_307(self, request, response, code, msg, headers):
        self.redirect_count += 1
        return response if self.redirect_count > self.max_redirects else super().http_error_307(request, response, code, msg, headers)

    def http_error_308(self, request, response, code, msg, headers):
        self.redirect_count += 1
        return response if self.redirect_count > self.max_redirects else super().http_error_308(request, response, code, msg, headers)

HTTP_RE = re.compile(r'HTTP/[\d\.]+\s+(\d{3})')
LOCATION_RE = re.compile(r'Location:\s*(\S+)', re.I)

def parse_http_header(responseHeader):
    responseHeaders = {}
    multiple_headers = ['set-cookie']
    for header in responseHeader:
        header = header if isinstance(header, tuple) else str(header).split(':', 2)
        if len(header) >= 2:
            # return lowercase headers as in spec
            k = header[0].strip().lower()
            v = header[1].strip()
            if k in multiple_headers:
                if k not in responseHeaders: responseHeaders[k] = [v]
                else: responseHeaders[k].append(v)
            else:
                responseHeaders[k] = v
    return responseHeaders

def parse_http_cookies(setCookies, onlyNameValue = False):
    cookies = {}
    if setCookies:
        for c in setCookies:
            cookie = parse_cookie(c, False, onlyNameValue)
            if isinstance(cookie, dict): cookies[cookie['name']] = cookie
    return cookies

def format_http_header(headers, output = list()):
    if len(headers):
        for key, val in headers.items():
            if isinstance(val, (list,tuple)):
                for v in val:
                    if (v is not None) and len(str(v)):
                        output.append(str(key) + ': ' + str(v))
            else:
                if (val is not None) and len(str(val)):
                    output.append(str(key) + ': ' + str(val))
    return output

def format_http_cookies(cookies, output = list()):
    if len(cookies):
        valid_cookies = []
        for cookie in cookies.values():
            if cookie:
                cookie_str = format_cookie(cookie)
                if len(cookie_str): valid_cookies.append(cookie_str)
        if len(valid_cookies): output.append('Cookie' + ': ' + '; '.join(valid_cookies))
    return output

def parse_cookie(s, isRaw = False, onlyNameValue = False):
    cookie = {}

    parts = str(s).split(';')
    for i, p in enumerate(parts): parts[i] = p.split('=', 2)

    part = parts[0] if len(parts) else None
    if not part: return None
    parts = parts[1:]
    name = urllib.parse.unquote(part[0].strip()) if not isRaw else part[0].strip()
    value = (urllib.parse.unquote(part[1].strip()) if not isRaw else part[1].strip()) if 1 < len(part) else None
    cookie['name'] = name
    cookie['value'] = value
    if onlyNameValue: return cookie

    cookie = {
        'isRaw' : isRaw,
        'name' : cookie['name'],
        'value' : cookie['value'],
        'expires' : '0',
        'path' : '/',
        'domain' : None,
        'secure' : False,
        'httponly' : False,
        'samesite' : None,
        'partitioned' : False
    }
    for part in parts:
        name = part[0].strip().lower()
        value = part[1].strip() if 1 < len(part) else True
        cookie[name] = value

    try:
        expires = datetime.fromtimestamp(int(cookie['expires']), tz=timezone.utc) if cookie['expires'].isnumeric() else datetime.strptime(cookie['expires'], '%a, %d %b %Y %H:%M:%S %Z')
    except Exception as e:
        expires = datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() + 60, tz=timezone.utc)
    cookie['expires'] = expires.strftime('%a, %d %b %Y %H:%M:%S %Z')

    if ('max-age' in cookie) and (int(cookie['max-age']) > 0 or expires.timestamp() > datetime.now(timezone.utc).timestamp()):
        cookie['expires'] = datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() + int(cookie['max-age']), tz=timezone.utc).strftime('%a, %d %b %Y %H:%M:%S %Z')

    return cookie

def format_cookie(cookie, toSet = False):
    RESERVED_CHARS_LIST = "=,; \t\r\n\v\f"
    RESERVED_CHARS_FROM = ['=', ',', ';', ' ', "\t", "\r", "\n", "\v", "\f"]
    RESERVED_CHARS_TO = ['%3D', '%2C', '%3B', '%20', '%09', '%0D', '%0A', '%0B', '%0C']

    if (not cookie) or not isinstance(cookie, dict): return ''

    if (not ('name' in cookie)) or (not cookie['name']): return '';

    isRaw = ('isRaw' in cookie) and cookie['isRaw']

    s = ''

    if isRaw:
        s = str(cookie['name'])
    else:
        s = str_replace(RESERVED_CHARS_FROM, RESERVED_CHARS_TO, str(cookie['name']))

    s += '='

    if not (('value' in cookie) and cookie['value']):
        if toSet:
            s += 'deleted; Expires=' + datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() - 31536001).strftime('%a, %d %b %Y %H:%M:%S %Z') + '; Max-Age=0'
        else:
            return ''
    else:
        s += str(cookie['value']) if isRaw else urllib.parse.quote(str(cookie['value']))

        expires = cookie['expires'] if 'expires' in cookie else datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() + 60, tz=timezone.utc)
        if isinstance(expires, int): expires = datetime.fromtimestamp(expires, tz=timezone.utc)
        if isinstance(expires, str): expires = datatime.strptime(expires, '%a, %d %b %Y %H:%M:%S %Z')
        maxAge = math.floor(max(0, expires.timestamp()-datetime.now(timezone.utc).timestamp()))

        if toSet:
            s += '; Expires=' + expires.strftime('%a, %d %b %Y %H:%M:%S %Z') + '; Max-Age=' + str(maxAge)
        elif not maxAge:
            return ''

    if toSet:
        if cookie['path']:
            s += '; Path=' + cookie['path']

        if cookie['domain']:
            s += '; Domain=' + cookie['domain']

        if cookie['secure']:
            s += '; Secure'

        if cookie['httponly']:
            s += '; HttpOnly'

        if cookie['samesite']:
            s += '; SameSite=' + cookie['samesite']

        if cookie['partitioned']:
            s += '; Partitioned'

    return s

def parse_chunked(chunked):
    content = b''
    CRLF = len(b"\r\n")
    l = len(chunked)
    start = 0
    i = 0
    while i < l:
        hex = ''
        c = chr(chunked[i]).upper()
        while ('0' <= c and c <= '9') or ('A' <= c and c <= 'F'):
            hex += c
            i += 1
            if i >= l: break
            c = chr(chunked[i]).upper()
        hl = len(hex)
        if not hl:
            break
        size = int(hex, 16)
        if 0 < size:
            content += chunked[start+hl+CRLF:start+hl+CRLF+size]
            start = i = start+hl+CRLF+size+CRLF
        else:
            break
    return content

def is_same_origin(host, host2, port, port2, protocol, protocol2):
    if (port != port2) or (protocol != protocol2): return False
    host = host.lower()
    host2 = host2.lower()
    if host == host2: return True # same host
    #if ('.' + host) == host2[-len(host)-1:]: return True # host2 is subdomain of host
    if ('.' + host2) == host[-len(host2)-1:]: return True # host is subdomain of host2
    return False

def path_resolve(path, basepath):
    if ('/' == path[0]) or (not basepath): return path # absolute
    if '/' == basepath: return basepath + path # from root

    p = path
    b = basepath
    absolute = False
    trailing = False

    if '/' == b[0]:
        absolute = True
        b = b[1:]
    if '/' == b[-1]:
        b = b[0:-1]
    if '/' == p[0]:
        p = p[1:]
    if '/' == p[-1]:
        trailing = True
        p = p[0:-1]

    #if not len(p) or not len(b): return ('/' if absolute else '' ) + path

    parts = p.split('/')
    base = b.split('/')

    while len(parts):
        if not len(base): return path
        if '.' == parts[0]:
            parts = parts[1:] # same dir
        elif '..' == parts[0]:
            parts = parts[1:]
            base = base[0:-1] # dir up
        else:
            if parts[0] == base[-1]: base = base[0:-1] # remove duplicate
            break # done
    path = ('/' if absolute else '') + '/'.join(base) + '/' + '/'.join(parts)
    if trailing and ('/' != path[-1]): path += '/'
    return path

def merge_cookies(cookies, setCookies):
    # TODO: take care of secure, samesite, .. cookie flags
    for name, setCookie in setCookies.items():
        if (name not in cookies) or (cookies[name]['value'] != setCookie['value']):
            cookies[name] = setCookie
    return cookies

def http_build_query_helper(key, val, arg_separator):
    if val is True: val = '1'
    elif val is False: val = '0'

    if val is not None:
        if isinstance(val, (list,tuple)):
            tmp = []
            for k, v in enumerate(val):
                if v is not None:
                    tmp.append(http_build_query_helper(key + "[" + str(k) + "]", v, arg_separator))
            return arg_separator.join(tmp)
        elif isinstance(val, dict):
            tmp = []
            for k, v in val.items():
                if v is not None:
                    tmp.append(http_build_query_helper(key + "[" + k + "]", v, arg_separator))
            return arg_separator.join(tmp)
        else:
            o = {}
            o[key] = val
            return urllib.parse.urlencode(o)
    else:
        return ''

def http_build_query(data, arg_separator = '&'):
    if isinstance(data, dict):
        tmp = []
        for key, value in data.items():
            query = http_build_query_helper(key, value, arg_separator)
            if len(query): tmp.append(query)
        return arg_separator.join(tmp)
    return ''

def str_replace(a1, a2, s):
    for i, s1 in enumerate(a1):
        s = s.replace(s1, a2[i])
    return s

def ucwords(string, delim = ' '):
    return delim.join([s[0].upper()+s[1:] for s in string.split(delim)])

# export it
__all__ = ['EazyHttp']
