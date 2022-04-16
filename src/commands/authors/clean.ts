import {Command, Flags} from "@oclif/core"
import {
  asyncIterableToArray,
  getPageTitle, getPropertyValue,
  iteratePaginatedAPI, richTextAsPlainText
} from "@jitl/notion-api"
import {
  batchEntries,
  makeRelation,
  Notion, Relation,
  removeEmptyRelationOrMultiSelects
} from "../../notion"
import * as _ from "lodash"
import path from "node:path";
import {AuthorsDB, Config} from "../../config";

export default class AuthorsClean extends Command {
  static description = "describe the command here"

  static examples = [
    "<%= config.bin %> <%= command.id %>",
  ]

  static flags = {
    config: Flags.string({
      char: `c`,
      description: `Path to your config file`,
      required: true
    }),
    bibtex: Flags.string({
      char: `f`,
      description: `BibTeX file to update Notion from`,
      required: true
    }),
  }

  static args = []

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(AuthorsClean)

    const {default: obj} = await import(path.join(process.cwd(), flags.config))
    const config = new Config(obj)

    if (!config.databases.authors) {
      console.error("You don't have an Authors database. Exiting.")
      return  // analogous to this.exit(0), but keeps WebStorm from whining
    }

    const authors = config.databases.authors as AuthorsDB

    console.log(`Removing Authors with no Articles.`)
    await archiveAuthorsWithNoArticles(authors)
    console.log()
    console.log()

    console.log(`Attempting de-duplication based on "Aliases".`)
    await deduplicateAuthors(authors)
    console.log()
    console.log()
  }
}

const archiveAuthorsWithNoArticles = async (authorsDB: AuthorsDB) => {
  const {databaseID, articleRef} = authorsDB
  await removeEmptyRelationOrMultiSelects(databaseID, articleRef, "relation")
}

const deduplicateAuthors = async (authorsDB: AuthorsDB) => {
  const {databaseID, articleRef} = authorsDB

  const nonEmptyAliasIterable = iteratePaginatedAPI(
    Notion.databases.query,
    {
      database_id: databaseID,
      // @ts-ignore
      filter: {
        property: "Aliases",
        rich_text: {
          is_not_empty: true,
        }
      },
      page_size: 100,
    })
  let nonEmptyAliasArray = await asyncIterableToArray(nonEmptyAliasIterable)

  const toUpdate: string[] = []
  const toArchive: string[] = []

  const authorsWithAliases: {
    [name: string]: string
  } = {}
  const pages: {
    [pageID: string]: any,
  } = {}
  const articles: {
    [pageID: string]: { id: string }[]
  } = {}

  while (nonEmptyAliasArray.length > 0) {
    nonEmptyAliasArray = await batchEntries(
      nonEmptyAliasArray,
      async (entry: any) => {
        pages[entry.id] = entry
        toUpdate.push(entry.id)

        const aliasesProperty = richTextAsPlainText(getPropertyValue(entry, {
          name: "Aliases",
          type: "rich_text"
        }))
        const nameProperty = richTextAsPlainText(getPageTitle(entry))

        const aliases = [
          nameProperty,
          ...aliasesProperty.split(";")
        ].map(a => a.trim()).filter(a => a)
        for (const alias of aliases) {
          authorsWithAliases[alias] = entry.id
        }

        const otherArticles = getPropertyValue(entry, {
          name: articleRef,
          type: "relation"
        }) ?? []
        articles[entry.id] = [...(articles[entry.id] ?? []), ...otherArticles]

      })
  }

  const queryForAuthor = async (name: string) => {
    const iterable = iteratePaginatedAPI(
      Notion.databases.query,
      {
        database_id: databaseID,
        page_size: 100,
        filter: {property: "Name", title: {equals: name}}
      }
    )
    return await asyncIterableToArray(iterable)
  }

  console.log()
  for await (const [name, pageID] of _.entries(authorsWithAliases)) {
    const result = await queryForAuthor(name)
    if (result.length == 0 || result[0].id === pageID)
      continue

    const notThisID = _.filter(
      result, (entry) => entry.id != pageID
    ).filter(a => a)

    for (const author of notThisID) {
      toArchive.push(author.id)
      // @ts-ignore
      const otherArticles = getPropertyValue(author, {
        name: articleRef,
        type: "relation"
      }) ?? []
      articles[pageID] = [...articles[pageID], ...otherArticles]
    }
    console.log(`The alias of ${name} (${pageID}) will now have ${articles[pageID].length} articles.`)
  }
  console.log()

  console.log("Archiving detected duplicates...")
  let notionArchive = _.map(toArchive, (id) => {
    return {id}
  })
  while (notionArchive.length > 0) {
    notionArchive = await batchEntries(notionArchive, async (entry: any) => {
      await Notion.pages.update({
        page_id: entry.id,
        archived: true,
      })
    })
  }

  console.log("Migrating duplicates' articles to correct alias...")
  let notionUpdate = _.map(toUpdate, (id) => {
    return {id, articles: articles[id]}
  })
  while (notionUpdate.length > 0) {
    notionUpdate = await batchEntries(notionUpdate, async (entry: any) => {
      await Notion.pages.update({
        page_id: entry.id,
        properties: {
          [articleRef]: makeRelation(entry.articles) as Relation
        },
      })
    })
  }

}
