# -*- encoding: utf-8 -*-

"""
View(routing) and Controller
"""

from functools import wraps
from flask import Flask, render_template, session, g, \
                  request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config.from_object('config')
db = SQLAlchemy(app)

from memomemo.database import User, \
                              varify_user, create_user, get_memos


@app.before_request
def load_current_user():
    '''
    sessionにuser_ifがある場合のみglobal objects(g)にユーザ情報を追加
    gはrequire_loginデコレータ付きメソッド、templateから利用可能なので
    ユーザー情報は基本的にglobal objectsから取得する
    sessionがあってgがNoneの場合のみユーザー情報をDBから取得
    (無駄なDBアクセスを排除)
    '''
    if 'user_id' in session:
        user = getattr(g, 'user', None)
        if user is None:
            user = User.query.get(session['user_id'])
            g.user = user
    else:
        g.user = None


@app.teardown_request
def remove_db_session(exception):
    db.session.remove()


def requires_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('You need to be login.')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


@app.route('/', methods=['GET'])
def index():
    '''
    template: index.html
    '''
    return render_template('index.html', **locals())


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    '''
    template: signup.html
    signupエラー関係はflashで出力
    '''
    if 'SINGLE_USER' in app.config:
        # SINGLE_USER環境変数が設定されていて且つユーザー登録がある場合は
        # '/'にリダイレクトしsignupできないようにする
        users = User.query.all()
        if len(users) > 0:
            return redirect(url_for('/'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = create_user(username, password)
        if user:
            return redirect(url_for('login'))
        else:
            flash('Already there is a user of the same name.')
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
        username = request.form['username']
        password = request.form['password']
        user = varify_user(username, password)
        if user:
            session['user_id'] = user.id
            return redirect(url_for('memo'))
        else:
            flash('Failure to login.')
            return redirect(url_for('login'))
    return render_template('login.html')


@app.route('/logout', methods=['GET'])
def logout():
    session.pop('user_id', None)
    return redirect(url_for('login'))


@app.route('/memo')
@requires_login
def memo():
    '''
    template: memo.html
    '''
# TODO: もとindexのコメントアウト部分
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
    return render_template('memo.html')


@app.route('/memo/api/get', methods=['POST'])
@requires_login
def memo_api_get():
    json = request.json
    data = get_memos(g.user, 0)
    return jsonify(data=data)


@app.route('/memo/api/create', methods=['POST'])
@requires_login
def memo_api_create():
    json = request.json
    memo = g.user.create_memo(json)
    return jsonify(data=json)


@app.route('/memo/api/update', methods=['POST'])
@requires_login
def memo_api_update():
    json = request.json
    return jsonify(data=json)
