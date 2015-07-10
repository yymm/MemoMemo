import os
from memomemo import app
from memomemo.database import init_db

init_db()

app.run(host='0.0.0.0')
