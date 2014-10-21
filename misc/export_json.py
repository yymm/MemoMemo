# -*- coding: utf-8 -*-
'''
This script: Export Memo table as Json(memos.json) for dev.

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

print "input user name >> "
name = raw_input()
user = db.User.query.filter_by(name=name).first()

l = []

for memo in user.memos:
    d = {}
    d['title'] = memo.title.encode('utf-8')
    d['text'] = memo.text.encode('utf-8')
    d['tag'] = memo.tag.encode('utf-8')
    d['date_time'] = utils.datetime2str(memo.date_time)
    l.append(d)

with open('memo.json', 'w') as f:
    f.write(json.dumps(l, ensure_ascii=False, indent=2))
