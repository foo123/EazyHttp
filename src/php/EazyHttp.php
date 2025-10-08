<?php
/**
*   EazyHttp
*   easy, simple and fast HTTP requests for PHP, JavaScript, Python
*   @version: 1.2.0
*
*   https://github.com/foo123/EazyHttp
**/
if (!class_exists('EazyHttp', false))
{
class EazyHttp
{
    const VERSION = '1.2.0';

    protected $opts = array();

    public function __construct()
    {
        // some defaults
        $this->option('timeout',            30); // sec, default
        $this->option('follow_redirects',   3); // default
        $this->option('return_type',        'string'); // default
        $this->option('methods',            array('curl', 'file', 'socket')); // default
    }

    public function option($key, $val = null)
    {
        $nargs = func_num_args();
        if (1 == $nargs)
        {
            return isset($this->opts[$key]) ? $this->opts[$key] : null;
        }
        elseif (1 < $nargs)
        {
            $this->opts[$key] = $val;
        }
        return $this;
    }

    public function get($uri, $data = null, $headers = null, $cookies = null)
    {
        return $this->server_request('GET', $uri, $data, $headers, $cookies);
    }

    public function post($uri, $data = null, $headers = null, $cookies = null)
    {
        return $this->server_request('POST', $uri, $data, $headers, $cookies);
    }

    public function getClient($uri, $data = array())
    {
        $this->client_request('GET', $uri, $data);
        return null;
    }

    public function postClient($uri, $data = array())
    {
        $this->client_request('POST', $uri, $data);
        return null;
    }

    protected function server_request($method, $uri, $data = null, $headers = null, $cookies = null)
    {
        $this->do_http(
            $method,
            $uri,
            $data,
            $headers,
            $cookies,
            $responseBody,
            $responseStatus,
            $responseHeaders,
            $responseCookies,
            'server'
        );

        return (object)array(
            'status'    => $responseStatus,
            'content'   => $responseBody,
            'headers'   => $responseHeaders,
            'cookies'   => $responseCookies
        );
    }

    protected function client_request($method, $uri, $data = null)
    {
        $this->do_http(
            $method,
            $uri,
            $data,
            null,
            null,
            $responseBody,
            $responseStatus,
            $responseHeaders,
            $responseCookies,
            'client'
        );
    }

    protected function do_http($method = 'GET', $uri = '', $data = null, $headers = null, $cookies = null, &$responseBody = '', &$responseStatus = 0, &$responseHeaders = null, &$responseCookies = null, $type = 'server')
    {
        // for POST files user can pass the multipart encoded data and set Content-Type
        // binary data are passed also as strings and set appropriate Content-Type
        // for PUT, PATCH and DELETE methods code is ready
        $responseStatus = 0;
        $responseBody = false;
        $responseHeaders = array();
        $responseCookies = array();

        if (!empty($uri))
        {
            $method = strtoupper((string)$method);
            if (!in_array($method, array('POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'))) $method = 'GET';

            if (is_object($data) && !is_null($data))
            {
                $data = (array)$data;
            }

            if ('client' === $type)
            {
                if (!('POST' === $method || 'PUT' === $method || 'PATCH' === $method))
                {
                    $uri .= is_array($data) ? ((false === strpos($uri, '?') ? '?' : '&') . http_build_query($data, '', '&')) : '';
                    $data = null;
                }
                $responseBody = $this->do_http_client(
                    $method,
                    $uri,
                    $data
                );
            }
            else
            {
                if (empty($headers)) $headers = array();
                $array = array_merge(array(), (array)$headers);
                $headers = array('User-Agent' => 'EazyHttp', 'Accept' => '*/*');
                foreach ($array as $name => $value)
                {
                    $headers[ucwords(strtolower(trim($name)), '-')] = $value;
                }

                if (empty($cookies)) $cookies = array();
                $array = array_merge(array(), (array)$cookies);
                $cookies = array();
                foreach ($array as $name => $value)
                {
                    $cookies[$name] = is_array($value) ? array_merge(array(), $value) : array('value' => $value);
                    $cookies[$name]['name'] = $name;
                }

                if (('POST' === $method || 'PUT' === $method || 'PATCH' === $method) && is_array($data))
                {
                    $headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }

                if ('POST' === $method || 'PUT' === $method || 'PATCH' === $method)
                {
                    $data = is_array($data) ? http_build_query($data, '', '&') : (is_string($data) ? $data : '');
                }
                else
                {
                    $uri .= is_array($data) ? ((false === strpos($uri, '?') ? '?' : '&') . http_build_query($data, '', '&')) : '';
                    $data = '';
                }

                $methods = $this->option('methods');
                if (is_array($methods) && !empty($methods))
                {
                    foreach ($methods as $do_http)
                    {
                        $do_http = strtolower(strval($do_http));

                        if (('curl' === $do_http) && function_exists('curl_init') && function_exists('curl_exec'))
                        {
                            $responseBody = $this->do_http_curl(
                                $method,
                                $uri,
                                $data,
                                $headers,
                                $cookies,
                                $responseStatus,
                                $responseHeaders,
                                $responseCookies
                            );
                            break;
                        }
                        elseif (('file' === $do_http) && function_exists('stream_context_create') && function_exists('file_get_contents') && ini_get('allow_url_fopen'))
                        {
                            $responseBody = $this->do_http_file(
                                $method,
                                $uri,
                                $data,
                                $headers,
                                $cookies,
                                $responseStatus,
                                $responseHeaders,
                                $responseCookies
                            );
                            break;
                        }
                        elseif (('socket' === $do_http) && function_exists('fsockopen'))
                        {
                            $responseBody = $this->do_http_socket(
                                $method,
                                $uri,
                                $data,
                                $headers,
                                $cookies,
                                $responseStatus,
                                $responseHeaders,
                                $responseCookies
                            );
                            break;
                        }
                    }
                }
            }
        }
    }

    protected function do_http_curl($method, $uri, $requestBody = '', $headers = array(), $cookies = array(), &$responseStatus = 0, &$responseHeaders = null, &$responseCookies = null)
    {
        set_time_limit(0);
        // init
        $curl = curl_init($uri);

        // setup
        $requestHeaders = $this->format_http_cookies($cookies, $this->format_http_header($headers, array()));
        $responseHeader = array();
        curl_setopt($curl, CURLOPT_RETURNTRANSFER,          true);
        curl_setopt($curl, CURLOPT_FOLLOWLOCATION,          0 < intval($this->option('follow_redirects')));
        curl_setopt($curl, CURLOPT_MAXREDIRS,               intval($this->option('follow_redirects')));
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT,          intval($this->option('timeout'))); // sec
        curl_setopt($curl, CURLOPT_TIMEOUT,                 intval($this->option('timeout'))); // sec
        curl_setopt($curl, CURLOPT_HTTP_TRANSFER_DECODING,  1); // default
        curl_setopt($curl, CURLOPT_HEADERFUNCTION,          function($curl, $header) use (&$responseHeader) {
            $responseHeader[] = trim($header);
            return strlen($header);
        });
        // sets cookies with requestHeaders
        //curl_setopt($curl, CURLOPT_COOKIE,                $headers['Cookie']);
        curl_setopt($curl, CURLOPT_HTTPHEADER,              $requestHeaders);

        if ('POST' === $method || 'PUT' === $method || 'PATCH' === $method || 'DELETE' === $method || 'HEAD' === $method)
        {
            if ('POST' === $method) curl_setopt($curl, CURLOPT_POST, true);
            //else if ('PUT' === $method) curl_setopt($curl, CURLOPT_PUT, true); // deprecated
            else curl_setopt($curl, CURLOPT_CUSTOMREQUEST, $method);
            curl_setopt($curl, CURLOPT_POSTFIELDS, $requestBody);
        }
        else
        {
            curl_setopt($curl, CURLOPT_HTTPGET, true);
        }

        // make request
        try {
            $responseBody = @curl_exec($curl);
            $responseStatus = @curl_getinfo($curl, CURLINFO_HTTP_CODE);
        } catch (Exception $e) {
            $responseBody = false;
        }

        // close
        curl_close($curl);

        // parse headers and content
        $responseHeaders = $this->parse_http_header($responseHeader);
        $responseCookies = empty($responseHeaders['set-cookie']) ? array() : $this->parse_http_cookies($responseHeaders['set-cookie']);
        return $responseBody;
    }

    protected function do_http_file($method, $uri, $requestBody = '', $headers = array(), $cookies = array(), &$responseStatus = 0, &$responseHeaders = null, &$responseCookies = null)
    {
        set_time_limit(0);
        // setup
        $contentLength = strlen((string)$requestBody);
        // is content-length needed?? probably not
        $requestHeader = '';
        $requestHeaders = $this->format_http_cookies($cookies, $this->format_http_header($headers, array()));
        if (!empty($requestHeaders))
        {
            $requestHeader = implode("\r\n", (array)$requestHeaders);
            //$requestHeader .= "\r\nContent-Length: $contentLength";
        }
        else
        {
            //$requestHeader = "Content-Length: $contentLength";
        }
        $http = stream_context_create(array(
            'http' => array(
                'method'            => $method,
                'header'            => $requestHeader,
                'content'           => (string)$requestBody,
                'follow_location'   => 0 < intval($this->option('follow_redirects')),
                'max_redirects'     => intval($this->option('follow_redirects')) + 1,
                'timeout'           => floatval($this->option('timeout')), // sec
                'ignore_errors'     => false // default
            ),
        ));

        // open, make request and close
        try {
            $responseBody = @file_get_contents($uri, false, $http);
        } catch (Exception $e) {
            $responseBody = false;
        }

        // parse headers and content
        if (!empty($http_response_header))
        {
            $responseHeader = array_merge(array(), $http_response_header);
            if (!empty($responseHeader) && preg_match_all('#HTTP/[\\d\\.]+\\s+(\\d{3})#', implode("\r\n", $responseHeader), $m, PREG_OFFSET_CAPTURE))
            {
                $responseStatus = intval($m[1][count($m[1])-1][0]);
            }
            $responseHeaders = $this->parse_http_header($responseHeader);
            $responseCookies = empty($responseHeaders['set-cookie']) ? array() : $this->parse_http_cookies($responseHeaders['set-cookie']);
        }
        else
        {
            $responseStatus = 0;
            $responseHeaders = array();
            $responseCookies = array();
        }
        return $responseBody;
    }

    protected function do_http_socket($method, $uri, $requestBody = '', $headers = array(), $cookies = array(), &$responseStatus = 0, &$responseHeaders = null, &$responseCookies = null)
    {
        set_time_limit(0);
        $timeout = intval($this->option('timeout')); // sec
        $follow_redirects = intval($this->option('follow_redirects'));
        $redirect = 0;
        $scheme0 = null;
        $host0 = null;
        $port0 = null;
        $path0 = null;
        while ($redirect <= $follow_redirects)
        {
            $parts = parse_url($uri);
            if (!isset($parts['host']) || !strlen($parts['host']))
            {
                $parts['host'] = $host0;
            }
            if (!isset($parts['host']) || !strlen($parts['host']))
            {
                $responseStatus = 0;
                return false;
            }
            $host = $parts['host'];
            $scheme = isset($parts['scheme']) && strlen($parts['scheme']) ? strtolower($parts['scheme']) : ($scheme0 ? $scheme0 : 'http');
            $port = isset($parts['port']) ? intval($parts['port']) : ($port0 ? $port0 : ('https' === $scheme ? 443 : 80));
            $path = isset($parts['path']) ? $parts['path'] : '/';
            if (!strlen($path)) $path = '/';
            $path = $this->path_resolve($path, $path0);
            $path0 = $path;
            if (isset($parts['query']) && strlen($parts['query'])) $path .= '?' . $parts['query'];

            if (0 < $redirect)
            {
                $method = 'GET';
                $requestBody = '';

                if (isset($headers['Content-Type'])) unset($headers['Content-Type']);
                if (isset($headers['Content-Encoding'])) unset($headers['Content-Encoding']);
                if (isset($headers['Content-Length'])) unset($headers['Content-Length']);

                if (!$this->is_same_origin($host, $host0, $port, $port0, $scheme, $scheme0))
                {
                    $responseHeaders = array();
                    $cookies = array();
                    //if (isset($headers['Cookie'])) unset($headers['Cookie']);
                    if (isset($headers['Authorization'])) unset($headers['Authorization']);
                    if (isset($headers['Proxy-Authorization'])) unset($headers['Proxy-Authorization']);
                }
                if (isset($headers['Referer'])) unset($headers['Referer']);
            }

            // open socket, openssl extension needed..?
            $timedout = false;
            $startTime = microtime(true);
            try {
                $fp = @fsockopen(('https' === $scheme ? 'ssl://' : '') . $host, $port, $errno, $errstr, $timeout);
            } catch (Exception $e) {
                $fp = null;
            }
            if (!$fp)
            {
                $responseStatus = 0;
                return false;
            }

            // make request
            $contentLength = strlen((string)$requestBody);
            $headers['Content-Length'] = $contentLength;
            $headers['Host'] = $host . (('https' === $scheme && 443 === $port) || ('http' === $scheme && 80 === $port) ? '' : ":{$port}");
            $headers['Connection'] = 'close';
            if (isset($headers['Cookie'])) unset($headers['Cookie']);
            $requestHeaders = $this->format_http_cookies($cookies, $this->format_http_header($headers, array()));
            $chunk = 1024; // bytes

            $request = ''; $response = '';

            // send request
            $request .= "$method $path HTTP/1.1";
            $request .= "\r\n" . implode("\r\n", $requestHeaders);
            $request .= "\r\n\r\n" . ($contentLength ? ((string)$requestBody) : '');
            fwrite($fp, $request);

            // receive response
            $check_timeout = false;
            while (!feof($fp))
            {
                if ($check_timeout && (microtime(true) - $startTime > $timeout))
                {
                    $timedout = true;
                    break;
                }
                $response .= fread($fp, $chunk);
                // check only half the time for better performance
                $check_timeout = !$check_timeout;
            }

            // close socket
            fclose($fp);

            if ($timedout)
            {
                $responseStatus = 0;
                return false;
            }

            // parse headers and content
            $response = explode("\r\n\r\n", $response, 2);
            $responseHeader = isset($response[0]) ? $response[0] : '';
            $responseBody = isset($response[1]) ? $response[1] : '';
            if (!empty($responseHeader) && preg_match('#HTTP/[\\d\\.]+\\s+(\\d{3})#', $responseHeader, $m))
            {
                $responseStatus = intval($m[1]);
            }
            $responseHeaders = array_merge(empty($responseHeaders) ? array() : $responseHeaders, empty($responseHeader) ? array() : $this->parse_http_header(array_map('trim', preg_split('#[\\r\\n]+#', $responseHeader))));
            $responseCookies = empty($responseHeaders['set-cookie']) ? array() : $this->parse_http_cookies($responseHeaders['set-cookie']);
            if (isset($responseHeaders['transfer-encoding']) && ('chunked' === strtolower($responseHeaders['transfer-encoding'])))
            {
                // https://en.wikipedia.org/wiki/Chunked_transfer_encoding
                $responseBody = $this->parse_chunked($responseBody);
            }
            if ((0 < $follow_redirects) && (301 <= $responseStatus && $responseStatus <= 308) && preg_match('#Location:\\s*(\\S+)#i', $responseHeader, $m) /*&& ($uri !== $m[1])*/)
            {
                ++$redirect;
                $uri = $m[1];
                //$cookies = $this->merge_cookies($cookies, $responseCookies);
                $cookies = array(); // do not send any cookies
                $scheme0 = $scheme;
                $host0 = $host;
                $port0 = $port;
                continue;
            }
            else
            {
                break;
            }
        }
        return $redirect > $follow_redirects ? false : $responseBody;
    }

    protected function do_http_client($method, $uri, $requestBody = '')
    {
        switch ($method)
        {
            case 'POST':
            case 'PUT':
            case 'PATCH':
            if (is_string($requestBody))
            {
                $parsedBody = array();
                @parse_str($requestBody, $parsedBody);
                $requestBody = $parsedBody;
                $parsedBody = null;
            }
            if (is_array($requestBody) || is_object($requestBody))
            {
                $requestData = $this->flatten((array)$requestBody);
                $formData = implode('', array_map(function($name, $value) {return '<input type="hidden" name="'.htmlspecialchars($name).'" value="'.htmlspecialchars($value).'" />';}, array_keys($requestData), $requestData));
            }
            else
            {
                $formData = '';
            }
            try {
                @header('Content-Type: text/html; charset=UTF-8', true, 200);
                @header('Date: ' . gmdate('D, d M Y H:i:s', time()) . ' GMT', true, 200);
                echo ('<!DOCTYPE html><html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"/><title>'.$method.' '.$uri.'</title></head><body onload="do_send();"><form name="send_form" id="send_form" method="'.$method.'" enctype="application/x-www-form-urlencoded" action="'.$uri.'">'.$formData.'</form><script type="text/javascript">function do_send() {document.send_form.submit();}</script></body></html>');
            } catch (Exception $e) {
            }
            break;

            case 'GET':
            default:
            try {
                @header("Location: $uri", true, 302);
                @header('Content-Type: text/html; charset=UTF-8', true, 302);
                @header('Date: ' . gmdate('D, d M Y H:i:s', time()) . ' GMT', true, 302);
                echo ('<!DOCTYPE html><html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"/><meta http-equiv="refresh" content="0; URL='.$uri.'"/><title>GET '.$uri.'</title></head><body onload="do_get();"><script type="text/javascript">function do_get() {window.location.href = "'.$uri.'";}</script></body></html>');
            } catch (Exception $e) {
            }
            break;
        }
        return '';
    }

    /*protected function do_http_request($method, $uri, $requestBody = '', $requestHeaders = array(), &$responseStatus = 0, &$responseHeaders = null, &$responseCookies = null, $options = array())
    {
        // not available
        $responseBody = http_request($method, $uri, $requestBody, $opts, &$info);
        return $responseBody;
    }*/

    // utils ---------------------------------
    protected function is_same_origin($host, $host2, $port, $port2, $protocol, $protocol2)
    {
        if (($port !== $port2) || ($protocol !== $protocol2)) return false;
        $host = strtolower($host); $host2 = strtolower($host2);
        if ($host === $host2) return true; // same host
        //if (('.' . $host) === substr($host2, -strlen($host)-1)) return true; // host2 is subdomain of host
        if (('.' . $host2) === substr($host, -strlen($host2)-1)) return true; // host is subdomain of host2
        return false;
    }

    protected function path_resolve($path, $basepath)
    {
        if (('/' === substr($path, 0, 1)) || !$basepath) return $path; // absolute
        if ('/' === $basepath) return $basepath . $path; // from root

        $p = $path;
        $b = $basepath;
        $absolute = false;
        $trailing = false;

        if ('/' === substr($b, 0, 1))
        {
            $absolute = true;
            $b = substr($b, 1);
        }
        if ('/' === substr($b, -1))
        {
            $b = substr($b, 0, -1);
        }
        if ('/' === substr($p, 0, 1))
        {
            $p = substr($p, 1);
        }
        if ('/' === substr($p, -1))
        {
            $trailing = true;
            $p = substr($p, 0, -1);
        }

        //if (!strlen($p) || !strlen($b)) return ($absolute ? '/' : '' ) . $path;

        $parts = explode('/', $p);
        $base = explode('/', $b);

        while (count($parts))
        {
            if (!count($base)) return $path;
            if ('.' === $parts[0])
            {
                array_shift($parts); // same dir
            }
            else if ('..' === $parts[0])
            {
                array_shift($parts);
                array_pop($base); // dir up
            }
            else
            {
                if ($parts[0] === $base[count($base)-1]) array_pop($base); // remove duplicate
                break; // done
            }
        }
        $path = ($absolute ? '/' : '') . implode('/', $base) . '/' . implode('/', $parts);
        if ($trailing && ('/' !== substr($path, -1))) $path .= '/';
        return $path;
    }

    protected function merge_cookies($cookies, $setCookies)
    {
        // TODO: take care of secure, samesite, .. cookie flags
        foreach ($setCookies as $name => $setCookie)
        {
            if (!isset($cookies[$name]) || ($cookies[$name]['value'] !== $setCookie['value']))
            {
                $cookies[$name] = $setCookie;
            }
        }
        return $cookies;
    }

    protected function format_http_header($headers, $output = array())
    {
        if (!empty($headers))
        {
            foreach ($headers as $key => $val)
            {
                if (is_array($val))
                {
                    foreach ($val as $v)
                    {
                        if (isset($v) && strlen((string)$v))
                        {
                            $output[] = ((string)$key) . ': ' . ((string)$v);
                        }
                    }
                }
                else
                {
                    if (isset($val) && strlen((string)$val))
                    {
                        $output[] = ((string)$key) . ': ' . ((string)$val);
                    }
                }
            }
        }
        return $output;
    }

    protected function parse_http_header($responseHeader)
    {
        $responseHeaders = array();
        $multiple_headers = array('set-cookie');
        foreach ($responseHeader as $header)
        {
            $header = explode(':', (string)$header, 2);
            if (count($header) >= 2)
            {
                // return lowercase headers as in spec
                $k = /*ucwords(*/strtolower(trim($header[0]))/*, '-')*/;
                $v = trim($header[1]);
                if (in_array($k, $multiple_headers))
                {
                    if (!isset($responseHeaders[$k])) $responseHeaders[$k] = array($v);
                    else $responseHeaders[$k][] = $v;
                }
                else
                {
                    $responseHeaders[$k] = $v;
                }
            }
        }
        return $responseHeaders;
    }

    protected function parse_http_cookies($setCookies, $onlyNameValue = false)
    {
        $cookies = array();
        if (!empty($setCookies))
        {
            foreach ($setCookies as $cookie_str)
            {
                $cookie = $this->parse_cookie($cookie_str, false, $onlyNameValue);
                if (!empty($cookie)) $cookies[$cookie['name']] = $cookie;
            }
        }
        return $cookies;
    }

    protected function format_http_cookies($cookies, $output = array())
    {
        if (!empty($cookies))
        {
            $valid_cookies = array();
            foreach ($cookies as $name => $cookie)
            {
                if (!empty($cookie))
                {
                    $cookie_str = $this->format_cookie($cookie, false);
                    if (strlen($cookie_str)) $valid_cookies[] = $cookie_str;
                }
            }
            if (!empty($valid_cookies)) $output[] = 'Cookie' . ': ' . implode('; ', $valid_cookies);
        }
        return $output;
    }

    protected function parse_cookie($s, $isRaw = false, $onlyNameValue = false)
    {
        $cookie = array();
        $parts = explode(';', strval($s));
        foreach ($parts as $i => $part) $parts[$i] = explode('=', $part, 2);

        $part = array_shift($parts);
        $name = !$isRaw ? urldecode(trim($part[0])) : trim($part[0]);
        $value = isset($part[1]) ? (!$isRaw ? urldecode(trim($part[1])) : trim($part[1])) : null;
        $cookie['name'] = $name;
        $cookie['value'] = $value;
        if ($onlyNameValue) return $cookie;

        $cookie = array(
            'isRaw'         => $isRaw,
            'name'          => $cookie['name'],
            'value'         => $cookie['value'],
            'expires'       => 0,
            'path'          => '/',
            'domain'        => null,
            'secure'        => false,
            'httponly'      => false,
            'samesite'      => null,
            'partitioned'   => false,
        );
        foreach ($parts as $part)
        {
            $name = strtolower(trim($part[0]));
            $value = isset($part[1]) ? trim($part[1]) : true;
            $cookie[$name] = $value;
        }

        if (!is_numeric($cookie['expires']))
        {
            $cookie['expires'] = strtotime($cookie['expires']) || 0;
        }
        $cookie['expires'] = 0 < $cookie['expires'] ? (int)$cookie['expires'] : 0;

        if (isset($cookie['max-age']) && ($cookie['max-age'] > 0 || $cookie['expires'] > time()))
        {
            $cookie['expires'] = time() + (int)$cookie['max-age'];
        }

        return $cookie;
    }

    protected function format_cookie($cookie, $toSet = false)
    {
        $RESERVED_CHARS_LIST = "=,; \t\r\n\v\f";
        $RESERVED_CHARS_FROM = array('=', ',', ';', ' ', "\t", "\r", "\n", "\v", "\f");
        $RESERVED_CHARS_TO = array('%3D', '%2C', '%3B', '%20', '%09', '%0D', '%0A', '%0B', '%0C');

        if (empty($cookie)) return '';

        $cookie = (array)$cookie;

        if (!isset($cookie['name'])) return '';

        $isRaw = !empty($cookie['isRaw']);

        $s = '';

        if ($isRaw)
        {
            $s = strval($cookie['name']);
        }
        else
        {
            $s = str_replace($RESERVED_CHARS_FROM, $RESERVED_CHARS_TO, strval($cookie['name']));
        }

        $s .= '=';

        if ('' === (string) $cookie['value'])
        {
            if ($toSet)
            {
                $s .= 'deleted; Expires=' . gmdate('D, d M Y H:i:s T', time() - 31536001) . '; Max-Age=0';
            }
            else
            {
                return '';
            }
        }
        else
        {
            $s .= $isRaw ? strval($cookie['value']) : rawurlencode(strval($cookie['value']));

            $expires = isset($cookie['expires']) ? (intval($cookie['expires'])||0) : (time() + 60);
            $maxAge = max(0, $expires-time());

            if ($toSet)
            {
                $s .= '; Expires=' . gmdate('D, d M Y H:i:s T', $expires) . '; Max-Age=' . $maxAge;
            }
            elseif (!$maxAge)
            {
                return '';
            }
        }

        if ($toSet)
        {
            if (isset($cookie['path']))
            {
                $s .= '; Path=' . $cookie['path'];
            }

            if (isset($cookie['domain']))
            {
                $s .= '; Domain=' . $cookie['domain'];
            }

            if (!empty($cookie['secure']))
            {
                $s .= '; Secure';
            }

            if (!empty($cookie['httponly']))
            {
                $s .= '; HttpOnly';
            }

            if (isset($cookie['samesite']))
            {
                $s .= '; SameSite=' . $cookie['samesite'];
            }

            if (!empty($cookie['partitioned']))
            {
                $s .= '; Partitioned';
            }
        }

        return $s;
    }

    protected function parse_chunked($chunked)
    {
        $content = '';
        $CRLF = strlen("\r\n");
        $l = strlen($chunked);
        $start = 0;
        $i = 0;
        while ($i < $l)
        {
            $hex = '';
            $c = strtoupper($chunked[$i]);
            while (('0' <= $c && $c <= '9') || ('A' <= $c && $c <= 'F'))
            {
                $hex .= $c;
                ++$i;
                if ($i >= $l) break;
                $c = strtoupper($chunked[$i]);
            }
            $hl = strlen($hex);
            if (!$hl)
            {
                break;
            }
            $size = hexdec($hex);
            if (0 < $size)
            {
                $content .= substr($chunked, $start+$hl+$CRLF, $size);
                $start = $i = $start+$hl+$CRLF+$size+$CRLF;
            }
            else
            {
                break;
            }
        }
        return $content;
    }

    protected function flatten($input, $output = array(), $prefix = null)
    {
        if (is_array($input) || is_object($input))
        {
            foreach ((array)$input as $key => $val)
            {
                $name = (string)(empty($prefix) ? $key : ($prefix."[$key]"));

                if (is_array($val) || is_object($val)) $output = $this->flatten($val, $output, $name);
                else $output[$name] = $val;
            }
            return $output;
        }
        return $input;
    }
}
class EazyHttpException extends Exception
{
}
}