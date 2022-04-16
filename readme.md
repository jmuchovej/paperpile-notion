# Paperpile Notion Integration

**NOTE:** This is not an official Paperpile product.

This is a TypeScript CLI to sync your articles from Paperpile to a Notion
database. Optionally, you may sync an authors database as well.

**NOTE:** This will only be maintained as long as Paperpile doesn't develop
their own integration with Notion. They have expressed interest,
[here][forum.paperpile/notion].

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

* [Initial Setup](#initial-setup)
* [Usage](#usage)
  * [[Recommended] Automatically (via GitHub Workflows)](#recommended-automatically-via-github-workflows)
  * [Manually](#manually)
* [Commands](#commands)

## Initial Setup

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

[config]: docs/paperpile-notion.config.js

<!-- /initial-setup -->

## Usage

### [Recommended] Automatically (via GitHub Workflows)

1. Use the template laid out in [Sync your Paperpile to Notion][sync-repo]
2. Create a new repository secret named `NOTION_INTEGRATION_TOKEN` by
   following [this article][secrets].
3. Edit the `paperpile-notion.config.js` file you see in the repository root.

[sync-repo]: https://github.com/jmuchovej/sync-paperpile-to-notion

[secrets]: https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository

### Manually

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

# Commands

<!-- commands -->

* [`paperpile-notion articles:clean BIBTEXPATH`](#paperpile-notion-articlesclean-bibtexpath)
* [`paperpile-notion articles:sync BIBTEXPATH`](#paperpile-notion-articlessync-bibtexpath)
* [`paperpile-notion authors:clean BIBTEXPATH`](#paperpile-notion-authorsclean-bibtexpath)
* [`paperpile-notion authors:sync BIBTEXPATH`](#paperpile-notion-authorssync-bibtexpath)
* [`paperpile-notion help [COMMAND]`](#paperpile-notion-help-command)
* [`paperpile-notion plugins`](#paperpile-notion-plugins)
* [`paperpile-notion plugins:install PLUGIN...`](#paperpile-notion-pluginsinstall-plugin)
* [`paperpile-notion plugins:inspect PLUGIN...`](#paperpile-notion-pluginsinspect-plugin)
* [`paperpile-notion plugins:install PLUGIN...`](#paperpile-notion-pluginsinstall-plugin-1)
* [`paperpile-notion plugins:link PLUGIN`](#paperpile-notion-pluginslink-plugin)
* [`paperpile-notion plugins:uninstall PLUGIN...`](#paperpile-notion-pluginsuninstall-plugin)
* [`paperpile-notion plugins:uninstall PLUGIN...`](#paperpile-notion-pluginsuninstall-plugin-1)
* [`paperpile-notion plugins:uninstall PLUGIN...`](#paperpile-notion-pluginsuninstall-plugin-2)
* [`paperpile-notion plugins:update`](#paperpile-notion-pluginsupdate)

## `paperpile-notion articles:clean BIBTEXPATH`

Cleans your Articles Database. This command removes dangling articles without
authors.

```
USAGE
  $ paperpile-notion articles:clean [BIBTEXPATH] [-c <value>]

FLAGS
  -c, --config=<value>  Path to your config file

DESCRIPTION
  Cleans your Articles Database. This command removes dangling articles without authors.

EXAMPLES
  $ paperpile-notion articles:clean
```

_See
code: [dist/commands/articles/clean.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.0.1/dist/commands/articles/clean.ts)_

## `paperpile-notion articles:sync BIBTEXPATH`

Syncs your Articles Database with the current BibTeX file. Strictly creates or
updates articles based on the ID assigned by Paperpile.

```
USAGE
  $ paperpile-notion articles:sync [BIBTEXPATH] [-c <value>]

FLAGS
  -c, --config=<value>  Path to your config file

DESCRIPTION
  Syncs your Articles Database with the current BibTeX file. Strictly creates or updates articles based on the ID
  assigned by Paperpile.

EXAMPLES
  $ paperpile-notion articles:sync
```

_See
code: [dist/commands/articles/sync.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.0.1/dist/commands/articles/sync.ts)_

## `paperpile-notion authors:clean BIBTEXPATH`

Cleans your Authors Database. This command:

```
USAGE
  $ paperpile-notion authors:clean [BIBTEXPATH] [-c <value>]

FLAGS
  -c, --config=<value>  Path to your config file

DESCRIPTION
  Cleans your Authors Database. This command:

  1. Removes dangling authors with no articles.

  2. Attempts to clean up and merge authors and aliases.

EXAMPLES
  $ paperpile-notion authors:clean -f /path/to/references.bib

  $ paperpile-notion authors:clean -f /path/to/references.bib -c /path/to/paperpile-notion.config.js
```

_See
code: [dist/commands/authors/clean.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.0.1/dist/commands/authors/clean.ts)_

## `paperpile-notion authors:sync BIBTEXPATH`

describe the command here

```
USAGE
  $ paperpile-notion authors:sync [BIBTEXPATH] [-c <value>]

FLAGS
  -c, --config=<value>  Path to your config file

DESCRIPTION
  describe the command here

EXAMPLES
  $ paperpile-notion authors:sync
```

_See
code: [dist/commands/authors/sync.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.0.1/dist/commands/authors/sync.ts)_

## `paperpile-notion help [COMMAND]`

Display help for paperpile-notion.

```
USAGE
  $ paperpile-notion help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for paperpile-notion.
```

_See
code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.10/src/commands/help.ts)_

## `paperpile-notion plugins`

List installed plugins.

```
USAGE
  $ paperpile-notion plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ paperpile-notion plugins
```

_See
code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/index.ts)_

## `paperpile-notion plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ paperpile-notion plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ paperpile-notion plugins:add

EXAMPLES
  $ paperpile-notion plugins:install myplugin 

  $ paperpile-notion plugins:install https://github.com/someuser/someplugin

  $ paperpile-notion plugins:install someuser/someplugin
```

## `paperpile-notion plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ paperpile-notion plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ paperpile-notion plugins:inspect myplugin
```

_See
code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/inspect.ts)_

## `paperpile-notion plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ paperpile-notion plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ paperpile-notion plugins:add

EXAMPLES
  $ paperpile-notion plugins:install myplugin 

  $ paperpile-notion plugins:install https://github.com/someuser/someplugin

  $ paperpile-notion plugins:install someuser/someplugin
```

_See
code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/install.ts)_

## `paperpile-notion plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ paperpile-notion plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ paperpile-notion plugins:link myplugin
```

_See
code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/link.ts)_

## `paperpile-notion plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ paperpile-notion plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ paperpile-notion plugins:unlink
  $ paperpile-notion plugins:remove
```

## `paperpile-notion plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ paperpile-notion plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ paperpile-notion plugins:unlink
  $ paperpile-notion plugins:remove
```

_See
code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/uninstall.ts)_

## `paperpile-notion plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ paperpile-notion plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ paperpile-notion plugins:unlink
  $ paperpile-notion plugins:remove
```

## `paperpile-notion plugins:update`

Update installed plugins.

```
USAGE
  $ paperpile-notion plugins:update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See
code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/update.ts)_
<!-- commandsstop -->

* [`paperpile-notion articles:clean`](#paperpile-notion-articlesclean)
* [`paperpile-notion articles:sync`](#paperpile-notion-articlessync)
* [`paperpile-notion authors:clean`](#paperpile-notion-authorsclean)
* [`paperpile-notion authors:sync`](#paperpile-notion-authorssync)
* [`paperpile-notion help [COMMAND]`](#paperpile-notion-help-command)

## `paperpile-notion articles:clean`

describe the command here

```
USAGE
  $ paperpile-notion articles:clean -c <value> -f <value>

FLAGS
  -c, --config=<value>  (required) Path to your config file
  -f, --bibtex=<value>  (required) BibTeX file to update Notion from

DESCRIPTION
  describe the command here

EXAMPLES
  $ paperpile-notion articles:clean
```

_See
code: [dist/commands/articles/clean.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.0.0/dist/commands/articles/clean.ts)_

## `paperpile-notion articles:sync`

describe the command here

```
USAGE
  $ paperpile-notion articles:sync -c <value> -f <value>

FLAGS
  -c, --config=<value>  (required) Path to your config file
  -f, --bibtex=<value>  (required) BibTeX file to update Notion from

DESCRIPTION
  describe the command here

EXAMPLES
  $ paperpile-notion articles:sync
```

_See
code: [dist/commands/articles/sync.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.0.0/dist/commands/articles/sync.ts)_

## `paperpile-notion authors:clean`

describe the command here

```
USAGE
  $ paperpile-notion authors:clean -c <value> -f <value>

FLAGS
  -c, --config=<value>  (required) Path to your config file
  -f, --bibtex=<value>  (required) BibTeX file to update Notion from

DESCRIPTION
  describe the command here

EXAMPLES
  $ paperpile-notion authors:clean
```

_See
code: [dist/commands/authors/clean.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.0.0/dist/commands/authors/clean.ts)_

## `paperpile-notion authors:sync`

describe the command here

```
USAGE
  $ paperpile-notion authors:sync -c <value> -f <value>

FLAGS
  -c, --config=<value>  (required) Path to your config file
  -f, --bibtex=<value>  (required) BibTeX file to update Notion from

DESCRIPTION
  describe the command here

EXAMPLES
  $ paperpile-notion authors:sync
```

_See
code: [dist/commands/authors/sync.ts](https://github.com/jmuchovej/paperpile-notion/blob/v1.0.0/dist/commands/authors/sync.ts)_

## `paperpile-notion help [COMMAND]`

Display help for paperpile-notion.

```
USAGE
  $ paperpile-notion help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for paperpile-notion.
```

_See
code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.10/src/commands/help.ts)_

[forum.paperpile/notion]: https://forum.paperpile.com/t/suggestion-for-notion-hook/
