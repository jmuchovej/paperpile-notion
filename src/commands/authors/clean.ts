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
import {AuthorsDB} from "../../config";
import BaseCommand from '../../base';

export default class AuthorsClean extends BaseCommand {
  static summary: string = `Cleans up your Authors Database.`

  static description: string = `
  1. Removes dangling authors with no articles.
  2. Attempts to clean up and merge authors and aliases.`

  public async run(): Promise<void> {
    await this.parse(AuthorsClean)

    if (!this.appConfig.databases.authors) {
      this.error("You don't have an Authors database. Exiting.")
      this.exit(0) // analogous to this.exit(0), but keeps WebStorm from whining
    }

    const authors: AuthorsDB = <AuthorsDB>this.appConfig.databases.authors

    this.log(`Removing Authors with no Articles.`)
    await archiveAuthorsWithNoArticles(this, authors)
    this.log()
    this.log()

    this.log(`Attempting de-duplication based on "Aliases".`)
    await deduplicateAuthors(this, authors)
    this.log()
    this.log()
  }
}

const archiveAuthorsWithNoArticles = async (CLI: BaseCommand, authorsDB: AuthorsDB): Promise<void> => {
  const {databaseID, articleRef} = authorsDB
  await removeEmptyRelationOrMultiSelects(CLI, databaseID, articleRef, "relation")
}

const deduplicateAuthors = async (CLI: BaseCommand, authorsDB: AuthorsDB) => {
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
      CLI,
      nonEmptyAliasArray,
      async (entry: any): Promise<void> => {
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

  CLI.log()
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
  CLI.log()

  CLI.log("Archiving detected duplicates...")
  let notionArchive = _.map(toArchive, (id) => {
    return {id}
  })
  while (notionArchive.length > 0) {
    notionArchive = await batchEntries(CLI, notionArchive, async (entry: any) => {
      await Notion.pages.update({
        page_id: entry.id,
        archived: true,
      })
    })
  }

  CLI.log("Migrating duplicates' articles to correct alias...")
  let notionUpdate = _.map(toUpdate, (id) => {
    return {id, articles: articles[id]}
  })
  while (notionUpdate.length > 0) {
    notionUpdate = await batchEntries(CLI, notionUpdate, async (entry: any) => {
      await Notion.pages.update({
        page_id: entry.id,
        properties: {
          [articleRef]: makeRelation(entry.articles) as Relation
        },
      })
    })
  }

}
