# -*- coding: utf-8 -*-
import os, sys

DIR = os.path.dirname(os.path.abspath(__file__))

def import_module(name, path):
    #import imp
    #try:
    #    mod_fp, mod_path, mod_desc  = imp.find_module(name, [path])
    #    mod = getattr( imp.load_module(name, mod_fp, mod_path, mod_desc), name )
    #except ImportError as exc:
    #    mod = None
    #    sys.stderr.write("Error: failed to import module ({})".format(exc))
    #finally:
    #    if mod_fp: mod_fp.close()
    #return mod
    import importlib.util, sys
    spec = importlib.util.spec_from_file_location(name, path+name+'.py')
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return getattr(mod, name)

# import the EazyHttp.py (as a) module, probably you will want to place this in another dir/package
EazyHttp = import_module('EazyHttp', os.path.join(DIR, '../../src/py/'))
if not EazyHttp:
    print ('Could not load the EazyHttp Module')
    sys.exit(1)

def file_put_contents(path, content):
    if isinstance(content, bytes):
        with open(path, "wb") as file:
            file.write(content)
    else:
        with open(path, "w") as file:
            file.write(str(content))

def request(do_http, uri, follow_redirects):
    return EazyHttp().option('methods', [do_http]).option('follow_redirects', follow_redirects).get('http://localhost:9000'  + uri)

def test():
    import json

    response = request('urllib', '/test/redirect.php?max_redirects=2', 3)
    file_put_contents(DIR+'/test-redirect-urllib.php.txt', json.dumps(response))
    response = request('urllib', '/test/redirect.php?max_redirects=10', 3)
    file_put_contents(DIR+'/test-redirect-max-urllib.php.txt', json.dumps(response))

test()
