import os

_basedir = os.path.abspath(os.path.dirname(__file__))

SECRET_KEY = os.environ['MEMOMEMO_SECRET_KEY'] \
    if 'MEMOMEMO_SECRET_KEY' in os.environ else 'dev key'

# Deploy
SQLALCHEMY_DATABASE_URI = os.environ['MEMOMEMO_DATABASE_URI'] \
    if 'MEMOMEMO_DATABASE_URI' in os.environ else \
    'mysql+pymysql://root:root@localhost/memomemo'  # Local
    #'sqlite:///memomemo.db'

# Heroku(ClearDB)
SQLALCHEMY_DATABASE_URI = os.environ['CLEARDB_DATABASE_URL'].replace("mysql://",
        "mysql+pymysql://").replace("?reconnect=true", "") \
    if 'CLEARDB_DATABASE_URL' in os.environ else \
    SQLALCHEMY_DATABASE_URI

DEBUG = True

del os
