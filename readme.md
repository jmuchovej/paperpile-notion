# Paperpile Notion Integration

**NOTE:** This is not an official Paperpile product.

This is a TypeScript CLI to sync your articles from Paperpile to a Notion
database. Optionally, you may sync an authors database as well.

**NOTE:** This will only be maintained as long as Paperpile doesn't develop
their own integration with Notion. They have expressed interest,
[here][forum.paperpile/notion].

[forum.paperpile/notion]: https://forum.paperpile.com/t/suggestion-for-notion-hook/

🚧 Overall, this is project is still a work in progress. This shouldn't be used
as
production-ready software, so there may be failing edge-cases that haven't been
considered/tested. **Please feel free to open an issue reporting any
bugs/edge-cases you may encounter.**

[![Version](https://img.shields.io/npm/v/@jmuchovej/paperpile-notion.svg)](https://npmjs.org/package/@jmuchovej/paperpile-notion)
[![Downloads/week](https://img.shields.io/npm/dw/@jmuchovej/paperpile-notion.svg)](https://npmjs.org/package/@jmuchovej/paperpile-notion)
[![License](https://img.shields.io/npm/l/@jmuchovej/paperpile-notion.svg)](https://github.com/jmuchovej/paperpile-notion/blob/main/package.json)

While this project is at `v1.x.x`, this should not be considered
production-ready. It follows semantic versioning, and the migration to
TypeScript, obviously, breaks compatability with the Python implementation.

* [**🏗 Initial Setup**](#-initial-setup)
* [**🧑‍💻Usage**](#-usage)
  * [[Recommended] Automatically (via GitHub Workflows)](#recommended-automatically-via-github-workflows)
  * [Manually](#manually)
* [**🛠 Commands**](#-commands)

# 🏗 Initial Setup

<!-- initial-setup -->

Prior to using `paperpile-notion`, you'll need to setup a few things:

1. Gather a BibTeX export (either manually exported from Paperpile or via their
   "Workflows & Integrations").
2. A configuration file, similar to what you'll find in
   [`docs/paperpile-notion.config.js`][config].
3. Your `Article` database UUID, which you can copy directly from your browser.
   (It's that 32-character long hexadecimal string &ndash; that looks like
   `notion.so/1234567890abcdef1234567890abcdef`.)
4. (**Optional**) Your `Author` database URL, copied in a similar manner as
   above.
5. Your Notion Integration Token. Follow
   along [these steps outlined by Notion.][notion/new-integration] **Copy the
   Integration Token that starts with `secret_`**, you'll need this
   later.

[notion/new-integration]: https://developers.notion.com/docs/getting-started#getting-started

[config]: docs/config.js

<!-- initial-setup-stop -->

# 🧑‍💻Usage

## [Recommended] Automatically (via GitHub Workflows)

1. Use the template laid out in [Sync your Paperpile to Notion][sync-repo]
2. Create a new repository secret named `NOTION_INTEGRATION_TOKEN` by
   following [this article][secrets].
3. Edit the `paperpile-notion.config.js` file you see in the repository root.

[sync-repo]: https://github.com/jmuchovej/paperpile-notion-starter

[secrets]: https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository

## Manually

1. Globally install `@jmuchovej/paperpile-notion`. (You should globally install
   so that you can access the CLI as a program.) **You do not need `sudo` access
   to correctly install this program.**
   ```shell
   $ npm install -g @jmuchovej/paperpile-notion
   ```
2. Ensure that your Notion Integration Token is added to your environment. I
   recommend using a tool like `direnv` or `dotenv`. (`paperpile-notion` is
   purpose-built to run as a GitHub Workflow, so this method will receive little
   support.)
3. Run the sequence of commands that will perform your desired sync state. (To
   learn more, check out the [commands](#commands) detailed below.)

# 🛠 Commands

<!-- commands -->

* [`paperpile-notion articles:clean BIBTEXPATH`](#paperpile-notion-articlesclean-bibtexpath)
* [`paperpile-notion articles:sync BIBTEXPATH`](#paperpile-notion-articlessync-bibtexpath)
* [`paperpile-notion articles:sync-diff BIBTEXPATH`](#paperpile-notion-articlessync-diff-bibtexpath)
* [`paperpile-notion authors:clean BIBTEXPATH`](#paperpile-notion-authorsclean-bibtexpath)
* [`paperpile-notion authors:sync BIBTEXPATH`](#paperpile-notion-authorssync-bibtexpath)
* [`paperpile-notion authors:sync-diff BIBTEXPATH`](#paperpile-notion-authorssync-diff-bibtexpath)

## `paperpile-notion articles:clean BIBTEXPATH`

Cleans up your Articles Database.

```
USAGE
  $ paperpile-notion articles:clean [BIBTEXPATH] -t <value> [-c <value>] [-h]

FLAGS
  -c, --config=<value>  Path to your config file, if not in /Users/jmuchovej/.config/paperpile-notion/config.js.
  -h, --help            Show CLI help.
  -t, --token=<value>   (required) Your Notion Integration's Token.

DESCRIPTION
  Cleans up your Articles Database.

  1. Removes dangling articles without authors.

EXAMPLES
  $ paperpile-notion articles:clean /path/to/references.bib

  $ paperpile-notion articles:clean /path/to/references.bib -c /path/to/paperpile-notion.config.js
```

_See
code: [dist/commands/articles/clean.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.2.2/dist/commands/articles/clean.ts)_

## `paperpile-notion articles:sync BIBTEXPATH`

Syncs your Articles Database with the local BibTeX file.

```
USAGE
  $ paperpile-notion articles:sync [BIBTEXPATH] -t <value> [-c <value>] [-h]

FLAGS
  -c, --config=<value>  Path to your config file, if not in /Users/jmuchovej/.config/paperpile-notion/config.js.
  -h, --help            Show CLI help.
  -t, --token=<value>   (required) Your Notion Integration's Token.

DESCRIPTION
  Syncs your Articles Database with the local BibTeX file.

  Strictly creates or updates articles based on the ID assigned by Paperpile.

EXAMPLES
  $ paperpile-notion articles:sync /path/to/references.bib

  $ paperpile-notion articles:sync /path/to/references.bib -c /path/to/paperpile-notion.config.js
```

_See
code: [dist/commands/articles/sync.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.2.2/dist/commands/articles/sync.ts)_

## `paperpile-notion articles:sync-diff BIBTEXPATH`

describe the command here

```
USAGE
  $ paperpile-notion articles:sync-diff [BIBTEXPATH] -t <value> [-c <value>] [-h]

FLAGS
  -c, --config=<value>  Path to your config file, if not in /Users/jmuchovej/.config/paperpile-notion/config.js.
  -h, --help            Show CLI help.
  -t, --token=<value>   (required) Your Notion Integration's Token.

DESCRIPTION
  describe the command here

EXAMPLES
  $ paperpile-notion articles:sync-diff /path/to/references.bib

  $ paperpile-notion articles:sync-diff /path/to/references.bib -c /path/to/paperpile-notion.config.js
```

_See
code: [dist/commands/articles/sync-diff.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.2.2/dist/commands/articles/sync-diff.ts)_

## `paperpile-notion authors:clean BIBTEXPATH`

Cleans up your Authors Database.

```
USAGE
  $ paperpile-notion authors:clean [BIBTEXPATH] -t <value> [-c <value>] [-h]

FLAGS
  -c, --config=<value>  Path to your config file, if not in /Users/jmuchovej/.config/paperpile-notion/config.js.
  -h, --help            Show CLI help.
  -t, --token=<value>   (required) Your Notion Integration's Token.

DESCRIPTION
  Cleans up your Authors Database.

  1. Removes dangling authors with no articles.

  2. Attempts to clean up and merge authors and aliases.

EXAMPLES
  $ paperpile-notion authors:clean /path/to/references.bib

  $ paperpile-notion authors:clean /path/to/references.bib -c /path/to/paperpile-notion.config.js
```

_See
code: [dist/commands/authors/clean.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.2.2/dist/commands/authors/clean.ts)_

## `paperpile-notion authors:sync BIBTEXPATH`

Syncs your Authors Database with the local BibTeX file.

```
USAGE
  $ paperpile-notion authors:sync [BIBTEXPATH] -t <value> [-c <value>] [-h]

FLAGS
  -c, --config=<value>  Path to your config file, if not in /Users/jmuchovej/.config/paperpile-notion/config.js.
  -h, --help            Show CLI help.
  -t, --token=<value>   (required) Your Notion Integration's Token.

DESCRIPTION
  Syncs your Authors Database with the local BibTeX file.

  Authors will be created if not present (or if they don't match a manually entered alias). Otherwise, Authors will have
  their name stripped of whitespace and articles consolidation based on matching Aliases.

EXAMPLES
  $ paperpile-notion authors:sync /path/to/references.bib

  $ paperpile-notion authors:sync /path/to/references.bib -c /path/to/paperpile-notion.config.js
```

_See
code: [dist/commands/authors/sync.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.2.2/dist/commands/authors/sync.ts)_

## `paperpile-notion authors:sync-diff BIBTEXPATH`

describe the command here

```
USAGE
  $ paperpile-notion authors:sync-diff [BIBTEXPATH] -t <value> [-c <value>] [-h]

FLAGS
  -c, --config=<value>  Path to your config file, if not in /Users/jmuchovej/.config/paperpile-notion/config.js.
  -h, --help            Show CLI help.
  -t, --token=<value>   (required) Your Notion Integration's Token.

DESCRIPTION
  describe the command here

EXAMPLES
  $ paperpile-notion authors:sync-diff /path/to/references.bib

  $ paperpile-notion authors:sync-diff /path/to/references.bib -c /path/to/paperpile-notion.config.js
```

_See
code: [dist/commands/authors/sync-diff.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.2.2/dist/commands/authors/sync-diff.ts)_
<!-- commandsstop -->
