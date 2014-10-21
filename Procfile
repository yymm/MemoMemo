web: python -c "from memomemo.database import init_db; init_db()" && gunicorn --worker-class socketio.sgunicorn.GeventSocketIOWorker memomemo:app
