import os

_basedir = os.path.abspath(os.path.dirname(__file__))

SECRET_KEY = os.environ['MEMOMEMO_SECRET_KEY'] \
    if 'MEMOMEMO_SECRET_KEY' in os.environ else 'dev key'

SQLALCHEMY_DATABASE_URI = os.environ['MEMOMEMO_DATABASE_URI'] \
    if 'MEMOMEMO_DATABASE_URI' in os.environ else \
    'sqlite:///memomemo.db'
    #'mysql+pymysql://root:root@localhost/memomemo'

DEBUG = True

del os
