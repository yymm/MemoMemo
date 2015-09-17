# -*- encoding: utf-8 -*-

import os
import sys
import md5
import json
import subprocess
from memomemo.database import User, query_memo

def command_sync(command, cwd="."):
    print(">>>")
    print(">>> " + command[0] + "  [path: " + cwd + "]")
    print(">>>")
    return subprocess.call(command, cwd=cwd, shell=True)

class PublishPelican:
    def __init__(self, user_id, url, categories, theme,
            publish_url, custom, blog_url):
        self.user_id = user_id
        self.user = User.query.get(self.user_id)
        self.categories = categories
        self.theme = theme
        if "MEMOMEMO_GIT_USER" in os.environ and "MEMOMEMO_GIT_PASS" in os.environ:
            u = os.environ["MEMOMEMO_GIT_USER"]
            p = os.environ["MEMOMEMO_GIT_PASS"]
            self.url = "https://" + u + ":" + p + "@github.com/" + url + ".git"
            self.pub_url = "https://" + u + ":" + p + "@github.com/" + publish_url + ".git"
        else:
            self.url = "git@github.com:" + url + ".git"
            self.pub_url = "git@github.com:" + publish_url + ".git"
        self.custom = custom
        self.blog_url = blog_url

    def run(self):
        new = self.__query_publish_memos()
        posts = []
        updates = []
        deletes = []

        old = self.user.config.get_config_element("publish")
        if old:
            posts, updates, deletes = self.__check_update(new, old)
        else:
            posts = updates = new

        if len(updates) == 0 and len(deletes) == 0:
            return True, [], []

        if len(deletes) != 0:
            self.__delete_pages(deletes)

        if self.__pull_pelican():
            return False, [], []

        self.__create_post(updates)

        if self.__push_to_gh_pages():
            return False, [], []

        self.__generate_publish(posts)

        return True, updates, deletes

    def __pull_pelican(self):
        # pelicanのリポジトリをgit clone (or git pull)
        try:
            command_sync(["git config --global --list"])
            if not os.path.exists("pelican"):
                command_sync(["git clone " + self.url + " pelican"])
            else:
                command_sync(["git pull origin master"], cwd="pelican")

            if not os.path.exists("pelican/pelican-plugins"):
               command_sync(["git clone --recursive https://github.com/getpelican/pelican-plugins"],
                    cwd="pelican")

            command_sync(["git submodule init && git submodule update"],
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
            # master branch
            command_sync(["git add . --all"], cwd="pelican")
            command_sync(['git commit -m "Update posts."'], cwd="pelican")
            command_sync(["git push origin master"], cwd="pelican")

            # create output
            if os.path.exists("pelican/output/"):
                command_sync(["rm -r output"], cwd="pelican")
            command_sync(["pelican content -s pelicanconf.py -t " + self.theme],
                    cwd="pelican")

            if self.custom:
                for c in self.custom:
                    command_sync([c["command"]], cwd=c["cwd"])

            command_sync(["ghp-import output"], cwd="pelican")

            # ph-pages branch
            command_sync(["git checkout gh-pages"], cwd="pelican")
            command_sync(['echo "' + self.blog_url + '" > CNAME'], cwd="pelican")
            command_sync(["git add CNAME"], cwd="pelican")
            command_sync(['git commit -m "Add CNAME."'], cwd="pelican")
            command_sync(['git checkout master'], cwd="pelican")

            command_sync(["git push " + self.pub_url + " gh-pages:master"],
                    cwd="pelican")
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
        deletes = []
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
                elif "modified" in o:
                    n["date_time"] = o["date_time"]
                    n["modified"] = o["modified"]
            else:
                # new
                updates.append(n)
            # all posts
            posts.append(n)

        # delete
        for key in old.iterkeys():
            is_exist = False
            for n in new:
                if n["id"] == int(key):
                    is_exist = True
                    continue
            if not is_exist:
                deletes.append(old[key])

        return posts, updates, deletes

    def __delete_pages(self, deletes):
        # => 記事削除
        for d in deletes:
            path = 'pelican/content/' + self.categories[d["publish"]]["name"] \
                    + "/" + str(d["id"])
            ext = ".rst" if d["paser"] == "ReST" else ".md"
            os.remove(path + ext)
        return

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
            slug_tag = ':slug: ' if p["paser"] == "ReST" else 'Slug: '
            if os.path.exists(name_other):
                os.remove(name_other)
            with open(name, 'w') as f:
                f.write(title_tag + p["title"].encode('utf_8') + "\n")
                f.write(tags_tag + p["tag"].encode('utf_8') + "\n")
                f.write(date_tag + p["date_time"] + "\n")
                if "modified" in p:
                    f.write(mod_tag + p["modified"] + "\n")
                f.write(slug_tag + md5.new(str(p["id"])).hexdigest() + "\n")
                f.write("\n" + p["basetext"].encode('utf_8'))

    def __generate_publish(self, posts):
        d = dict()
        for p in posts:
            id = p['id']
            tmp = p
            del tmp["text"]
            del tmp["basetext"]
            del tmp["tag"]
            d[id] = tmp
        self.user.config.set_config_element("publish", d)
