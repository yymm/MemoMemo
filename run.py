from memomemo import app, socketio
from memomemo.database import init_db

init_db()
if 'CLEARDB_DATABASE_URL' in os.environ
    socketio.run(app)
else
    socketio.run(app, host='0.0.0.0')
