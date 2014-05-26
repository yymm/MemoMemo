# -*- encoding: utf-8 -*-

import os
import json
import datetime
from flask import Flask, render_template, session, \
                  Markup, request, redirect, url_for
from flask_sockets import Sockets
from docutils.core import publish_parts
from sphinx.directives.other import *
from sphinx.directives.code import *
import rst_directive

# Configuration

app = Flask(__name__)
app.config.from_pyfile('memomemo.cfg')
sockets = Sockets(app)


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


@app.route('/login', methods=['POST', 'GET'])
def login():
    error = None
    if request.method == 'POST':
        name = request.form['username']
        password = request.form['password']
        is_success, message = database.varify_user(name, password)
        if is_success:
            session['logged_in'] = True
            return redirect(url_for('index'))
        else:
            error = message
    return render_template('login.html', **locals())


@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))


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


def dump_json_memo(memo):
    dic = {}
    dic['id'] = memo.id
    dic['title'] = memo.title
    dic['basetext'] = memo.text
    dic['text'] = parse_rst(memo.text)
    dic['tag'] = memo.tag
    dic['date_time'] = memo.date_time.strftime('%Y/%m/%d %H:%M:%S')
    return json.dumps(dic)


def parse_rst(rst):
    overrides = {'initial_header_level': 2}
    return Markup(publish_parts(rst,
                                writer_name='html',
                                settings_overrides=overrides)['body'])


if __name__ == '__main__':
    database.init_db(app)
    app.debug = True
    app.run()
