import {richTextAsPlainText} from "@jitl/notion-api"
import * as _ from "lodash"
import {AuthorsDB} from "../../config"
import BaseCommand, {BaseArgTypes, BaseFlagTypes} from "../../base"
import {
  archiveEmptyFilters,
  AuthorCMS,
  batchEntries,
  createCMS,
  Relation,
} from "../../notion-cms"

export default class AuthorsClean extends BaseCommand {
  static summary: string = `Cleans up your Authors Database.`

  static description: string = `
  1. Removes dangling authors with no articles.
  2. Attempts to clean up and merge authors and aliases.`

  static args: BaseArgTypes = BaseCommand.args
  static flags: BaseFlagTypes = BaseCommand.flags
  static examples: string[] = BaseCommand.examples

  public async run(): Promise<void> {
    await this.parse(AuthorsClean)

    if (!this.appConfig.hasAuthorDB) {
      this.error("You don't have an Authors database. Exiting.")
      this.exit(0) // analogous to this.exit(0), but keeps WebStorm from whining
    }

    const authorsCMS: AuthorCMS = createCMS<AuthorsDB>(
      this.config, this.appConfig, this.notion, "authors",
    )

    this.log(`Removing Authors with no Articles.`)
    const noArticlesFilter = authorsCMS.filter.articles.is_empty(true)
    await archiveEmptyFilters(this, authorsCMS, noArticlesFilter)
    this.log()
    this.log()

    this.log(`Attempting de-duplication based on "Aliases".`)
    await deduplicateAuthors(this, authorsCMS)
    this.log()
    this.log()
  }
}

const deduplicateAuthors = async (CLI: BaseCommand, cms: AuthorCMS): Promise<void> => {
  const Nicks: { [id: string]: string } = {}
  const Aliases: { [alias: string]: string } = {}

  const filter = cms.filter.aliases.is_not_empty(true)
  for await (const author of cms.query({filter})) {
    const {content: {id}, frontmatter: {name, aliases}} = author
    const nick: string = richTextAsPlainText(name).trim()
    const _aliases_: string[] = richTextAsPlainText(aliases)
      .split(";")
      .map((a: string) => a.trim())
      .filter((a: string) => a)

    Nicks[id] = nick

    for (const alias of _aliases_) {
      Aliases[alias] = id
    }
  }

  const articlesToCondense: { [name: string]: Relation["relation"] } = {}
  const toArchive: { page_id: string, archived: true }[] = []
  for await (const [alias, pageID] of _.entries(Aliases)) {
    const matches = cms.filter.name.equals(alias)
    for await (const page of cms.query({filter: matches})) {
      const {content: {id}, frontmatter: {name, articles}} = page
      if (id === pageID && articles.length > 0) {
        CLI.warn(`Skipping pageID = ${id}, ${Nicks[id]}`)
        continue
      }

      const Name = richTextAsPlainText(name)
      CLI.log(`Collapsing ${Name}'s articles into ${Nicks[pageID]}...`)
      const relations = _.get(articlesToCondense, pageID, [])
      articlesToCondense[pageID] = [...relations, ...articles]
      toArchive.push({page_id: id, archived: true})
    }
  }

  const toUpdate: { page_id: string, relation: Relation["relation"] }[] = _.map(
    articlesToCondense,
    (relation, page_id) => {
      return {page_id, relation}
    },
  )

  CLI.log("Archiving detected duplicates...")
  await batchEntries(CLI, toArchive, async (entry: typeof toArchive[0]) => {
    await cms.config.notion.pages.update(entry)
  })

  CLI.log("Migrating duplicates' articles to correct alias...")
  await batchEntries(CLI, toUpdate, async (entry: typeof toUpdate[0]) => {
    await cms.config.notion.pages.update(entry)
  })
}
