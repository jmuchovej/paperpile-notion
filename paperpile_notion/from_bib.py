from functools import partial
from pathlib import Path
import re
from typing import Any, Callable, List, Tuple, Dict
import traceback

from fuzzywuzzy import process, fuzz
from attr import asdict
import click
from bibtexparser.bparser import BibTexParser
from bibtexparser.bibdatabase import BibDatabase

from paperpile_notion import models
from paperpile_notion.models import Author
from paperpile_notion.utils import bibtex


_extractOne = {"scorer": fuzz.token_set_ratio, "score_cutoff": 75}


def parse(config: Dict, file: click.File) -> BibDatabase:
    customize = partial(bibtex.customizations, config=config)
    parser = BibTexParser(
        common_strings=True,
        homogenize_fields=True,
        customization=customize,
    )
    bib = parser.parse_file(file)

    return bib
    

def create_author(ctx: click.Context, author: str) -> None:
    # fmt: off
    notion  = ctx.obj["notion"]
    authors = ctx.obj["authors"]
    parent = {"database_id": ctx.obj["authors-id"]}
    # fmt:  on

    l_entry = Author(author)

    one = process.extractOne(author, authors.keys(), **_extractOne)
    # Because we only create/skip, we just need to check existence.
    state = "skip" if one else "create"
    if state == "create":
        notion.pages.create(parent=parent, properties=asdict(l_entry))

    return state


def _get_author_notionID(ctx: click.Context, author: str) -> Dict:
    authors = ctx.obj["authors"]
    extract = process.extractOne(author, authors.keys(), **_extractOne)
    while extract is None:
        try:
            create_author(ctx, author)
        except:
            print(author)
            print(asdict(Author(author)))
        extract = process.extractOne(author, authors.keys(), **_extractOne)

    return {"id": authors[extract[0]]["notionID"]} 


def create_article(ctx: click.Context, entry: Dict) -> None:
    # fmt: off
    notion   = ctx.obj["notion"]
    authors  = ctx.obj["authors"]
    articles = ctx.obj["articles"]
    # fmt: on

    if authors:
        _lookup = partial(_get_author_notionID, ctx=ctx)
        entry["Authors"] = [_lookup(author=author) for author in entry["Authors"]]

    l_entry = models.from_props(ctx.obj["articles-cls"], entry)
    kwargs = {"properties": asdict(l_entry)}

    bibID, notionID = _get_article_notionID(entry["ID"], entry["Title"], articles)

    if notionID:
        fn = partial(notion.pages.update, notionID)
        n_entry = articles[bibID]["article"]
        state = "update" if n_entry != l_entry else "skip"
    else:
        kwargs["parent"] = {"database_id": ctx.obj["articles-id"]}
        fn = notion.pages.create
        state = "create"

    if state == "skip":
        return state

    try:
        fn(**kwargs)
    except Exception as e:
        print(traceback.format_exc())
        print(kwargs["properties"])
        state = "failed"
    finally:
        return state


def _get_article_notionID(bibID: str, title: str, articles: Dict) -> str:
    """Retrieves the appropriate Notion UUID based on either the BibTeX ID supplied
    by Paperpile OR by ``fuzzywuzzy.process.extractOne``'s highest match (>= 80%).
    """
    ks, vs = list(articles.keys()), list(articles.values())
    notionIDs = [a["notionID"] for a in vs]
    try:

        index = ks.index(bibID)
        return ks[index], notionIDs[index]
    except ValueError:
        pass

    try:
        titles = [a["article"].Title for a in vs]

        extractOne = _extractOne.copy()
        extractOne["score_cutoff"] = 95
        extract = process.extractOne(title, titles, **extractOne)

        index = titles.index(extract[0])
        return ks[index], notionIDs[index]
    except (ValueError, AssertionError, Exception):
        pass

    return None, None