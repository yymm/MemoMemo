import pytest
import os
import tempfile

from context import memomemo

@pytest.fixture
def client(request):
    db_fd, memomemo.app.config['SQLALCHEMY_DATABASE_URI'] = tempfile.mkstemp()
    memomemo.app.config['SQLALCHEMY_DATABASE_URI'] = \
        'sqlite:///' + memomemo.app.config['SQLALCHEMY_DATABASE_URI']
    memomemo.app.config['TESTING'] = True
    client = memomemo.app.test_client()
    with memomemo.app.app_context():
        memomemo.database.init_db()

    def teardown():
        os.close(db_fd)
        os.unlink(memomemo.app.config['SQLALCHEMY_DATABASE_URI'][10:])
    request.addfinalizer(teardown)

    return client


def signup(client, username, password):
    return client.post('/signup', data=dict(
        username=username,
        password=password
    ), follow_redirects=True)


def login(client, username, password):
    return client.post('/login', data=dict(
        username=username,
        password=password
    ), follow_redirects=True)


def logout(client):
    return client.get('/logout', follow_redirects=True)


def test_signin(client):
    rv = signup(client, 'test', 'test')
    assert b'login' in rv.data
    rv = signup(client, 'test', 'test')
    assert b'Already there is a user of the same name.' in rv.data


def test_login_logout(client):
    rv = login(client, 'test2', 'test')
    assert b'Failure to login.' in rv.data
    rv = signup(client, 'test', 'test')
    assert b'login' in rv.data
    rv = login(client, 'test', 'test')
    assert b'test' in rv.data # 変わる可能性
    rv = login(client, 'test', 'test' + 'x')
    assert b'Failure to login.' in rv.data
    rv = logout(client)
    assert b'login' in rv.data
