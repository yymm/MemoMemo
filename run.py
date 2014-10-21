from memomemo import app, socketio
from memomemo.database import init_db

init_db()
socketio.run(app, host='0.0.0.0')
