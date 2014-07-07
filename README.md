![MemoMemo](memomemo.png)

# Version

* v0.10 2014-07-07

# Deployment

Set secret key of Flask.

```
export MEMOMEMO_SECRET_KEY='dev key'
```

Run through gunicorn.(on localhost:5050)

```
gunicorn -b localhost:5050 flask_sockets.worker memomemo:app
```

## Database

Using MySQL(default). => Table: memomemo

If you want to use other database, you export MEMOMEMO\_DATABASE\_URI.

example: SQLite

```
export MEMOMEMO_DATABASE_URI=sqlite:////home/hoge/MemoMemo/memo.db
```

# Python Requirements

* Flask
* Flask-SQLAlchemy
* Flask-Sockets
* Sphinx
* PyMySQL
* pytest
* colour
* gunicorn

# Licence

* GPLv3 
