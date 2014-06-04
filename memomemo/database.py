# -*- encoding:utf-8 -*-

import json
import datetime
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
    
    def __init__(self, name, password):
        self.name = name
        self.password = password

    def add_memo(self, json_data):
        memo = Memo(self.id,
                    json_data['title'],
                    json_data['text'],
                    json_data['tag'])
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

    def count_tags(self):
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
        max_val = max(countHash.values())
        for key, val in countHash.items():
            tag_dic = {}
            tag_dic['name'] = key
            tag_dic['size'] = (val / max_val) * 100
            tag_dic['num'] = val
            tag_list.append(tag_dic)

        return tag_list


class Memo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    text = db.Column(db.Text)
    tag = db.Column(db.String(100))
    date_time = db.Column(db.DateTime(), unique=True)
    publish = db.Column(db.Integer)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def __init__(self, user_id, title, text, tag):
        self.user_id = user_id
        self.title = title
        self.text = text
        self.tag = tag
        self.date_time = datetime.datetime.today()
        self.publish = 0

    def dump_json(self):
        dic = {}
        dic['title'] = self.title
        dic['basetext'] = self.text
        dic['text'] = parse_rst(self.text)
        dic['tag'] = self.tag
        dic['date_time'] = datetime2str(self.date_time)
        dic['publish'] = self.publish
        return json.dumps(dic)


def init_db():
    db.create_all()


def add_user(name, password):
    user = User.query.filter_by(name=name).first()

    if not user:
        u = User(name, password)
        db.session.add(u)
        db.session.commit()

    return user


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


def remove_memo(memo_id):
    memo = Memo.query.filter(Memo.id == memo_id).first()
    db.session.delete(memo)
    db.session.commit()


def filter_specific_tag(tag):
    todo = Memo.query.filter(Memo.tag == tag)
    if todo:
        return todo.first()
    else:
        return None


def query_memo(filter_word):
    title = filter_word['title']
    tag = filter_word['tag']
    days = int(filter_word['days'])

    memo = Memo.query

    if days is not 0:
        until_now = u"date_time<='" + str(datetime.datetime.today().strftime('%Y-%m-%d %H:%M:%S'))+"'"
        time_delta = datetime.datetime.today() - datetime.timedelta(days)
        time_filter = u"date_time>='" + str(time_delta.strftime('%Y-%m-%d %H:%M:%S'))+"'"
        memo = memo.filter(until_now).filter(time_filter)
    
    if len(title) is not 0:
        memo = memo.filter(Memo.title.like("%" + title + "%"))

    if len(tag) is not 0:
        memo = memo.filter(Memo.tag.like("%" + tag + "%"))

    return memo.order_by(Memo.date_time.desc()).all()
