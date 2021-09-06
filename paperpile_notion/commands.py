import itertools
import shutil
from pathlib import Path

import click
from click import Context
from notion_client import Client
from ruamel.yaml import YAML

from paperpile_notion import utils, from_bib
from paperpile_notion.models import Author


_reference_option_params = {
    "required": True,
    "help": "The BibTeX file exported from Paperpile",
    "type": click.File(mode="r", encoding="utf-8"),
}

_token_option_params = {
    "help": "Your Notion Integration token.",
    "envvar": ["NOTION_INTEGRATION_TOKEN", "NOTION_TOKEN", "TOKEN"],
}

@click.group(invoke_without_command=True)
@click.help_option("-h", "--help")
@click.option("-t", "--token", "token", **_token_option_params)
@click.pass_context
def cli(ctx: Context, token: str) -> None:
    ctx.obj = {}
    ctx.obj["notion"] = notion = Client(auth=token)
    ctx.obj["config"] = config = ctx.invoke(get_config, edit=False)


def _preload_databases(ctx: click.Context, references: click.File) -> None:
    try:
        assert "articles" not in ctx.obj
    except AssertionError:
        return

    notion = ctx.obj["notion"]
    config = ctx.obj["config"]

    try:
        assert "articles" in config["db"]
    except AssertionError:
        click.secho("You must provide a name/ID to your Article database.", fg="red", bold=True)
        exit(1)

    ctx = utils.notion.retrieve_dbs(ctx)

    click.secho("Converting Articles DB ... ", nl=False)
    articles = utils.notion.paginate_db(notion, ctx.obj["articles"])
    articles = utils.notion.db_to_dict(ctx.obj["articles-cls"], "article", articles, "ID")
    ctx.obj["articles"] = articles
    click.secho("done.", fg="green", bold=True)

    if ctx.obj["authors"]:
        click.secho("Converting Authors DB ... ", nl=False)
        authors = utils.notion.paginate_db(notion, ctx.obj["authors"])
        authors = utils.notion.db_to_dict(Author, "author", authors, "Name")
        ctx.obj["authors"] = authors
        click.secho("done.", fg="green", bold=True)

    click.secho(f"Reading {references.name} ... ", nl=False)
    ctx.obj["bibtex"] = from_bib.parse(ctx.obj["config"], references)
    click.secho("done.", fg="green", bold=True)


@cli.command()
@click.option("-r", "--refs", "references", **_reference_option_params)
@click.pass_context
def update_db(ctx: click.Context, references: click.File) -> None:
    """Updates your Author and Article databases."""
    _preload_databases(ctx, references)
    ctx.invoke(update_author_db, references=references)
    ctx.invoke(update_article_db, references=references)


@cli.command()
@click.option("-r", "--refs", "references", **_reference_option_params)
@click.pass_context
def update_article_db(ctx: click.Context, references: click.File) -> None:
    """Updates your Article's database, optionally syncing/updating your Author's
    database if specified in your 'config.yaml'.
    """
    _preload_databases(ctx, references)
    utils.printers.summarize("Articles", ctx.obj["bibtex"].entries, ctx.obj["articles"])

    for entry in ctx.obj["bibtex"].entries:
        # import ipdb; ipdb.set_trace()
        state = from_bib.create_article(ctx, entry)
        utils.printers.status(state, entry["Title"])


@cli.command()
@click.option("-r", "--refs", "references", **_reference_option_params)
@click.pass_context
def update_author_db(ctx: click.Context, references: click.File) -> None:
    """Strictly updates the your Author's database in Notion."""
    if not ctx.obj["authors"]:
        return

    _preload_databases(ctx, references)

    bibtex_authors = [b["Authors"] for b in ctx.obj["bibtex"].entries]
    bibtex_authors = set(itertools.chain(*bibtex_authors))

    utils.printers.summarize("Authors", bibtex_authors, ctx.obj["authors"])

    for author in bibtex_authors:
        state = from_bib.create_author(ctx, author)
        utils.printers.status(state, author)

        
@cli.command("edit-config")
@click.pass_context
def get_config(ctx: click.Context, edit: bool = True) -> None:
    path = Path(click.get_app_dir("paperpile-notion")) / "config.yaml"
    default_config = Path(__file__).parent.parent / "docs/config.yaml"

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
        shutil.copy(str(default_config), str(path))
        config = YAML().load(path.open("r", encoding="utf-8"))

    if edit:
        path.parent.mkdir(exist_ok=True)
        click.edit(extension=".yaml", filename=path)
    else:
        return config
