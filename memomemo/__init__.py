# -*- encoding: utf-8 -*-

import os
import sys
import json
import datetime
from functools import wraps
from flask import Flask, render_template, session, g, \
                  Markup, request, redirect, url_for, flash
from docutils.core import publish_parts
from sphinx.directives.other import *
from sphinx.directives.code import *

app = Flask(__name__)
app.config.from_object('config')

from memomemo.database import db_session, User, query_memo, \
                              varify_user, add_user, change_password
from memomemo.publish import PublishPelican


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
    pelicanconf = user.config.get_config_element("pelicanconf")
    if pelicanconf:
        categories = pelicanconf['categories']
        publish = {"pelican_github_repo":   pelicanconf['github_repo'],
                   "pelican_theme":         pelicanconf['theme'],
                   "pelican_gh_pages_repo": pelicanconf['gh_pages_repo'],
                   "pelican_blog_url":      pelicanconf['blog_url']}
    return render_template('index.html', **locals())


@app.route('/signup', methods=['POST'])
def signup():
    if len(User.query.all()) == 1:
        user = User.query.first()
        obj = user.config.get_config_element("signin")
        if not obj:
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
        obj = user.config.get_config_element("signin")
        if not obj:
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


@app.route('/publish', methods=['POST'])
@requires_login
def publish_pelican():
    user = User.query.get(session['user_id'])
    pelicanconf = user.config.get_config_element("pelicanconf")

    data = request.json

    if not pelicanconf:
        try:
            conf = json.loads(data["pelicanconf"])
            if "categories" not in conf or "github_repo" not in conf or \
               "theme" not in conf or "gh_pages_repo" not in conf:
                   return json.dumps({"status": False, "message": "Key error."})
        except Exception as e:
            return json.dumps({"status": False, "message": "Invalid json data."})
        ret = user.config.set_config_element("pelicanconf", conf)
        return json.dumps({"status": True, "message": ret})

    pp = PublishPelican(session['user_id'],
            pelicanconf['github_repo'],
            pelicanconf['categories'],
            pelicanconf['theme'],
            pelicanconf['gh_pages_repo'],
            pelicanconf['custom'],
            pelicanconf['blog_url'])

    ret, updates, deletes = pp.run()

    if not ret:
        return json.dumps({'log': 'Failure, see process log.'})

    return json.dumps({'log': 'Success to publish.',
                       'type': data["type"],
                       'updates': updates,
                       'deletes': deletes})
