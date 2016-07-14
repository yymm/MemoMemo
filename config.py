# -*- encoding: utf-8 -*-
import os
import json

_basedir = os.path.abspath(os.path.dirname(__file__))

SECRET_KEY = os.environ['MEMOMEMO_SECRET_KEY'] \
    if 'MEMOMEMO_SECRET_KEY' in os.environ else 'dev key'

DEBUG = False if 'MEMOMEMO_SECRET_KEY' in os.environ else True

SQLALCHEMY_TRACK_MODIFICATIONS = True

# Default(SQLite)
SQLALCHEMY_DATABASE_URI = 'sqlite:///memomemo.db'

# Local MySQL
if 'MEMOMEMO_LOCAL_MYSQL' in os.environ:
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root@localhost/memomemo'

# Deploy MySQL
if 'MEMOMEMO_DATABASE_URI' in os.environ:
    SQLALCHEMY_DATABASE_URI = os.environ['MEMOMEMO_DATABASE_URI']

# Heroku(ClearDB)
if 'CLEARDB_DATABASE_URL' in os.environ:
    SQLALCHEMY_DATABASE_URI = os.environ['CLEARDB_DATABASE_URL'] \
            .replace("mysql://", "mysql+pymysql://") \
            .replace("?reconnect=true", "") \

# Single user
SINGLE_USER = os.environ["MEMOMEMO_SINGLE_USER"] \
        if 'MEMOMEMO_SINGLE_USER' in os.environ else None

del os
