import _ from "lodash"
import {createEntries, diff, updateEntries} from "../../notion"
import {
  AuthorToNotion,
  initAuthorDB,
  prepareAuthorsForNotion
} from "../../models/author"
import {AuthorsDB} from "../../config"
import BaseCommand from '../../base';

export default class AuthorsSync extends BaseCommand {
  static summary: string = `Syncs your Authors Database with the local BibTeX file.`
  static description: string = `Authors will be created if not present (or if they don't match a manually entered alias). Otherwise, Authors will have their name stripped of whitespace and articles consolidation based on matching Aliases.`

  public async run(): Promise<void> {
    await this.parse(AuthorsSync)

    if (!this.appConfig.databases.authors) {
      this.error("You don't have an Authors database. Exiting.")
      this.exit(0) // analogous to this.exit(0), but keeps WebStorm from whining
    }
    const authors: AuthorsDB = <AuthorsDB>this.appConfig.databases.authors

    const {authorIndex} = await initAuthorDB(authors.databaseID, this.config.cacheDir)

    const {toCreate, toUpdate} = diff(this.BibTeXAuthors, _.keys(authorIndex))

    let notionCreates = toCreate.map((author: string) => {
      return prepareAuthorsForNotion(author, authorIndex, this.appConfig)
    })
    while (notionCreates.length > 0) {
      notionCreates = await createEntries(this, notionCreates, AuthorToNotion, authors.databaseID)
    }

    let notionUpdates = toUpdate.map((author: string) => {
      return prepareAuthorsForNotion(author, authorIndex, this.appConfig)
    })
    while (notionUpdates.length > 0) {
      notionUpdates = await updateEntries(this, notionUpdates, AuthorToNotion)
    }
  }
}
