# -*- encoding:utf-8 -*-

"""
Model with O/R mapper (Flask-SQLAlchemy)
"""

import json
import datetime
import sqlalchemy
from memomemo import db
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


tag_identifer = db.Table('tag_identifer',
    db.Column('memo_id', db.Integer, db.ForeignKey('memo.id')),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'))
)


class Memo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    text = db.Column(db.Text, nullable=False)
    html = db.Column(db.Text, nullable=False)
    date_time = db.Column(db.DateTime, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))
    tags = db.relationship('Tag', secondary=tag_identifer)

    def set_json(self, title, text, tags, category):
        self.title = title
        self.text = text
        self.html = parse_md(text)
        self.date_time = datetime.datetime.today()
        for tag in tags:
            tag = Tag.query.get(tag['id'])
            self.tags.append(tag)
        if category:
            self.category_id = category['id']


    def __init__(self, user_id, title, text, tags, category):
        self.user_id = user_id
        self.set_json(title, text, tags, category)

    def dump(self):
        category = None
        if self.category_id:
            category = Category.query.get(self.category_id).dump()
        return {
            'id': self.id,
            'title': self.title,
            'text': self.text,
            'html': self.html,
            'date_time': datetime2str(self.date_time),
            'tags': [x.dump() for x in self.tags],
            'category': category
        }

    def update(self, title, text, tags, category):
        self.set_json(title, text, tags, category)


class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def __init__(self, name):
        self.name = name

    def dump(self):
        return {
            'id': self.id,
            'name': self.name
        }


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    memos = db.relationship('Memo', backref='category')

    def __init__(self, name):
        self.name = name

    def dump(self):
        return {
            'id': self.id,
            'name': self.name
        }


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


def create_memo(user_id, memo):
    err_msg = ''
    if len(memo['title']) == 0:
        err_msg = 'Empty title is invalid.'
        return None, err_msg
    if len(memo['text']) == 0:
        err_msg = 'Empty text is invalid.'
        return None, err_msg
    memo = Memo(
            user_id,
            memo['title'],
            memo['text'],
            memo['tags'],
            memo['category'])
    try:
        db.session.add(memo)
        db.session.commit()
    except sqlalchemy.exc.IntegrityError as ie:
        err = ie.orig
        return None, err_msg
    return memo.dump(), err_msg


def get_memos(user):
    memos = user.memos
    return [x.dump() for x in memos]


def update_memo(memo):
    err_msg = ''
    if len(memo['title']) == 0:
        err_msg = 'Empty title is invalid.'
        return None, err_msg
    if len(memo['text']) == 0:
        err_msg = 'Empty text is invalid.'
        return None, err_msg
    m = Memo.query.get(memo['id'])
    m.update(
            memo['title'],
            memo['text'],
            memo['tags'],
            memo['category'])
    try:
        db.session.add(m)
        db.session.commit()
    except sqlalchemy.exc.IntegrityError as ie:
        err = ie.orig
        return None, err_msg
    return m.dump(), err_msg


def create_tag(name):
    err_msg = ''
    if len(name) == 0:
        err_msg = 'Empty string is invalid.'
        return None, err_msg
    tag = Tag(name)
    try:
        db.session.add(tag)
        db.session.commit()
    except sqlalchemy.exc.IntegrityError as ie:
        err = ie.orig
        return None, err_msg
    return tag, err_msg


def get_tags():
    tags = Tag.query.all()
    return [x.dump() for x in tags]


def delete_tag(name):
    tag = Tag.query.filter_by(name=name).first()
    if tag:
        db.session.delete(tag)
        db.session.commit()
        return True
    return False


def create_category(name):
    err_msg = ''
    if len(name) == 0:
        err_msg = 'Empty string is invalid.'
        return None, err_msg
    category = Category(name)
    try:
        db.session.add(category)
        db.session.commit()
    except sqlalchemy.exc.IntegrityError as ie:
        err = ie.orig
        return None, err_msg
    return category, err_msg


def get_categories():
    categories = Category.query.all()
    return [x.dump() for x in categories]


def delete_category(name):
    category = Category.query.filter_by(name=name).first()
    if category:
        db.session.delete(category)
        db.session.commit()
        return True
    return False
