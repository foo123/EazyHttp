<?php
/**
*    EazyHttp
*    easy, simple and fast HTTP requests for PHP, JavaScript, Python
*    https://github.com/foo123/EazyHttp
**/
if (!class_exists('EazyHttp', false))
{
class EazyHttp
{
    const VERSION = '0.1.0';

    protected $opts = array();

    public function __construct()
    {
        // some defaults
        $this->option('timeout',            30); // sec, default
        $this->option('follow_location',    1); // default
        $this->option('max_redirects',      3); // default
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

    public function get($uri, $data = array(), $headers = null, $cookies = null)
    {
        return $this->server_request('GET', $uri, $data, $headers, $cookies);
    }

    public function post($uri, $data = array(), $headers = null, $cookies = null)
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
        /*if (is_array($responseHeaders) && isset($responseHeaders['set-cookie']))
        {
            unset($responseHeaders['set-cookie']);
        }*/
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
        // TODO: support POST files ??
        // TODO: support receive binary data ??
        // TODO: support more methods, eg PUT, DELETE, ..
        if (empty($headers)) $headers = array();
        if (empty($cookies)) $cookies = array();

        $responseStatus = 0;
        $responseBody = false;
        $responseHeaders = array();
        $responseCookies = array();

        if (!empty($uri))
        {
            $method = strtoupper((string)$method);
            if ('POST' !== $method) $method = 'GET';

            if ('client' === $type)
            {
                if ('GET' === $method)
                {
                    $uri .= is_array($data) ? ((false === strpos($uri, '?') ? '?' : '&') . http_build_query($data, '', '&')) : '';
                    $data = '';
                }
                $responseBody = $this->do_http_client(
                    $method,
                    $uri,
                    $data
                );
            }
            else
            {
                $hs = array_merge(array(), $headers); $headers = array();
                foreach ($hs as $name => $value) $headers[ucwords(strtolower(trim($name)), '-')] = $value;
                $headers = array_merge(array('User-Agent' => 'EazyHttp', 'Accept' => '*/*'), $headers);
                if (('POST' === $method) && is_array($data))
                {
                    $headers['Content-Type'] = 'application/x-www-form-urlencoded';
                }
                $requestHeaders = $this->format_http_cookies($cookies, $this->format_http_header($headers, array()));

                if ('POST' === $method)
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
                                $requestHeaders,
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
                                $requestHeaders,
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
                                $requestHeaders,
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
        return $this;
    }

    protected function do_http_curl($method, $uri, $requestBody = '', $requestHeaders = array(), &$responseStatus = 0, &$responseHeaders = null, &$responseCookies = null)
    {
        set_time_limit(0);
        // init
        $curl = curl_init($uri);

        // setup
        $responseHeader = array();
        curl_setopt($curl, CURLOPT_RETURNTRANSFER,  true);
        curl_setopt($curl, CURLOPT_FOLLOWLOCATION,  !empty($this->option('follow_location')));
        curl_setopt($curl, CURLOPT_MAXREDIRS,       intval($this->option('max_redirects')));
        curl_setopt($curl, CURLOPT_TIMEOUT,         intval($this->option('timeout'))); // sec
        curl_setopt($curl, CURLOPT_HEADERFUNCTION,  function($curl, $header) use (&$responseHeader) {
            $responseHeader[] = trim($header);
            return strlen($header);
        });
        curl_setopt($curl, CURLOPT_HTTPHEADER,      $requestHeaders);

        if ('POST' === strtoupper($method))
        {
            curl_setopt($curl, CURLOPT_POST, true);
            curl_setopt($curl, CURLOPT_POSTFIELDS,  $requestBody);
        }
        else
        {
            curl_setopt($curl, CURLOPT_HTTPGET,     true);
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
        $responseCookies = $this->parse_http_cookies($responseHeaders);
        return $responseBody;
    }

    protected function do_http_file($method, $uri, $requestBody = '', $requestHeaders = array(), &$responseStatus = 0, &$responseHeaders = null, &$responseCookies = null)
    {
        set_time_limit(0);
        // setup
        $contentLength = strlen((string)$requestBody);
        // is content-length needed?? probably not
        $requestHeader = '';
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
                'method'            => 'POST' === strtoupper($method) ? 'POST' : 'GET',
                'header'            => $requestHeader,
                'content'           => (string)$requestBody,
                'follow_location'   => !empty($this->option('follow_location')),
                'max_redirects'     => intval($this->option('max_redirects')),
                'timeout'           => floatval($this->option('timeout')), // sec
                'ignore_errors'     => true,
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
            if (!empty($responseHeader) && preg_match('#HTTP/\\S*\\s+(\\d{3})#', $responseHeader[0], $m)) $responseStatus = (int)$m[1];
            $responseHeaders = $this->parse_http_header($responseHeader);
            $responseCookies = $this->parse_http_cookies($responseHeaders);
        }
        else
        {
            $responseStatus = 0;
            $responseHeaders = array();
            $responseCookies = array();
        }
        return $responseBody;
    }

    protected function do_http_socket($method, $uri, $requestBody = '', $requestHeaders = array(), &$responseStatus = 0, &$responseHeaders = null, &$responseCookies = null)
    {
        set_time_limit(0);
        $timeout = intval($this->option('timeout')); // sec
        $follow_location = !empty($this->option('follow_location'));
        $max_redirects = intval($this->option('max_redirects'));
        $redirects = 0;
        while ($redirects <= $max_redirects)
        {
            $parts = parse_url($uri);
            if (!isset($parts['host']))
            {
                $responseStatus = 0;
                return false;
            }
            $host = $parts['host'];
            $scheme = isset($parts['scheme']) ? strtolower($parts['scheme']) : 'http';
            $port = isset($parts['port']) ? intval($parts['port']) : ('https' === $scheme ? 443 : 80);
            $path = isset($parts['path']) ? $parts['path'] : '/';
            if (!strlen($path)) $path = '/';
            $query = isset($parts['query']) ? $parts['query'] : '';
            if (strlen($query)) $path .= '?' . $query;

            // open socket, openssl extension needed..?
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
            $chunk = 1024; // bytes

            $request = ''; $response = '';

            // send request
            $request .= ('POST' === strtoupper($method) ? 'POST' : 'GET')." $path HTTP/1.1";
            $request .= "\r\n"."Host: $host";
            if (!empty($requestHeaders)) $request .= "\r\n".implode("\r\n", (array)$requestHeaders);
            $request .= "\r\n"."Content-Length: $contentLength";
            $request .= "\r\n"."Connection: close";
            $request .= "\r\n\r\n".($contentLength ? ((string)$requestBody) : "");
            fwrite($fp, $request);

            // receive response
            while (!feof($fp)) $response .= fread($fp, $chunk);

            // close socket
            fclose($fp);

            // parse headers and content
            $response = explode("\r\n\r\n", $response, 2);
            $responseHeader = isset($response[0]) ? $response[0] : '';
            $responseBody = isset($response[1]) ? $response[1] : '';
            if (!empty($responseHeader) && preg_match('#HTTP/\\S*\\s+(\\d{3})#i', $responseHeader, $m))
            {
                $responseStatus = (int)$m[1];
            }
            $responseHeaders = $this->parse_http_header(empty($responseHeader) ? array() : array_map('trim', preg_split('#[\\r\\n]+#', $responseHeader)));
            $responseCookies = $this->parse_http_cookies($responseHeaders);
            if (isset($responseHeaders['transfer-encoding']) && ('chunked' === strtolower($responseHeaders['transfer-encoding'][0])))
            {
                // https://en.wikipedia.org/wiki/Chunked_transfer_encoding
                $responseBody = $this->parse_chunked($responseBody);
            }
            if ($follow_location && (301 <= $responseStatus && $responseStatus <= 308) && preg_match('#Location:\\s*(\\S+)#i', $responseHeader, $m) && ($uri !== $m[1]))
            {
                ++$redirects;
                $uri = $m[1];
                continue;
            }
            else
            {
                break;
            }
        }
        return $responseBody;
    }

    protected function do_http_client($method, $uri, $requestBody = '')
    {
        switch (strtoupper($method))
        {
            case 'POST':
            if (!empty($requestBody))
            {
                if (is_array($requestBody))
                {
                    $requestData = $requestBody;
                }
                else
                {
                    $requestData = array();
                    @parse_str((string)$requestBody, $requestData);
                }
                $requestData = $this->flatten($requestData);
                $formData = implode('', array_map(function($name, $value) {return '<input type="hidden" name="'.$name.'" value="'.$value.'" />';}, array_keys($requestData), $requestData));
            }
            else
            {
                $formData = '';
            }
            try {
                @header('Content-Type: text/html; charset=UTF-8', true, 200);
                @header('Date: '.$this->datetime(time()), true, 200);
                echo ('<!DOCTYPE html><html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"/><title>POST '.$uri.'</title></head><body onload="do_post();"><form name="post_form" id="post_form" method="post" enctype="application/x-www-form-urlencoded" action="'.$uri.'">'.$formData.'</form><script type="text/javascript">function do_post() {document.post_form.submit();}</script></body></html>');
            } catch (Exception $e) {
            }
            break;

            case 'GET':
            default:
            try {
                @header("Location: $uri", true, 303);
                @header('Content-Type: text/html; charset=UTF-8', true, 303);
                @header('Date: '.$this->datetime(time()), true, 303);
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
        foreach ($responseHeader as $header)
        {
            $header = explode(':', $header, 2);
            if (count($header) >= 2)
            {
                // return lowercase headers as in spec
                $k = /*ucwords(*/strtolower(trim($header[0]))/*, '-')*/; $v = trim($header[1]);
                if (!isset($responseHeaders[$k])) $responseHeaders[$k] = array($v);
                else $responseHeaders[$k][] = $v;
            }
        }
        return $responseHeaders;
    }

    protected function parse_http_cookies($responseHeaders)
    {
        $cookies = array();
        if (!empty($responseHeaders) && !empty($responseHeaders['set-cookie']))
        {
            foreach ($responseHeaders['set-cookie'] as $cookie_str)
            {
                $cookie = $this->parse_cookie($cookie_str);
                if (!empty($cookie)) $cookies[] = $cookie;
            }
        }
        return $cookies;
    }

    protected function format_http_cookies($cookies, $output = array())
    {
        if (!empty($cookies))
        {
            $valid_cookies = array();
            foreach ($cookies as $cookie)
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

    protected function parse_cookie($str, $isRaw = false)
    {
        $cookie = array(
            'isRaw'         => $isRaw,
            'expires'       => 0,
            'path'          => '/',
            'domain'        => null,
            'secure'        => false,
            'httponly'      => false,
            'samesite'      => null,
            'partitioned'   => false,
        );

        $parts = explode(';', strval($str));
        foreach ($parts as $i => $part) $parts[$i] = explode('=', $part, 2);

        $part = array_shift($parts);
        $name = !$isRaw ? urldecode(trim($part[0])) : trim($part[0]);
        $value = isset($part[1]) ? (!$isRaw ? urldecode(trim($part[1])) : trim($part[1])) : null;
        $cookie['name'] = $name;
        $cookie['value'] = $value;

        $data = array();
        foreach ($parts as $part)
        {
            $name = strtolower(trim($part[0]));
            $value = isset($part[1]) ? trim($part[1]) : true;
            $data[$name] = $value;
        }
        $cookie = array_merge($cookie, $data);

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

        $str = '';

        if ($isRaw)
        {
            $str = strval($cookie['name']);
        }
        else
        {
            $str = str_replace($RESERVED_CHARS_FROM, $RESERVED_CHARS_TO, strval($cookie['name']));
        }

        $str .= '=';

        if ('' === (string) $cookie['value'])
        {
            if ($toSet)
            {
                $str .= 'deleted; Expires='.gmdate('D, d M Y H:i:s T', time() - 31536001).'; Max-Age=0';
            }
            else
            {
                return '';
            }
        }
        else
        {
            $str .= $isRaw ? strval($cookie['value']) : rawurlencode(strval($cookie['value']));
            if ($toSet)
            {
                if (0 !== $cookie['expires'])
                {
                    $str .= '; Expires='.gmdate('D, d M Y H:i:s T', $cookie['expires']).'; Max-Age='.max(0, $cookie['expires']-time());
                }
            }
        }

        if ($toSet)
        {
            if (isset($cookie['path']))
            {
                $str .= '; Path='.$cookie['path'];
            }

            if (isset($cookie['domain']))
            {
                $str .= '; Domain='.$cookie['domain'];
            }

            if (!empty($cookie['secure']))
            {
                $str .= '; Secure';
            }

            if (!empty($cookie['httponly']))
            {
                $str .= '; HttpOnly';
            }

            if (isset($cookie['samesite']))
            {
                $str .= '; SameSite='.$cookie['samesite'];
            }

            if (!empty($cookie['partitioned']))
            {
                $str .= '; Partitioned';
            }
        }

        return $str;
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

    protected function datetime($time = null)
    {
        if (is_null($time)) $time = time();
        return gmdate('D, d M Y H:i:s', $time) . ' GMT';
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