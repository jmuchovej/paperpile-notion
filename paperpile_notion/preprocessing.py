from os import stat
from typing import Dict, List

import pandas as pd
from notion.collection import NotionSelect


def extract_fields_methods(labels: List, config: Dict) -> List:
    delim = config.get("delim", " - ")
    fields_methods = list(map(lambda x: x.split(delim), labels))
    fields_methods = list(filter(lambda x: len(x) == 2, fields_methods))

    fields, methods = [], []
    for field, method in fields_methods:
        try:
            fcolor = config["fields"][field]["color"]
        except (TypeError, KeyError) as e:
            fcolor = "default"

        try:
            field = config["fields"][field]["name"]
        except (TypeError, KeyError) as e:
            pass

        fields.append({"name": field, "color": fcolor})

        try:
            mcolor = config["methods"][method]["color"]
        except (TypeError, KeyError) as e:
            mcolor = fcolor

        try:
            method = config["methods"][method]["name"]
        except (TypeError, KeyError) as e:
            pass

        methods.append({"name": method, "color": mcolor})

    return {"fields": fields, "methods": methods}


def extract_status(row: List, config: Dict) -> List:
    prefix = config["prefix"]
    state = next(filter(lambda x: x.startswith(prefix), row), None)
    try:
        assert state
        status = config["states"][state.replace(prefix, "")]
    except (KeyError, AssertionError):
        return {"name": ":question: Unknown", "color": "default"}
    else:
        return {"name": status["name"], "color": status.get("color", "default")}
