import os
from memomemo import app, socketio
from memomemo.database import init_db

init_db()

host = '127.0.0.1'
if 'CLEARDB_DATABASE_URL' in os.environ:
    host='0.0.0.0'

socketio.run(app, host=host)
