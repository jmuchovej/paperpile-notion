from typing import AnyStr

import emojis 

__all__ = ["ensure_cls", "extract_plain_text", "emojize", "notion_colors"]

# https://github.com/python-attrs/attrs/issues/140#issuecomment-277106952
def ensure_cls(cls):
    def converter(val, *args, **kwargs):
        if isinstance(val, cls):
            return val
        return cls(val, *args, **kwargs)

    return converter


def extract_plain_text(key):
    def converter(val):
        try:
            return val[key][0]["plain_text"]
        except KeyError:
            return ""
    return converter


def emojize(x):
    return emojis.encode(str(x))


NOTION_COLORS = ["default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"]

def notion_colors(color):
    try:
        assert color in NOTION_COLORS
    except AssertionError:
        color = None
    return color