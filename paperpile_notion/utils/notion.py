from typing import List, Dict
from functools import partial

import click
from notion_client import Client

from paperpile_notion import models


def retrieve_dbs(ctx: click.Context) -> None:
    notion = ctx.obj["notion"]
    config = ctx.obj["config"]

    errmsg = partial(click.secho, fg="red", bold=True)
    try:
        assert len(notion.databases.list()["results"]) > 0
    except AssertionError:
        errmsg("Please follow the steps to add your Integration to the Database.")
        
    click.echo("Retrieving database(s) ... ", nl=False)

    dbs = [
        [db["id"], db["title"][0]["plain_text"]]
        for db in notion.databases.list()["results"]
    ]

    try:
        # fmt: off
        authors  = next(filter(lambda db: config["db"]["authors" ] in db, dbs))[0]
        articles = next(filter(lambda db: config["db"]["articles"] in db, dbs))[0]
        ctx.obj["articles-cls"] = models.RelationalArticle
        # fmt: on
    except KeyError:
        authors = None
        articles = next(filter(lambda db: config["db"]["articles"] in db, dbs))[0]
        ctx.obj["articles-cls"] = models.MultiSelectArticle
    except (IndexError, StopIteration):
        errmsg("Your Integration must have access to your database(s).")
        exit(2)
    
    # fmt: off
    ctx.obj["authors" ] = authors 
    ctx.obj["articles"] = articles
    ctx.obj["authors-id"] = authors
    ctx.obj["articles-id"] = articles
    # fmt: on

    click.secho("done.", fg="green", bold=True)
    
    return ctx


def paginate_db(notion: Client, id: str) -> List[Dict]:
    """Paginates the database, since Notion returns <= 100 records per query."""
    query = partial(notion.databases.query, id)
    db = query()
    index = db["results"]

    while db["has_more"]:
        db = query(start_cursor=db["next_cursor"])
        index += db["results"]
    
    index += db["results"]
    return index


def db_to_dict(cls, key: str, items: List, uniq: str) -> Dict:
    """Converts a paginated database into a dictionary with keys for Notion's internal
    ID and the record itself.
    """
    attrs = [
        {"notionID": item["id"], key: models.from_props(cls, item["properties"])}
        for item in items
    ]
    return {getattr(item[key], uniq).string: item for item in attrs}

