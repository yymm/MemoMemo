# -*- encoding: utf-8 -*-

import os
import sys
import json
import subprocess
from memomemo.database import query_memo

def command_sync(command, cwd="."):
    return subprocess.call(command, cwd=cwd, shell=True)

class PublishPelican:
    publish_file = "publish.json"

    def __init__(self, user_id, url, categories, theme, publish_url):
        self.user_id = user_id
        self.url = "https://github.com/" + url
        self.categories = categories
        self.theme = theme
        self.pub_url = publish_url

    def run(self):
        new = self.__query_publish_memos()
        posts = []
        updates = []
        if os.path.exists(self.publish_file):
            with open(self.publish_file, "r") as f:
                old = json.load(f)
                posts, updates = self.__check_update(new, old)
        else:
            posts = updates = new

        if len(updates) == 0:
            return True

        if self.__pull_pelican():
            return False

        self.__create_post(updates)

        if self.__push_to_gh_pages():
            return False

        self.__generate_publish_file(posts)

        return True

    def __pull_pelican(self):
        # pelicanのリポジトリをgit clone (or git pull)
        try:
            if not os.path.exists("pelican"):
                command_sync(["git clone " + self.url + " pelican"])
            else:
                command_sync(["git pull origin master"], cwd="pelican")

            command_sync(["git submodule init && git submodule update", "pelican"],
                    cwd="pelican")
        except Exception as e:
            return e
        return None

    def __push_to_gh_pages(self):
        # テーマを使用してhtmlを生成
        # github用に修正(gh-import?)
        # gh-pagesをpull
        # gh-pagesにpush
        try:
            command_sync(["pelican content -s pelicanconf.py -t " + self.theme],
                    cwd="pelican")

            #command_sync(["ghp-import output"], cwd="pelican")

            #command_sync(["git push -f git@github.com:" + self.pub_url + " gh-pages:master"],
                    #cwd="pelican")
        except Exception as e:
            return e
        return None

    def __query_publish_memos(self):
        # publishする記事のリスト生成
        q = {"query": {
                "title": "",
                "text": "",
                "tag": "",
                "publish": 100
                },
            "offset": 0,
            "limit": sys.maxint
            }
        return json.loads(query_memo(self.user_id, q))

    def __check_update(self, new, old):
        # 更新リストを作成する
        # => jsonファイルと読んで記事と日付の対応をチェック
        #    => タイトルの無いもの、日付が一致しないものを更新対象に選択
        posts = []
        updates = []
        for n in new:
            key = str(n["id"])
            if key in old:
                # update
                o = old[key]
                old_date = o["modified"] if "modified" in o else o["date_time"]
                if old_date != n["date_time"]:
                    n["modified"] = n["date_time"]
                    n["date_time"] = o["date_time"]
                    updates.append(n)
            else:
                # new
                updates.append(n)
            # all posts
            posts.append(n)
        return posts, updates

    def __create_post(self, posts):
        # => content/*/にmd or rstファイル生成
        # => カテゴリ別にファイルを作成
        for p in posts:
            folder = 'pelican/content/' + self.categories[p["publish"]]["name"] + "/"
            if not os.path.exists(folder):
                os.makedirs(folder)
            ext = '.rst' if p["paser"] == "ReST" else '.md'
            ext_other = '.md' if p["paser"] == "ReST" else '.rst'
            name = folder + str(p['id']) + ext
            name_other = folder + str(p['id']) + ext_other
            title_tag = ':title: ' if p["paser"] == "ReST" else 'Title: '
            tags_tag = ':tags: ' if p["paser"] == "ReST" else 'Tags: '
            date_tag = ':date: ' if p["paser"] == "ReST" else 'Date: '
            mod_tag = ':modified: ' if p["paser"] == "ReST" else 'Modified: '
            if os.path.exists(name_other):
                os.remove(name_other)
            with open(name, 'w') as f:
                f.write(title_tag + p["title"].encode('utf_8') + "\n")
                f.write(tags_tag + p["tag"].encode('utf_8') + "\n")
                f.write(date_tag + p["date_time"] + "\n")
                if "modified" in p:
                    f.write(mod_tag + p["modified"] + "\n")
                f.write("\n" + p["basetext"].encode('utf_8'))

    def __generate_publish_file(self, posts):
        # jsonファイル作成
        with open("publish.json", "w") as f:
            d = dict()
            for p in posts:
                id = p['id']
                tmp = p
                del tmp["text"]
                del tmp["basetext"]
                del tmp["id"]
                d[id] = tmp
            json.dump(d, f, indent=4)
