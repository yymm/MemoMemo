# -*- encoding: utf-8 -*-

import os
import json
import datetime
from flask import Flask, render_template, session, g, \
                  Markup, request, redirect, url_for, flash
from flask_sockets import Sockets
from docutils.core import publish_parts
from sphinx.directives.other import *
from sphinx.directives.code import *
import memomemo.utils as utils


app = Flask(__name__)
app.config.from_object('config')
sockets = Sockets(app)


from memomemo.database import db_session, User, varify_user


@app.before_request
def load_current_user():
    g.user = User.query.get(session['user_id']) \
        if 'user_id' in session else None


@app.teardown_request
def remove_db_session(exception):
    db_session.remove()


@app.route('/')
def index():
    if not 'user_id' in session:
        return redirect(url_for('login'))

    return render_template('index.html')


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
    '''WebSocket'''
    while True:
        filter_json = ws.receive()
        # 時々ValueErrorが出てる
        filter_word = json.loads(unicode(filter_json))

        # TODO: personal setting if possible generalized...
        if len(filter_word['title']) == 0 and len(filter_word['tag']) == 0:
            todo = database.filter_specific_tag('TODO')
            if todo:
                ws.send(dump_json_memo(todo));

        memos = database.query_memo(filter_word)

        import time
        for memo in memos:
            ws.send(dump_json_memo(memo))
            time.sleep(0.2)


@app.route("/memomemo", methods=['POST'])
def return_memo_json():
    if request.method == 'POST':
        filter_word = request.json
        memos = database.query_memo(filter_word)
        list_memo = []

        # TODO: personal setting if possible generalized...
        if len(filter_word['title']) == 0 and len(filter_word['tag']) == 0:
            todo = database.filter_specific_tag('TODO')
            if todo:
                list_memo.append(dump_json_memo(todo));

        for memo in memos:
            list_memo.append(dump_json_memo(memo))
        return json.dumps(list_memo)


@app.route('/add', methods=['POST'])
def post_memo():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    memo = None
    if request.method == 'POST':
        json_data = request.json
        memo_id =json_data['id']
        title = json_data['title']
        text  = json_data['text']
        tag   = json_data['tag']
        memo = database.add_memo(memo_id, title, text, tag)

    return dump_json_memo(memo)


@app.route('/delete', methods=['POST'])
def delete_memo():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    title = None
    if request.method == 'POST':
        json_data = request.json
        memo_id = int(json_data['id'])
        database.remove_memo(memo_id)
    
    return json.dumps({'title': title})
