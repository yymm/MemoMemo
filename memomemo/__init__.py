# -*- encoding: utf-8 -*-

"""
View(routing) and Controller
"""

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
                              varify_user, create_user, change_password
from memomemo.publish import PublishPelican


# TODO: 何の用途で残してあるのか不明なのでコメントアウト
# (before_requestはリクエストがあるごとに実行されるデコレータ)
# @app.before_request
# def load_current_user():
#     if session.get('user_id') is not None:
#         print("not logined")
#         return
#     if request.path == '/login':
#         print("access to /login")
#         return
#     print("Nope?")
#     # global parameter 'g' set here if you need


@app.teardown_request
def remove_db_session(exception):
    db_session.remove()


def requires_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('You need to be login.')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


@app.route('/', methods=["GET"])
def index():
    '''
    template: index.html
    '''
#    user = User.query.get(session['user_id'])
#    name = user.name
#    tags = user.generate_tag_list()
#    memos, year = user.generate_memo_list()
#    month = ["%02d" % x for x in range(1, 13)]
#    pelicanconf = user.config.get_config_element("pelicanconf")
#    if pelicanconf:
#        categories = pelicanconf['categories']
#        publish = {"pelican_github_repo":   pelicanconf['github_repo'],
#                   "pelican_theme":         pelicanconf['theme'],
#                   "pelican_gh_pages_repo": pelicanconf['gh_pages_repo'],
#                   "pelican_blog_url":      pelicanconf['blog_url']}
    return render_template('index.html', **locals())


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    '''
    template: signup.html
    signupエラー関係はflashで出力
    '''
    # TODO: Signup禁止処理
    # (Signup禁止処理がcreate_userとかにも入っててカオス感)
    # (configレコードをKVS的に使ってるけどサバイバル的に使ってるので体系化したさ)
    # if len(User.query.all()) == 1:
    #     user = User.query.first()
    #     obj = user.config.get_config_element("signin")
    #     if not obj:
    #         return render_template('404.html'), 404
    if request.method == 'POST':
        name = request.form['name']
        password = request.form['password']
        user = create_user(name, password)
        if user:
            return redirect(url_for('login'))
        else:
            flash("Already there is a user of the same name.")
            return redirect(url_for('signup'))
    return render_template('signup.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    '''
    template: login.html
    loginエラー関係はflashで出力
    '''
    if request.method == 'POST':
        # login処理
        name = request.form['name']
        password = request.form['password']
        user = varify_user(name, password)
        if user:
            session['user_id'] = user.id
            return redirect(url_for("memo", name=name))
        else:
            flash('Failure to login.')
            return redirect(url_for('login'))
    # TODO: Signupを許さない処理(必要がどうか検討)
    # signup = True
    # if len(User.query.all()) == 1:
    #     user = User.query.first()
    #     obj = user.config.get_config_element("signin")
    #     if not obj:
    #         signup = False
    return render_template('login.html')


@app.route('/logout', methods=['GET'])
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))


@app.route('/memo/<name>', methods=['GET'])
@requires_login
def memo(name):
    '''
    template: memo.html
    URLはユーザ名固有の値にしているため
    sessionとユーザ名の確認の必要あり
    memo.htmlはSPAとして設計するので必要なデータは
    sessionに紐付いた
    '''
    # URLユーザ名(name)確認
    user = User.query.get(session['user_id'])
    if user.name != name:
        flash('You need to be login.')
        return redirect(url_for('login'))
    return render_template('memo.html')


@app.route('/changepassword', methods=['POST'])
@requires_login
def changepassword():
    if request.method == 'POST':
        json_data = request.json
        change_password(session['user_id'], json_data['password'])
        return json.dumps({'status': 'success'})
    return None


@app.route('/memo/add', methods=['POST'])
@requires_login
def add_memo():
    memo = None
    user = User.query.get(session['user_id'])
    if request.method == 'POST':
        json_data = request.json
        memo = user.add_memo(json_data)
    return json.dumps(memo.dump_dic())


@app.route('/memo/update', methods=['POST'])
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


@app.route('/memo/delete', methods=['POST'])
@requires_login
def delete_memo():
    if request.method == 'POST':
        user = User.query.get(session['user_id'])
        json_data = request.json
        if user.delete_memo(json_data):
            return json.dumps({'status': 'success'})
    return None


@app.route('/memo/filter', methods=['POST'])
@requires_login
def filter():
    user = User.query.get(session['user_id'])
    if request.method == 'POST':
        return query_memo(user.id, request.json)
    return json.dumps({"status": False})


@app.route('/memo/publish', methods=['POST'])
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
            pelicanconf['blog_url'],
            pelicanconf['plugins'])

    ret, updates, deletes = pp.run()

    if not ret:
        return json.dumps({'log': 'Failure, see process log.'})

    return json.dumps({'log': 'Success to publish.',
                       'type': data["type"],
                       'updates': updates,
                       'deletes': deletes})
