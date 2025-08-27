<?php
// run "php -S localhost:9000 server.php"
$method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper((string)$_SERVER['REQUEST_METHOD']) : 'GET';

// simulate redirects
$max_redirects = isset($_GET['max_redirects']) ? intval($_GET['max_redirects']) : 2;
$num_redirects = isset($_GET['redirects']) ? intval($_GET['redirects']) : 0;
if ($num_redirects < $max_redirects)
{
    header('Location: http://localhost:9000/redirect.php?redirects='.($num_redirects+1).'&max_redirects='.($max_redirects), true, 302);
}
else
{
    echo "content after {$num_redirects} of {$max_redirects} redirects";
}
