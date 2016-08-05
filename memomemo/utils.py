# -*- coding: utf-8 -*-

import datetime
import markdown
from flask import Markup


def datetime2str(d):
    return d.strftime('%Y-%m-%d %H:%M:%S')


def str2datetime(s):
    return datetime.datetime.strptime(s, '%Y-%m-%d %H:%M:%S')


def parse_md(md):
    extensions = ['extra', 'admonition', 'codehilite(css_class=highlight)',
                  'nl2br', 'sane_lists', 'toc', 'del_ins', 'embedly']
    return Markup(markdown.markdown(md, extensions))
