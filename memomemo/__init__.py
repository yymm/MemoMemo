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
    categories = app.config['PELICAN_CATEGORIES'] \
            if 'PELICAN_CATEGORIES' in app.config else None;
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

@app.route('/publish', methods=['POST'])
@requires_login
def publish_pelican():
    user_id = session['user_id']
    # publishする記事のリスト生成
    q = {"query": {
            "title": "",
            "text": "",
            "tag": "",
            "publish": 100
            },
        "offset": 0,
        "limit": sys.maxint
        }
    l = json.loads(query_memo(user_id, q))
    # 更新のある分だけ更新する
    # => jsonファイルと読んで記事と日付の対応をチェック
    #    => タイトルの無いもの、日付が一致しないものを更新対象に選択
    def check_update(new, old):
        ret_l = []
        for e in new:
            key = str(e["id"])
            if key in old:
                # update
                if "modified" in old[key]:
                    if old[key]['modified'] != e['date_time']:
                        e["modified"] = e["date_time"]
                        e["date_time"] = old[key]["date_time"]
                        ret_l.append(e)
                else:
                    if old[key]["date_time"] != e["date_time"]:
                        e["modified"] = e["date_time"]
                        e["date_time"] = old[key]["date_time"]
                        ret_l.append(e)
            else:
                # new
                ret_l.append(e)
        return ret_l

    # => content/*/にmd or rstファイル生成
    # => カテゴリ別にファイルを作成
    def create_post(post_list):
        pelican_val = app.config['PELICAN_CATEGORIES']
        for l in post_list:
            dir = 'pelican/content/' + pelican_val[l["publish"]]["name"] + "/"
            ext = '.rst' if l["paser"] == "ReST" else '.md'
            ext_other = '.md' if l["paser"] == "ReST" else '.rst'
            name = dir + str(l['id']) + ext
            name_other = dir + str(l['id']) + ext_other
            title_tag = ':title: ' if l["paser"] == "ReST" else 'Title: '
            tags_tag = ':tags: ' if l["paser"] == "ReST" else 'Tags: '
            date_tag = ':date: ' if l["paser"] == "ReST" else 'Date: '
            mod_tag = ':modified: ' if l["paser"] == "ReST" else 'Modified: '
            if os.path.exists(name_other):
                os.remove(name_other)
            with open(name, 'w') as f:
                f.write(title_tag + l["title"] + "\n")
                f.write(tags_tag + l["tag"] + "\n")
                f.write(date_tag + l["date_time"] + "\n")
                if "modified" in l:
                    f.write(mod_tag + l["modified"] + "\n")
                f.write("\n" + l["basetext"].encode('utf_8'))
                print l

    updates = []
    old = None
    if os.path.exists("publish.json"):
        with open("publish.json", "r") as f:
            old = json.load(f)
            updates = check_update(l, old)
            print updates
        create_post(updates)
    else:
        create_post(l)

    # pelicanテーマをgit clone
    # テーマを使用してhtmlを生成
    # github用に修正(gh-import?)
    # gh-pagesをpull
    # gh-pagesにpush

    # jsonファイル作成
    if os.path.exists("publish.json") and len(updates) == 0:
        return json.dumps({'status': 'success'})

    with open("publish.json", "w") as f:
        for e in updates:
            old[str(e["id"])] = e
        d = dict()
        write_list = l if os.path.exists("publish.json") else old
        for e in write_list:
            id = e['id']
            tmp = e
            del tmp["text"]
            del tmp["basetext"]
            del tmp["id"]
            d[id] = tmp
        json.dump(d, f, indent=4)

    return json.dumps({'status': 'success'})
