# -*- encoding: utf-8 -*-

import os
import json
import datetime
from functools import wraps
from flask import Flask, render_template, session, g, \
                  Markup, request, redirect, url_for, flash
from docutils.core import publish_parts
from sphinx.directives.other import *
from sphinx.directives.code import *
import utils
from flask.ext.socketio import SocketIO, emit


app = Flask(__name__)
app.config.from_object('config')
socketio = SocketIO(app)

from memomemo.database import db_session, User, query_memo, \
                              varify_user, add_user


@app.before_request
def load_current_user():
    if session.get('user_id') is not None:
        return
    if request.path == '/login':
        return
    # global parameter 'g' set here if you need


@app.teardown_request
def remove_db_session(exception):
    db_session.remove()


def requires_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('user_id') is None:
            #flash('You need to be signed in.')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


@socketio.on('fetch memo', namespace='/memo')
def filter(msg):
    data = query_memo(json.loads(msg))
    emit('memo response', data, namespace='/memo')


@socketio.on('connect', namespace='/memo')
def connect():
    print('Client connected')
    emit('log response', {'log': 'Connection'})


@socketio.on('disconnect', namespace='/memo')
def disconnect():
    print('Client disconnected')


@app.route('/')
@requires_login
def index():
    user = User.query.get(session['user_id'])
    name = user.name
    id = user.id
    tags = user.generate_tag_list()
    memos = user.generate_memo_list()
    return render_template('index.html', **locals())


@app.route('/signup', methods=['POST'])
def signup():
    name = request.form['username']
    password = request.form['password']
    user = add_user(name, password)
    return redirect(url_for('login'))


@app.route('/login', methods=['POST', 'GET'])
def login():
    if request.method == 'POST':
        name = request.form['username']
        password = request.form['password']
        user = varify_user(name, password)
        if user:
            session['user_id'] = user.id
            return redirect(url_for('index'))

    disable_signup = False
    if "DISABLE_SIGNUP" in app.config:
        disable_signup = True
        
    return render_template('login.html', **locals())


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))


@app.route('/add', methods=['POST'])
@requires_login
def add_memo():
    memo = None
    user = User.query.get(session['user_id'])
    if request.method == 'POST':
        json_data = request.json
        memo = user.add_memo(json_data)
    return json.dumps(memo.dump_dic())


@app.route('/update', methods=['POST'])
@requires_login
def update_memo():
    memo = None
    user = User.query.get(session['user_id'])
    if request.method == 'POST':
        json_data = request.json
        memo = user.update_memo(json_data)
        if not memo:
            return None
    return json.dumps(memo.dump_dic())


@app.route('/delete', methods=['POST'])
@requires_login
def delete_memo():
    if request.method == 'POST':
        user = User.query.get(session['user_id'])
        json_data = request.json
        if user.delete_memo(json_data):
            return json.dumps({'status': 'success'})
    return None
