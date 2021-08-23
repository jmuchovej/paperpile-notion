import shutil
import traceback
import itertools
from typing import Dict
from pathlib import Path

import click
from click import Context

from tqdm import tqdm
import numpy as np
import pandas as pd
from ruamel.yaml import YAML

from notion.client import NotionClient
from notion.collection import CollectionRowBlock
from notion.block import CollectionViewPageBlock


from paperpile_notion.preprocessing import (
    extract_status,
    extract_fields_methods,
)
from paperpile_notion import crud as CRUD


@click.group(invoke_without_command=True)
@click.help_option("-h", "--help")
@click.option("-t", "--token", "token", help="Your Notion API token.", envvar=["NOTION_TOKEN_V2", "TOKEN"])
@click.pass_context
def cli(ctx: Context, token: str) -> None:
    client_kwargs = {}
    if not token:
        client_kwargs["email"] = click.prompt("Your Notion email addresss")
        client_kwargs["password"] = click.prompt("Your Notion password", hide_input=True)
    else:
        client_kwargs["token_v2"] = token
    # TODO support integration tokens, BLOCK NotionClient doesn't support them
    ctx.obj = {}
    ctx.obj["notion"] = NotionClient(**client_kwargs)
    ctx.obj["config"] = ctx.invoke(config, edit=False)


@cli.command()
@click.option("-r", "--refs", "references",
    required=True,
    help="The JSON file exported from Paperpile."
)
@click.pass_context
def update_db(ctx: click.Context, references: str) -> None:
    """Updates your Author and Article databases."""
    ctx.invoke(update_author_db, references)
    ctx.invoke(update_article_db, references)


@cli.command()
@click.option("-r", "--refs", "references",
    required=True,
    help="The JSON file exported from Paperpile."
)
@click.option("--no-authors", type=bool, help="Don't update your Author's database.", default=False)
@click.pass_context
def update_article_db(ctx: click.Context, references: str, no_authors: bool) -> None:
    """Updates your Article's database, optionally syncing/updating your Author's
    database if specified in your 'config.yaml'.
    """
    notion = ctx.obj["notion"]
    config = ctx.obj["config"]

    assert "articles" in config["blocks"]
    articleCV = notion.get_block(config["blocks"]["articles"]).collection
    authorCV = None
    if not no_authors or "authors" in config["blocks"]:
        authorCV = notion.get_block(config["blocks"]["authors"]).collection

    assert references.endswith(".json")
    df = pd.read_json(references)[[
        "_id", "title", "author", "abstract",
        "labelsNamed", "foldersNamed",
        "journalfull", "journal", "kind",
    ]]

    df[["fields", "methods"]] = pd.DataFrame(df["labelsNamed"].apply(
        extract_fields_methods, config=config["fields-methods"]
    ).tolist())

    status_col = config["status"].get("col" , "foldersNamed")
    df["status"] = df[status_col].apply(extract_status, config=config["status"])
    df["author"] = df["author"].apply(lambda x: x if type(x) == list else [])

    print(f"Found {len(df)} papers in {references} and {len(articleCV.get_rows())}")

    pbar = tqdm(desc="Updating/Creating Articles", total=len(df))
    for idx, row in df.iterrows():
        try:
            entry = CRUD.article(row, articleCV, authorCV)
        except Exception as e:
            tqdm.write(row.title)
            # tqdm.write(str(traceback.format_exc()))
            tqdm.write(str(e))
            import pdb; pdb.set_trace()
        finally:
            pbar.update(1)



@cli.command()
@click.option("-r", "--refs", "references",
    required=True,
    help="The JSON file exported from Paperpile."
)
@click.pass_context
def update_author_db(ctx: click.Context, references: str) -> None:
    """Strictly updates the your Author's database in Notion.
    """
    notion = ctx.obj["notion"]
    config = ctx.obj["config"]

    if not config["authors"]["rollup"]:
        return

    assert "authors" in config["blocks"]
    authorCV = notion.get_block(config["blocks"]["authors"]).collection

    assert references.endswith(".json")
    df = pd.read_json(references)["author"]
    df = pd.melt(df.apply(pd.Series), value_name="author").dropna()["author"]
    df = pd.DataFrame(df.tolist())
    # df["orcid"] = pd.fillna(df["orcid"], "")

    pbar = tqdm(desc="Updating/Creating Authors", total=len(df))
    for idx, row in df.iterrows():
        try:
            entry = CRUD.author(row, authorCV)
        except Exception as e:
            tqdm.write(row.title)
            tqdm.write(str(traceback.format_exc()))
            tqdm.write(str(e))
        finally:
            pbar.update(1)


@cli.command("edit-config")
@click.pass_context
def config(ctx: click.Context, edit: bool = True) -> None:
    path = Path(click.get_app_dir("paperpile-notion")) / "config.yaml"

    dirs = [Path(), Path(click.get_app_dir("paperpile-notion"))]
    cfgs = ["config.yaml", "config.yml"]
    config_paths = [d / c for d, c in itertools.product(dirs, cfgs)]
    config = None

    for path in config_paths:
        try:
            config = YAML().load(path.open("r", encoding="utf-8"))
            break
        except FileNotFoundError:
            continue

    try:
        assert config
    except AssertionError:
        path.parent.mkdir(exist_ok=True)
        click.echo(click.style(f"Copying default configuration to `{path}`."))
        shutil.copy(str(Path(__file__) / "config.yaml"), str(path))
        config = YAML().load(path.open("r", encoding="utf-8"))

    if edit:
        path.parent.mkdir(exist_ok=True)
        click.edit(extension=".yaml", filename=path)
    else:
        return config
