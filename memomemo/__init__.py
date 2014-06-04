# -*- encoding: utf-8 -*-

import os
import json
import datetime
from functools import wraps
from flask import Flask, render_template, session, g, \
                  Markup, request, redirect, url_for, flash
from flask_sockets import Sockets
from docutils.core import publish_parts
from sphinx.directives.other import *
from sphinx.directives.code import *
import utils


app = Flask(__name__)
app.config.from_object('config')
sockets = Sockets(app)


from memomemo.database import db_session, User, filter_memo, varify_user


@app.before_request
def load_current_user():
    g.user = User.query.get(session['user_id']) \
        if 'user_id' in session else None


@app.teardown_request
def remove_db_session(exception):
    db_session.remove()


def requires_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            flash('You need to be signed in.')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function


@app.route('/')
@requires_login
def index():
    user = g.user
    name = user.name
    id = user.id
    tags = user.count_tags()
    # date list
    return render_template('index.html', **locals())


@app.route('/login', methods=['POST', 'GET'])
def login():
    if request.method == 'POST':
        name = request.form['username']
        password = request.form['password']
        user = varify_user(name, password)
        if user:
            session['user_id'] = user.id
            g.user = user
            return redirect(url_for('index'))

    return render_template('login.html')


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))


@sockets.route("/memos")
def show_memos(ws):
    json_data = None
    while True:
        message = ws.receive()

        if message:
            json_data = json.loads(message)

        memos = filter_memo(json_data)

        import time
        for i, memo in enumerate(memos):
            ws.send(memo.dump_json())
            time.sleep(0.2)


@app.route('/add', methods=['POST'])
@requires_login
def add_memo():
    memo = None
    user = g.user

    if request.method == 'POST':
        json_data = request.json
        memo = user.add_memo(json_data)

    return memo.dump_json()


@app.route('/update', methods=['POST'])
@requires_login
def update_memo():
    memo = None
    user = g.user

    if request.method == 'POST':
        json_data = request.json
        memo = user.update_memo(json_data)
        if not memo:
            return None

    return memo.dump_json()


@app.route('/delete', methods=['POST'])
@requires_login
def delete_memo():
    if request.method == 'POST':
        user = g.user
        json_data = request.json
        if user.delete_memo(json_data):
            return json.dumps({'status': 'success'})
    return None
