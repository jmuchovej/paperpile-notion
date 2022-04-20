import {AuthorsDB} from "../../config"
import BaseCommand, {BaseArgTypes, BaseFlagTypes} from "../../base"
import {
  AuthorCMS,
  AuthorIteratorResult,
  AuthorPage,
  batchEntries,
  createCMS,
} from "../../notion-cms"
import {AuthorToNotion, prepareAuthorsForNotion} from "../../models/author"

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

    const toCreate = []

    for await (const author of this.BibTeXAuthors) {
      const filter = authorCMS.filter.or(
        authorCMS.filter.name.equals(author),
        authorCMS.filter.aliases.contains(author),
      )
      const query: AuthorIteratorResult = await authorCMS.query({filter}).next()
      const page: AuthorPage | undefined = query.value
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
    // const {toCreate, toUpdate} = diff(this.BibTeXAuthors, _.keys(authorIndex))

    // let notionCreates = toCreate.map((author: string) => {
    //   return prepareAuthorsForNotion(author, authorIndex, this.appConfig)
    // })
    // while (notionCreates.length > 0) {
    //   notionCreates = await createEntries(this, notionCreates, AuthorToNotion, authors.databaseID)
    // }

    // let notionUpdates = toUpdate.map((author: string) => {
    //   return prepareAuthorsForNotion(author, authorIndex, this.appConfig)
    // })
    // while (notionUpdates.length > 0) {
    //   notionUpdates = await updateEntries(this, notionUpdates, AuthorToNotion)
    // }
  }
}
