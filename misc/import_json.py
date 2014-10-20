# -*- coding: utf-8 -*-
'''
This script: Import Memo table as Json(memos.json) for dev.

ex.
[
  {
    "text": "`Pythonで作られた便利なコマンドラインツール MySQL Utilities | Think IT（シンクイット） <http://thinkit.co.jp/story/2014/02/10/4814>`_\n\n何が便利かまでは読んでない", 
    "tag": "MySQL", 
    "date_time": "2014-10-20 08:15:29", 
    "title": "MySQL Utilities"
  }, 
  {
    "text": "`UbuntuでMySQLを使う際の文字コードの設定 | 近藤嘉雪のプログラミング工房日誌 <http://blog.kondoyoshiyuki.com/2013/01/10/memo-mysql-on-ubuntu/>`_\n\nデフォルトの文字コードでは日本語が文字化けします。\n\nUTF-8を設定して再起動、作ってあったDBも作り直しましょう。", 
    "tag": "Ubuntu, MySQL", 
    "date_time": "2014-10-20 08:25:07", 
    "title": "Ubuntu on MySQL using UTF-8"
  }
]
'''

import sys
sys.path.append('../')
import memomemo.database as db
import memomemo.utils as utils
import json
import time

print "input user name >> "
name = raw_input()
user = db.User.query.filter_by(name=name).first()

memos = None

with open('memo.json', 'r') as f:
    memos = json.load(f)

for memo in memos:
    m = db.Memo(user.id,
                memo['title'].encode('utf-8'),
                memo['text'].encode('utf-8'),
                memo['tag'].encode('utf-8'))
    db.db_session.add(m)
    db.db_session.commit()
    print ">>> Insert: " + memo['title'].encode('utf-8')
    time.sleep(2)
