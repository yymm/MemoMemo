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


app = Flask(__name__)
app.config.from_object('config')

from memomemo.database import db_session, User, query_memo, \
                              varify_user, add_user, change_password


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


@app.route('/filter', methods=['POST'])
@requires_login
def filter():
    user = User.query.get(session['user_id'])
    if request.method == 'POST':
        return query_memo(user.id, request.json)
    return json.dumps({"status": False})


@app.route('/')
@requires_login
def index():
    user = User.query.get(session['user_id'])
    name = user.name
    tags = user.generate_tag_list()
    memos, year = user.generate_memo_list()
    month = ["%02d" % x for x in range(1, 13)]
    return render_template('index.html', **locals())


@app.route('/signup', methods=['POST'])
def signup():
    if len(User.query.all()) == 1:
        user = User.query.first()
        obj = user.config.get_config_obj()
        if not obj["signin"]:
            return render_template('404.html'), 404
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

    signup = True
    if len(User.query.all()) == 1:
        user = User.query.first()
        config = user.config
        if config:
            obj = config.get_config_obj()
            if not obj["signin"]:
                signup = False
        else:
            signup = False
        
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


@app.route('/changepassword', methods=['POST'])
@requires_login
def changepassword():
    if request.method == 'POST':
        json_data = request.json
        change_password(session['user_id'], json_data['password'])
        return json.dumps({'status': 'success'})
    return None
