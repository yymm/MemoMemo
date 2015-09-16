import os
from memomemo import app
from memomemo.database import init_db

init_db()

port = int(os.environ.get('PORT', 5000))
app.run(host='0.0.0.0', port=port)
