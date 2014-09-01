'''
MySQL to SQLite Converter for memomemo

1. Fetch a database from mysql via MemoMemo App.
   (Then MemoMemo should connected to mysql database.)
2. Export a database(MySQL) to SQLite database
   in current directory(Name: memomemo.db).
'''

import sys
sys.path.append('../')

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import memomemo.database as mysql

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///memomemo.db'
db = SQLAlchemy(app)
db_session = db.session


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True)
    password = db.Column(db.String(50))
    memos = db.relationship('Memo', backref='user')
    
    def __init__(self, name, password):
        self.name = name
        self.password = password


class Memo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    text = db.Column(db.Text)
    tag = db.Column(db.String(100))
    date_time = db.Column(db.DateTime(), unique=True)
    publish = db.Column(db.Integer)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def __init__(self, user_id, title, text, tag, date_time):
        self.user_id = user_id
        self.title = title
        self.text = text
        self.tag = tag
        self.date_time = date_time
        self.publish = 0


def init_db():
    db.create_all()


def mysql2sqlite():
    memos = mysql.Memo.query.all()
    print(len(memos))
    
    # Initialized sqlite database
    init_db()

    # Add user
    user = User.query.filter_by(name='yymm').first()
    if user == None:
        user = User('yymm', 'w6FRsZlIw0z2fsgd39cL')
        db_session.add(user)
        db_session.commit()
    user_id = user.id

    # Add memos
    for memo in memos:
        m = Memo(user_id, memo.title, memo.text, memo.tag, memo.date_time)
        db_session.add(m)
    db_session.commit()

    return

if __name__ == '__main__':
    mysql2sqlite()
