# -*- encoding:utf-8 -*-

import json
import zlib
import datetime
from colour import Color
from flask_sqlalchemy import SQLAlchemy
from memomemo import app
from sqlalchemy import and_, exc, event
from sqlalchemy.pool import Pool
from memomemo.utils import datetime2str, str2datetime, parse_rst


db = SQLAlchemy(app)
db_session = db.session

@event.listens_for(Pool, "checkout")
def ping_connection(dbapi_connection, connection_record, connection_proxy):
    '''
    MySQL Connection forced wake up, before connect to mysql server.
    '''
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("SELECT 1")
    except:
        # optional - dispose the whole pool
        # instead of invalidating one at a time
        # connection_proxy._pool.dispose()

        # raise DisconnectionError - pool will try
        # connecting again up to three times before raising.
        raise exc.DisconnectionError()
    cursor.close()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True)
    password = db.Column(db.String(50))
    memos = db.relationship('Memo', backref='user')
    config = db.relationship('Config', uselist=False, backref='user')
    
    def __init__(self, name, password):
        self.name = name
        self.password = password

    def add_memo(self, json_data):
        memo = Memo(self.id,
                    json_data['title'],
                    json_data['text'],
                    json_data['tag'],
                    json_data['paser'],
                    publish=json_data['publish'])
        db_session.add(memo)
        db_session.commit()
        return memo

    def update_memo(self, json_data):
        date_time = str2datetime(json_data['date'])
        memo = Memo.query.filter(and_(Memo.user_id == self.id,
                                      Memo.date_time == date_time)).first()
        if memo:
            memo.title = json_data['title']
            memo.text = json_data['text']
            memo.tag = json_data['tag']
            memo.paser = json_data['paser']
            memo.publish = json_data['publish']
            memo.date_time = datetime.datetime.today()
            db_session.commit()
            return memo

        return None

    def delete_memo(self, json_data):
        date_time = str2datetime(json_data['date_time'])
        memo = Memo.query.filter(and_(Memo.user_id == self.id,
                                      Memo.date_time == date_time)).first()
        if memo:
            db_session.delete(memo)
            db_session.commit()
            return True

        return False

    def generate_tag_list(self):
        memos = self.memos
        if len(memos) <= 0:
            return []
        countHash = {}
        for memo in memos:
            tags = memo.tag.split(',')
            for tag in tags:
                s = tag.strip()
                if countHash.has_key(s):
                    countHash[s] += 1
                else:
                    countHash[s] = 1
        tag_list = []
        s = Color('#d16b16')
        e = Color('#87ceed')
        l = len(countHash) if len(countHash) > 1 else 2
        color_list = list(s.range_to(e, l))
        color_cnt = 0
        max_val = max(countHash.values())
        for key, val in sorted(countHash.items(),
                               key=lambda x:x[1],
                               reverse=True):
            tag_dic = {}
            tag_dic['name'] = key
            tag_dic['size'] = (val / max_val) * 100
            tag_dic['num'] = val
            tag_dic['color'] = color_list[color_cnt]
            color_cnt += 1
            tag_list.append(tag_dic)

        return tag_list


    def generate_memo_list(self):
        memo_list = []
        year_list = []
        memos = Memo.query.filter_by(user_id=self.id) \
                .order_by(Memo.date_time.desc()).all()
        for memo in memos:
            dic = {}
            dic["title"] = memo.title
            dic["date"] = memo.date_time
            dic["tag"] = memo.tag
            memo_list.append(dic)
            year_list.append(memo.date_time.year)
        return memo_list, list(set(year_list))


class Memo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    text = db.Column(db.Text)
    tag = db.Column(db.String(100))
    date_time = db.Column(db.DateTime(), unique=True)
    publish = db.Column(db.Integer)
    paser = db.Column(db.String(20))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def __init__(self, user_id, title, text, tag, paser, date_time=None,
            publish=0):
        self.user_id = user_id
        self.title = title
        self.text = text
        self.tag = tag
        self.date_time = str2datetime(date_time) \
            if date_time else datetime.datetime.today()
        self.publish = publish
        self.paser = paser

    def dump_dic(self):
        dic = {}
        dic['title'] = self.title
        dic['basetext'] = self.text
        if self.paser == "Markdown":
            dic['text'] = ""
        else:
            dic['text'] = parse_rst(self.text)
        dic['tag'] = self.tag
        dic['paser'] = self.paser
        dic['date_time'] = datetime2str(self.date_time)
        dic['publish'] = self.publish
        #return json.dumps(dic)
        return dic


class Config(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    json = db.Column(db.Text)

    def __init__(self, user_id):
        self.user_id = user_id

    def get_config_obj(self):
        return json.loads(self.json)


def init_db():
    db.create_all()
    name = app.config["MEMOMEMO_USER"]
    password = app.config["MEMOMEMO_PASSWORD"]
    if name and password:
        if len(User.query.all()) == 0:
            user = add_user(name, password, False)


def add_user(name, password, signin=True):
    user = User.query.filter_by(name=name).first()

    if not user:
        user = User(name, password)
        db.session.add(user)
        config = Config(user.id)
        user.config.json = json.dumps({"signin": signin})
        memo = create_first_memo(user.id)
        db.session.add(memo)
        db.session.add(config)
        db.session.commit()

    return user


def create_first_memo(id):
    text = '''# Simple Markdown Example

GFM = GitHub Flavored Markdown

## list

* list1
* list2

## code

```python
from Flask import flask
app = Flase(__name__)

@route.app('/')
def hello():
    return "Hello Flask"
```

## table

foo  | bar
---- | ----
FOO  | BAR
    '''
    return Memo(id, "Hello MemoMemo!",
                text,
                "Sample", "Markdown")

def varify_user(name, password):
    user = User.query.filter_by(name=name).first()
    if user:
        if user.password == password:
            return user
        else:
            return None
    else:
        return None


def delete_user(user):
    db.session.delete(user)
    db.session.commit()


def change_password(user_id, password):
    user = User.query.get(user_id)
    user.password = password
    db.session.commit()


def query_memo(data, publish=None):
    '''
    data = {
        query: {
            user_id: int,
            title: string,
            text: string,
            tag: string
        },
        offset: int,
        limit: int
    }
    '''
    user_id = data['query']['user_id']
    title = data['query']['title']
    text = data['query']['text']
    tag = data['query']['tag']
    offset = data['offset']
    limit = data['limit']

    q = Memo.query.filter_by(user_id=user_id)

    if publish:
        q = q.filter_by(publish=1)

    if len(title) != 0:
        q = q.filter(Memo.title.like('%'+title+'%'))

    if len(text) != 0:
        q = q.filter(Memo.text.like('%'+text+'%'))

    if len(tag) != 0:
        if tag.find(',') >= 0:
            tags = tag.split(',')
            for t in tags:
                q = q.filter(Memo.tag.like('%'+t.strip()+'%'))
        else:
            q = q.filter(Memo.tag.like('%'+tag+'%'))

    #print(q.count())
    memos = q.order_by(Memo.date_time.desc()).slice(offset, limit).all()

    l = []
    for memo in memos:
        l.append(memo.dump_dic())

    return json.dumps(l)
