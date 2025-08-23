<?php
/**
*    EazyHttp
*    simple and fast HTPP requests for PHP, Python, JavaScript
*    https://github.com/foo123/EazyHttp
**/
if (!class_exists('EazyHttp'))
{
class EazyHttp
{
    public function __construct()
    {
    }

    public function request($method, $uri, $data = null, $headers = null, $cookies = null)
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
            array(
            'follow_location' => 1,
            'max_redirects' => 3,
            )
        );
        return array(
            'status' => $responseStatus,
            'content' => $responseBody,
            'headers' => $responseHeaders,
        );
    }

    public function get($url, $headers = null, $cookies = null)
    {
        return $this->request('GET', $url, null, $headers, $cookies);
    }

    public function post($url, $data = array(), $headers = null, $cookies = null)
    {
        return $this->request('POST', $url, $data, $headers, $cookies);
    }

    protected function do_http($method = 'GET', $uri = '', $data = null, $headers = null, $cookies = null, &$responseBody = '', &$responseStatus = 0, &$responseHeaders = null, $options = array())
    {
        // TODO: support POST files ??
        if (!empty($uri))
        {
            $method = strtoupper((string)$method);
            if (function_exists('curl_init'))
            {
                switch ($method)
                {
                    case 'POST':
                    $responseBody = $this->do_http_curl('POST', $uri, !empty($data) ? http_build_query($data, '', '&') : '', $this->format_http_header($headers, array('Content-type: application/x-www-form-urlencoded'), ': '), $cookies, $responseStatus, $responseHeaders, $options);
                    break;

                    case 'GET':
                    default:
                    $responseBody = $this->do_http_curl('GET', $uri.(!empty($data) ? ((false === strpos($uri, '?') ? '?' : '&').http_build_query($data, '', '&')) : ''), '', $this->format_http_header($headers, array(), ': '), $cookies, $responseStatus, $responseHeaders, $options);
                    break;
                }
            }
            elseif (function_exists('stream_context_create') && function_exists('file_get_contents') && ini_get('allow_url_fopen'))
            {
                switch ($method)
                {
                    case 'POST':
                    $responseBody = $this->do_http_file('POST', $uri, !empty($data) ? http_build_query($data, '', '&') : '', $this->format_http_header($headers, array('Content-type: application/x-www-form-urlencoded'), ': '), $cookies, $responseStatus, $responseHeaders, $options);
                    break;

                    case 'GET':
                    default:
                    $responseBody = $this->do_http_file('GET', $uri.(!empty($data) ? ((false === strpos($uri, '?') ? '?' : '&').http_build_query($data, '', '&')) : ''), '', $this->format_http_header($headers, array(), ': '), $cookies, $responseStatus, $responseHeaders, $options);
                    break;
                }
            }
            elseif ('http://' === substr(strtolower($uri), 0, 7) && function_exists('fsockopen'))
            {
                switch ($method)
                {
                    case 'POST':
                    $responseBody = $this->do_http_socket('POST', $uri, !empty($data) ? http_build_query($data, '', '&') : '', $this->format_http_header($headers, array('Content-type: application/x-www-form-urlencoded'), ': '), $cookies, $responseStatus, $responseHeaders, $options);
                    break;

                    case 'GET':
                    default:
                    $responseBody = $this->do_http_socket('GET', $uri.(!empty($data) ? ((false === strpos($uri, '?') ? '?' : '&').http_build_query($data, '', '&')) : ''), '', $this->format_http_header($headers, array(), ': '), $cookies, $responseStatus, $responseHeaders, $options);
                    break;
                }
            }
            /*else
            {
                switch ($method)
                {
                    case 'POST':
                    $responseBody = $this->do_http_browser('POST', $uri, $data);
                    break;

                    case 'GET':
                    default:
                    $responseBody = $this->do_http_browser('GET', $uri.(!empty($data) ? ((false === strpos($uri, '?') ? '?' : '&').http_build_query($data, '', '&')) : ''));
                    break;
                }
            }*/
        }
        return $this;
    }

    public function datetime($time = null)
    {
        if (is_null($time)) $time = time();
        return date('D, d M Y H:i:s', $time) . ' GMT';
    }

    protected function flatten($input, $output = array(), $prefix = null)
    {
        if (!empty($input))
        {
            foreach ($input as $key => $val)
            {
                $name = empty($prefix) ? $key : ($prefix."[$key]");

                if (is_array($val)) $output = $this->flatten($val, $output, $name);
                else $output[$name] = $val;
            }
        }
        return $output;
    }

    protected function parse_http_cookie($str, $isRaw = true)
    {
        $cookie = array(
            'expires' => 0,
            'path' => '/',
            'domain' => null,
            'secure' => false,
            'httponly' => false,
            'isRaw' => $isRaw,
            'samesite' => null,
            'partitioned' => false,
        );

        $parts = explode(';', strval($str));
        foreach ($parts as $i => $part) $parts[$i] = explode('=', $part, 2);

        $part = array_shift($parts);
        $name = !$isRaw ? urldecode($part[0]) : $part[0];
        $value = isset($part[1]) ? (!$isRaw ? urldecode($part[1]) : $part[1]) : null;
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
        $cookie['expires'] = 0 < $cookie['expires'] ? (int) $cookie['expires'] : 0;

        if (isset($cookie['max-age']) && ($cookie['max-age'] > 0 || $cookie['expires'] > time()))
        {
            $cookie['expires'] = time() + (int) $cookie['max-age'];
        }

        return $cookie;
    }

    protected function format_http_cookie($cookie, $full = false)
    {
        $RESERVED_CHARS_LIST = "=,; \t\r\n\v\f";
        $RESERVED_CHARS_FROM = array('=', ',', ';', ' ', "\t", "\r", "\n", "\v", "\f");
        $RESERVED_CHARS_TO = array('%3D', '%2C', '%3B', '%20', '%09', '%0D', '%0A', '%0B', '%0C');

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
            $str .= 'deleted; expires='.gmdate('D, d M Y H:i:s T', time() - 31536001).'; Max-Age=0';
        }
        else
        {
            $str .= $isRaw ? strval($cookie['value']) : rawurlencode(strval($cookie['value']));

            if (0 !== $cookie['expires'])
            {
                $str .= '; expires='.gmdate('D, d M Y H:i:s T', $cookie['expires']).'; Max-Age='.max(0, $cookie['expires']-time());
            }
        }

        if ($full)
        {
            if (isset($cookie['path']))
            {
                $str .= '; path='.$cookie['path'];
            }

            if (isset($cookie['domain']))
            {
                $str .= '; domain='.$cookie['domain'];
            }

            if (!empty($cookie['secure']))
            {
                $str .= '; secure';
            }

            if (!empty($cookie['httponly']))
            {
                $str .= '; httponly';
            }

            if (isset($cookie['samesite']))
            {
                $str .= '; samesite='.$cookie['samesite'];
            }

            if (!empty($cookie['partitioned']))
            {
                $str .= '; partitioned';
            }
        }

        return $str;
    }

    protected function format_http_header($input, $output = array(), $glue = '')
    {
        if (!empty($input))
        {
            foreach ($input as $key => $val)
            {
                if (is_array($val))
                {
                    foreach ($val as $v)
                    {
                        $output[] = ((string)$key) . $glue . ((string)$v);
                    }
                }
                else
                {
                    $output[] = ((string)$key) . $glue . ((string)$val);
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
                $k = strtolower(trim($header[0])); $v = trim($header[1]);
                if (!isset($responseHeaders[$k])) $responseHeaders[$k] = array($v);
                else $responseHeaders[$k][] = $v;
            }
        }
        return $responseHeaders;
    }

    protected function do_http_curl($method, $uri, $requestBody = '', $requestHeaders = array(), $cookies = null, &$responseStatus = 0, &$responseHeaders = null, $options = array())
    {
        $responseHeader = array();
        // init
        $curl = curl_init($uri);

        // setup
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_FOLLOWLOCATION, $options["follow_location"]);
        curl_setopt($curl, CURLOPT_MAXREDIRS, $options["max_redirects"]);
        curl_setopt($curl, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$responseHeader) {
            $responseHeader[] = trim($header);
            return strlen($header);
        });
        curl_setopt($curl, CURLOPT_HTTPHEADER, $requestHeaders);

        if ('POST' === strtoupper($method))
        {
            curl_setopt($curl, CURLOPT_POST, true);
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

        // close connection
        curl_close($curl);

        $responseHeaders = $this->parse_http_header($responseHeader);
        return $responseBody;
    }

    protected function do_http_socket($method, $uri, $requestBody = '', $requestHeaders = array(), $cookies = null, &$responseStatus = 0, &$responseHeaders = null, $options = array())
    {
        // NOTE: cannot handle HTTPS, results in redirect to https://
        $redirects = 0;
        while ($redirects <= $options["max_redirects"])
        {
            $uri = parse_url($uri);
            $host = $uri['host'];
            $port = isset($uri['port']) ? intval($uri['port']) : 80;
            $path = $uri['path'];
            if (empty($path)) $path = '/';
            $query = $uri['query'];
            if (!empty($query)) $path .= '?'.$query;
            $timeout = 120; // sec
            $chunk = 1024; // bytes

            // open socket
            try {
                $fp = @fsockopen($host, $port, $errno, $errstr, $timeout);
            } catch (Exception $e) {
                $fp = null;
            }
            if (!$fp) return false;

            // make request
            $content_length = strlen((string)$requestBody);
            fputs($fp, ('POST' === strtoupper($method) ? "POST" : "GET")." $path HTTP/1.1");
            fputs($fp, "\r\n"."Host: $host");
            if (!empty($requestHeaders)) fputs($fp, "\r\n".implode("\r\n", (array)$requestHeaders));
            fputs($fp, "\r\n"."Content-length: $content_length");
            fputs($fp, "\r\n"."Connection: close");
            fputs($fp, "\r\n\r\n".($content_length ? ((string)$requestBody) : ""));

            // receive response
            $response = '';
            while (!feof($fp)) $response .= fgets($fp, $chunk);

            // close socket
            fclose($fp);

            // parse headers and content
            $response = explode("\r\n\r\n", $response, 2);
            $responseHeader = isset($response[0]) ? $response[0] : '';
            $responseBody = isset($response[1]) ? $response[1] : '';
            $responseHeaders = $this->parse_http_header(empty($responseHeader) ? array() : array_map('trim', explode("\r\n", $responseHeader)));
            if (!empty($responseHeader) && preg_match('#HTTP/\\S*\\s+(\\d{3})#', $responseHeader, $m)) $responseStatus = (int)$m[1];
            if ($options["follow_location"] && (301 <= $responseStatus && $responseStatus <= 304) && preg_match('#Location:\\s+(\\S+)#', $responseHeader, $m))
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

    protected function do_http_file($method, $uri, $requestBody = '', $requestHeaders = array(), $cookies = null, &$responseStatus = 0, &$responseHeaders = null, $options = array())
    {
        // setup
        $contentLength = strlen((string)$requestBody);
        // is content-length needed?? probably not
        $requestHeader = '';
        if (!empty($requestHeaders))
        {
            $requestHeader = implode("\r\n", (array)$requestHeaders);
            //$requestHeader .= "\r\nContent-length: $contentLength";
        }
        else
        {
            //$requestHeader = "Content-length: $contentLength";
        }
        $http = stream_context_create(array(
            "http" => array(
                "method"            => 'POST' === strtoupper($method) ? 'POST' : 'GET',
                "header"            => $requestHeader,
                "content"           => (string)$requestBody,
                "follow_location"   => $options["follow_location"],
                "max_redirects"     => $options["max_redirects"],
                "ignore_errors"     => true,
            ),
        ));

        // open, make request and close
        try {
            $responseBody = @file_get_contents($uri, false, $http);
        } catch (Exception $e) {
            $responseBody = false;
        }

        if (!empty($http_response_header))
        {
            $responseHeader = array_merge(array(), $http_response_header);
            if (!empty($responseHeader) && preg_match('#HTTP/\\S*\\s+(\\d{3})#', $responseHeader[0], $m)) $responseStatus = (int)$m[1];
            $responseHeaders = $this->parse_http_header($responseHeader);
        }
        else
        {
            $responseStatus = 0;
            $responseHeaders = array();
        }
        return $responseBody;
    }

    /*protected function do_http_browser($method, $uri, $requestBody = '', $requestHeaders = array(), $cookies = null, &$responseStatus = 0, &$responseHeaders = null, $options = array())
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
        return null;
    }*/

    /*protected function do_http_request($method, $uri, $requestBody = '', $requestHeaders = array(), $cookies = null, &$responseStatus = 0, &$responseHeaders = null, $options = array())
    {
        // not available
        $responseBody = http_request($method, $uri, $requestBody, $options, &$info);
        return $responseBody;
    }*/
}
class EazyHttpException extends Exception
{
}
}