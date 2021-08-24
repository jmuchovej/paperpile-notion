import traceback
from typing import Any, Callable, List, Tuple

import click
import emojis
import pandas as pd
from notion.block import CollectionViewPageBlock as CV


def _update(old: Any, new: Any, states: List[str]) -> Tuple[Any, bool]:
    try:
        diff = hash(old) != hash(new)
    except TypeError:
        diff = hash(f"{list(old)}") != hash(f"{list(new)}")
    return new, states + ["update" if diff else "skip"]


def _convert(states: List[str], title: str) -> str:
    styles = {
        "update": click.style("Updated:", fg="blue", bold=True),
        "skip": click.style("Skipped:", fg="yellow", bold=True),
        "create": click.style("Created:", fg="green", bold=True),
        "failed": click.style("Failed:", fg="red", bold=True),
    }

    all_skips = states[1:].count("skip") == len(states) - 1
    states[0] = "skip" if all_skips else states[0]
    return [styles[states[0]], click.style(title, underline=True)]


def author(row: pd.Series, authorCV: CV) -> None:
    try:
        entry = authorCV.get_rows(search=row["_id"])[0]
        states = ["update"]
    except IndexError:
        entry = authorCV.add_row()
        states = ["create"]

    entry.id, states = _update(entry.id, row["_id"], states)
    try:
        title = f"{row['first']} {row['last']}"
    except KeyError:
        title = row["formatted"]
    entry.title, states = _update(entry.title, title, states)

    entry.disciplines += [emojis.encode(":lab_coat: Research")]

    return entry, _convert(states, entry.title)


def article(row: pd.Series, articleCV: CV, authorCV: CV = None) -> None:
    try:
        assert not isinstance(row["_id"], float), f"{row['title']} doesn't have an ID."
    except AssertionError:
        return None, _convert(["failed"], row["title"])

    try:
        entry = articleCV.get_rows(search=row["_id"])[0]
        states = ["update"]
    except IndexError:
        entry = articleCV.add_row()
        states = ["create"]

    entry.id, states = _update(entry.id, row["_id"], states)
    entry.title, states = _update(entry.title, row["title"], states)
    entry.url, states = _update(
        entry.url, f"https://paperpile.com/app/p/{entry.id}", states
    )

    entry.labels, states = _update(entry.labels, row["labelsNamed"], states)
    entry.folders, states = _update(entry.folders, row["foldersNamed"], states)
    entry.methods, states = _update(
        entry.methods, [m["name"] for m in row["methods"]], states
    )
    entry.fields, states = _update(
        entry.fields, [f["name"] for f in row["fields"]], states
    )

    entry.status, states = _update(
        entry.status, emojis.encode(row["status"]["name"]), states
    )

    if authorCV:
        author_ls = []
        for author_ in row["author"]:
            try:
                author_ls += [authorCV.get_rows(search=author_["_id"])[0]]
            except IndexError:
                author_ls += [author(author_, authorCV)]
    else:
        author_ls = [i["formatted"] for i in row["author"]]
    entry.authors, states = _update(entry.authors, author_ls, states)

    return entry, _convert(states, entry.title)


def dispatch(df: pd.DataFrame, fn: Callable, CVs: List, desc: str = "") -> None:
    from click import style as s

    text = [
        "Found",
        s(len(df), bold=True),
        f"{fn.__name__}s in JSON and",
        s(len(CVs[0].get_rows()), bold=True),
        "on Notion.",
    ]
    click.echo(" ".join(map(lambda x: click.style(x, fg="magenta"), text)))

    for idx, row in df.iterrows():
        states = []
        try:
            entry, states = fn(row, *CVs)
        except Exception as e:
            f = [
                s("Exception:", fg="red", bold=True),
                f"{e} raised at",
                s(row.title, underline=True),
            ]
            click.echo(" ".join(f))
            click.echo(traceback.format_exc())
        finally:
            click.echo("  " + " ".join(states))

    # with click.progressbar(length=len(df), label=desc) as pbar:
    #     for idx, row in df.iterrows():
    #         states = []
    #         try:
    #             entry, states = fn(row, *CVs)
    #         except Exception as e:
    #             tqdm.write(row.title)
    #             tqdm.write(str(e))
    #         finally:
    #             pbar.update(1)
    #             click.echo(" " + " ".join(states) + " ", nl=False)

    click.secho(emojis.encode(":confetti_ball:: Done!"), fg="cyan", blink=True)
