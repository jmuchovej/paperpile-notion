from functools import partial
from typing import Callable, Dict, List

from bibtexparser import customization


def title(record: Dict) -> Dict:
    record["Title"] = record["title"].replace("\n", " ")
    del record["title"]
    return record


def author(record: Dict, key: str) -> Dict:
    try:
        authors = record[key]
        if all([type(author) == dict for author in authors]):
            authors = [author["name"] for author in authors]

        authors = [" ".join(author.split(",")[::-1]) for author in authors]
        authors = [author.replace("\n", " ").strip() for author in authors]
    except KeyError:
        authors = []
    finally:
        record[f"{key.title()}s"] = authors
        del record[key]
    return record


def abstract(record: Dict) -> Dict:
    record["Abstract"] = record["abstract"].replace("\n", " ")
    del record["abstract"]
    return record


def venue(record: Dict, config: Dict) -> Dict:
    venue = config[record["ENTRYTYPE"]]
    record["Venue"] = record[venue].replace("\n", " ")
    return record


def folder(record: Dict) -> Dict:
    keywords = set(record["keyword"])
    folders = {i for i in keywords if "/" in i}
    record["keyword"] = list(keywords - folders)
    record["Folders"] = list(folders)
    return record


def status(record: Dict, config: Dict) -> Dict:
    keywords = set(record["keyword"])
    prefix = config["prefix"]
    states = config["states"]

    status = {i for i in keywords if i.startswith(prefix)}
    record["keyword"] = list(keywords - status)

    try:
        assert len(status) > 0
        states_map = dict(zip(states.keys(), range(len(states))))

        status = [s.replace(prefix, "") for s in status]
        status = sorted(status, key=lambda s: states_map[s], reverse=True)
        status = states[status[0]]
    except (AssertionError, Exception):
        status = {"name": ":question: Unknown", "color": "default"}
    finally:
        record["Status"] = status

    return record


def fields_methods(record: Dict, config: Dict) -> Dict:
    keywords = set(record["keyword"])
    delim = config["delim"]

    try:
        fields = {k.split(delim)[0] for k in keywords}
        fields_map  = config["fields" ]
        fields  = [fields_map[f]  for f in fields ]
        record["Fields"] = fields
    except (KeyError, TypeError, IndexError):
        record["Fields"] = []

    try:
        methods = {k.split(delim)[1] for k in keywords}
        methods_map = config["methods"]
        methods = [methods_map[m] for m in methods]
        record["Methods"] = methods
    except (KeyError, TypeError, IndexError):
        record["Methods"] = []

    record["keyword"] = list(keywords - {k for k in keywords if delim in k})

    return record


def customizations(record: Dict, config: Dict) -> Dict:
    # TODO support customization.editor
    _customizations_ = [
        customization.link, customization.type, customization.author,
        customization.convert_to_unicode, customization.keyword,
    ]
    _customizations_ += [
        title, folder, partial(status, config=config["status"]),
        partial(author, key="author"), partial(author, key="editor"),
        partial(fields_methods, config=config["fields-methods"]),
        partial(venue, config=config["bibtex"]["venues"]),
    ]

    # import ipdb; ipdb.set_trace()

    for fn in _customizations_:
        try:
            record = fn(record)
        except KeyError:
            continue
    
    return record