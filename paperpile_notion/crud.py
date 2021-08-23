import emojis
import pandas as pd
from pandas.core.indexes.base import Index
from notion.block import CollectionViewPageBlock as CV


def author(row: pd.Series, authorCV: CV) -> None:
    try:
        entry = authorCV.get_rows(search=row["_id"])[0]
    except IndexError:
        entry = authorCV.add_row()

    entry.id = row["_id"]
    try:
        entry.title = f"{row['first']} {row['last']}"
    except KeyError:
        entry.title = row["formatted"]
    entry.disciplines += [emojis.encode(":lab_coat: Research")]

    return entry


def article(row: pd.Series, articleCV: CV, authorCV: CV = None) -> None:
    try:
        assert type(row["_id"]) != float, f"{row['title']} doesn't have an ID."
    except AssertionError:
        return None

    try:
        entry = articleCV.get_rows(search=row["_id"])[0]
    except IndexError:
        entry = articleCV.add_row()

    entry.id = row["_id"]
    entry.title = row["title"]
    entry.url = f"https://paperpile.com/app/p/{entry.id}"

    entry.labels = row["labelsNamed"]
    entry.folders = row["foldersNamed"]
    entry.methods = [m["name"] for m in row["methods"]]
    entry.fields = [f["name"] for f in row["fields"]]

    entry.status = emojis.encode(row["status"]["name"])

    if authorCV:
        author_ls = []
        for author_ in row["author"]:
            try:
                author_ls += [authorCV.get_rows(search=author_["_id"])[0]]
            except IndexError:
                author_ls += [author(author_, authorCV)]
        entry.authors = author_ls
    else:
        entry.authors = [i["formatted"] for i in row["author"]]
    
    return entry
