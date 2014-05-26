# -*- encoding:utf-8 -*-

import datetime
from flask_sqlalchemy import SQLAlchemy
from memomemo import app
from sqlalchemy import exc
from sqlalchemy import event
from sqlalchemy.pool import Pool


db = SQLAlchemy(app)
db_session = db.session


@event.listens_for(Pool, "checkout")
def ping_connection(dbapi_connection, connection_record, connection_proxy):
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
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True)
    password = db.Column(db.String(50))
    
    def __init__(self, name, password):
        self.name = name
        self.password = password


class Memo(db.Model):
    __tablename__ = 'memos'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, unique=True)
    text = db.Column(db.Text, nullable=False)
    tag = db.Column(db.String(100), nullable=False)
    date_time = db.Column(db.DateTime(), unique=True)

    def __init__(self, title, text, tag, date_time):
        self.title = title
        self.text = text
        self.tag = tag
        self.date_time = date_time


def init_db():
    db.create_all()


def add_user(name, password):
    user = User.query.filter_by(name=name).first()

    if user:
        u = User(name, password)
        db.session.add(u)
        db.session.commit()

    return user


def delete_user(user):
    db.session.delete(user)
    db.session.commit()


def close_db():
    db.session.remove()


def add_memo(memo_id, title, text, tag):
    # Input check
    if len(title) == 0:
        title = "Non Title"
    if len(text) == 0:
        text = "Non"
    if len(tag) == 0:
        tag = "memo"

    now = datetime.datetime.today()

    # update or add
    memo = Memo.query.filter(Memo.id == memo_id).first()
    if memo:
        # exised memo
        memo.title     = title
        memo.text      = text
        memo.tag       = tag
        memo.date_time = now
        db.session.commit()
    else:
        # new memo 
        memo = Memo(title, text, tag, now)
        db.session.add(memo)
        db.session.commit()

    return memo


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


def counting_tag():
    # Reference counting hash
    countHash = {}
    for memo in Memo.query.all():
        tags = memo.tag.split(',')
        for tag in tags:
            tag = tag.strip()
            if countHash.has_key(tag):
                countHash[tag] += 1
            else:
                countHash[tag] = 1

    tags = []
    max_value = max(countHash.values())
    for key, value in countHash.items():
        tag_dic = {}
        tag_dic["name"] = key
        tag_dic["size"] = (value / max_value) * 100
        tags.append(tag_dic)

    return tags


def varify_user(name, password):
    exist_user = False
    user = User.query.filter_by(name = name).first()
    if user:
        if user.password == password:
            return True, "ok"
        else:
            return False, "Invalid password"
    else:
        return False, "Invalid username"
