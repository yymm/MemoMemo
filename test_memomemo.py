from nose.tools import with_setup, raises

def setup_func():
    pass
 
def teardown_func():
    pass

@with_setup(setup_func, teardown_func)
def test_hoge():
    actual = 1
    assert actual == 1

#@raises(RuntimeError)
#def test_invalid_arg1():
    #pass
