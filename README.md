# Paperpile Notion Integration

**NOTE:** This is a not an official Paperpile integration.

This is a Python CLI to manually sync your articles in Paperpile to a Notion database.
Optionally, you may sync an authors database as well.

**NOTE:** This will only be maintained if Paperpile doesn't integrate directly
with Notion. They have expressed interest, [here][forum.paperpile/notion].

[gsarti]: https://github.com/gsarti/paperpile-notion
[forum.paperpile/notion]: https://forum.paperpile.com/t/suggestion-for-notion-hook/

This is a :construction: work in progress. This isn't production-ready software, so it
may be contain edge-cases not present in the BibTeX's we have tested. **Please feel
free to open issues if you encounter any bugs.**

## Usage

The documentation site contains a thorough walk-through to setup a GitHub-based
sync service which just requires some initial configuration.

## Installation 

You can `pip` install `paperpile-notion`, **preferably in a virtual environment**.

```bash
pip install paperpile-notion
```

## Requirements

To use `paperpile-notion`, you'll need a few things:

1. A `JSON` export from Paperpile. You can retrieve this by going to "Settings >
   Export > Export to JSON".
1. A configuration file, similar to what you'll find in
   [`docs/config.yml`][config]. **Currently, we do not support venues, but it is
   planned.**
1. Your `Article` database URL, which you can copy directly from your browser.
1. (**optional**) Your `Author` database URL, copied in a similar way as above.
1. Your `token_v2` (detailed below) **OR** your email/password (never stored by
   `paperpile-notion`).

**NOTE:** Your `Article` database __must have the following columns:__

| Name | Type | Description |
| ---- | ---- | ------------|
| Title   | Name | The title of the paper is used as Notion's default "Name" field for reference in other documents |
| ID   | `text` | An ID issued by Paperpile which can be used to uniquely identify papers, feel free to hide the column in Notion once created. |
| Status | `select` | Your reading status. Can be fully customized in your `config.yml`. |
| Authors | `multi_select` OR `relation` | The paper's authors. If you have an `Author` database, use the `relation` type otherwise a `multi_select`. |
| URL | `url` | A link to the paper in Paperpile. |
| Fields | `multi_select` | The [sub-]fields the paper belongs to. |
| Methods | `multi_select` | The methods/tools used in the paper. |

[config]: docs/config.yml

## Usage

As we use `notion-py`, we are limited by their support for either an
email/password login OR your `TOKEN_V2`. Your `token_v2` may be retrieved from
your [notion.so][notion] cookies.

1. [Using your `token_v2` (recommended)](#token-v2)
1. [Using your email/password](#email-pass)

<i id="token-v2"></i>
### Using your `token_v2` (recommended)

You have two ways to supply your `token_v2` to `paperpile-notion`:
1. (**preferred**) You may store it in an environment variable called
   `NOTION_TOKEN_V2`, which will be read by `paperpile-notion`.
1. **OR** you may pass your token in using the `--token <token_v2>` flag.

```bash
# Using NOTION_TOKEN_V2
$ paperpile-notion update-db --refs <YOUR_JSON>.json

# Using --token ...
$ paperpile-notion --token <token_v2> update-db --refs <YOUR_JSON>.json
```

<i id="email-pass"></i>
### Using your email/password

You will be prompted each time for your Notion email/password login.

```bash
paperpile-notion update-db --refs <YOUR_JSON>.json
```


### Example output

When adding, adding a new paper to the database:

![Console output](img/output.png)

Example resulting database on Notion:

![Notion result](img/notion_result.png)
