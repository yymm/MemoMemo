# -*- encoding:utf-8 -*-

"""
Model with O/R mapper (Flask-SQLAlchemy)
"""

import json
import datetime
from memomemo import db
from sqlalchemy import and_, exc, event, or_
from sqlalchemy.pool import Pool
from memomemo.utils import datetime2str, str2datetime, parse_md


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True)
    password = db.Column(db.String(50))
    memos = db.relationship('Memo', backref='user')
    config = db.relationship('Config', uselist=False, backref='user')
    
    def __init__(self, name, password):
        self.name = name
        self.password = password

    def create_memo(self, title, text, tag, category):
        memo = Memo(self.id, title, text, tag, category)
        db.session.add(memo)
        db.session.commit()
        return memo.dump_dic()


tag_identifer = db.Table('tag_identifer',
    db.Column('memo_id', db.Integer, db.ForeignKey('memo.id')),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'))
)


class Memo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    text = db.Column(db.Text)
    date_time = db.Column(db.DateTime, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))
    tags = db.relationship('Tag', secondary=tag_identifer)

    def __init__(self, user_id, title, text, tag, category):
        self.user_id = user_id
        self.title = title
        self.text = text
        self.date_time = datetime.datetime.today()

    def dump_dic(self):
        return {
            'id': self.id,
            'title': self.title,
            'text': self.text,
            'date_time': datetime2str(self.date_time)
        }


class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True)

    def __init__(self, memo_id, name):
        self.memo_id = memo_id
        self.name = name


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True)
    memos = db.relationship('Memo', backref='category')

    def __init__(self, memo_id, name):
        self.memo_id = memo_id
        self.name = name


class Config(db.Model):
    '''
    This table save the flexible json objects.
    Now, write keys that exist here,
      -----------   --------  
    | Key         | Type     |
      ----------- | --------  
    | signin      | <Bool>   |
    | pelicanconf | <Object> |
    | publish     | <Object> |
    '''
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    json = db.Column(db.Text)

    def __init__(self, user_id):
        self.user_id = user_id

    def get(self):
        return json.loads(self.json)

    def get_element(self, key):
        obj = json.loads(self.json)
        if not key in obj:
            return None
        return obj[key]

    def set(self, obj):
        self.json = json.dumps(obj)
        db.session.add(self)
        db.session.commit()
        return self.json

    def set_element(self, key, elem):
        obj = self.get()
        obj[key] = elem
        self.set(obj)


def init_db():
    db.create_all()


def create_user(name, password):
    user = User.query.filter_by(name=name).first()
    if user:
        return None
    user = User(name, password)
    db.session.add(user)
    db.session.commit()
    return user


def varify_user(name, password):
    user = User.query.filter_by(name=name).first()
    if user == None:
        return None # User not found
    if user.password != password:
        return None # Password is incorrect
    return user


def delete_user(user):
    db.session.delete(user)
    db.session.commit()


def change_password(user_id, password):
    user = User.query.get(user_id)
    user.password = password
    db.session.commit()


def get_memos(user, fromIndex, quantity=10):
    memos = user.memos[fromIndex:fromIndex+quantity]
    return [x.dump_dic() for x in memos]
