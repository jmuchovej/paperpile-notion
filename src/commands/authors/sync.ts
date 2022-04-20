import {AuthorsDB} from "../../config"
import BaseCommand, {BaseArgTypes, BaseFlagTypes} from "../../base"
import {AuthorCMS, AuthorPage, batchEntries, createCMS} from "../../notion-cms"
import {
  AuthorToNotion,
  NotionAuthor,
  prepareAuthorsForNotion,
} from "../../models/author"
import {richTextAsPlainText} from "@jitl/notion-api"
import _ from "lodash"

export default class AuthorsSync extends BaseCommand {
  static summary: string = `Syncs your Authors Database with the local BibTeX file.`
  static description: string = `Authors will be created if not present (or if they don't match a manually entered alias). Otherwise, Authors will have their name stripped of whitespace and articles consolidation based on matching Aliases.`

  static args: BaseArgTypes = BaseCommand.args
  static flags: BaseFlagTypes = BaseCommand.flags
  static examples: string[] = BaseCommand.examples

  public async run(): Promise<void> {
    await this.parse(AuthorsSync)

    if (!this.appConfig.hasAuthorDB) {
      this.error("You don't have an Authors database. Exiting.")
      this.exit(0) // analogous to this.exit(0), but keeps WebStorm from whining
    }

    const authorCMS: AuthorCMS = createCMS<AuthorsDB>(this.config, this.appConfig, this.notion, "authors")

    const parent = {
      database_id: this.appConfig.databases.authors.databaseID,
    }

    const toCreate: { parent: typeof parent, properties: NotionAuthor }[] = []

    const existingPages: FetchedAuthorDB = await fetchDB(this.BibTeXAuthors, authorCMS)

    for await (const author of this.BibTeXAuthors) {
      const page: AuthorPage = existingPages[author]
      if (!page) {
        toCreate.push({
          parent,
          properties: AuthorToNotion(prepareAuthorsForNotion(author)),
        })
      }
    }

    await batchEntries(this, toCreate, async (entry: typeof toCreate[0]) => {
      await authorCMS.config.notion.pages.create(entry)
    })
  }
}

type FetchedAuthorDB = {
  [name: string]: AuthorPage
}

const fetchDB = async (authors: string[], cms: AuthorCMS) => {
  const db: FetchedAuthorDB = {}

  const chunks: string[][] = _.chunk(authors, 50)

  for await (const batch of chunks) {
    const filter = cms.filter.or(
      ...batch.map((name: string) => cms.filter.or(
        cms.filter.name.equals(name), cms.filter.aliases.contains(name),
      )),
    )
    for await (const page of cms.query({filter})) {
      let {frontmatter: {name, aliases}} = page
      name = richTextAsPlainText(name)
      aliases = richTextAsPlainText(aliases)
        .split(";").map((a: string) => a.trim()).filter((a: string) => a)
      for (const alias of [name, ...aliases]) {
        db[alias] = page
      }
    }
  }

  return db
}
