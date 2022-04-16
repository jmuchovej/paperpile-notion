import {Command, Flags} from "@oclif/core"
import {readBibTeX} from "../../bibtex"
import _ from "lodash"
import {createEntries, diff, updateEntries} from "../../notion"
import {
  AuthorToNotion,
  initAuthorDB,
  prepareAuthorsForNotion
} from "../../models/author"
import path from "node:path";
import {AuthorsDB, Config} from "../../config"

export default class AuthorsSync extends Command {
  static description = `describe the command here`

  static examples = [
    `<%= config.bin %> <%= command.id %>`,
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
    const {args, flags} = await this.parse(AuthorsSync)

    const {default: obj} = await import(path.join(process.cwd(), flags.config))
    const config = new Config(obj)

    if (!config.databases.authors) {
      console.log("You don't have an Authors database. Exiting.")
      return  // analogous to this.exit(0), but keeps WebStorm from whining
    }
    const authors = config.databases.authors as AuthorsDB

    const BibTeX = readBibTeX(flags.bibtex)
    const bibtexAuthors: string[] = _.chain(BibTeX).values().flatMap((o) => o.authors).uniq().filter().value()

    const {authorIndex} = await initAuthorDB(authors.databaseID, this.config.cacheDir)

    const {toCreate, toUpdate} = diff(bibtexAuthors, _.keys(authorIndex))

    let notionCreates = toCreate.map((author: string) => {
      return prepareAuthorsForNotion(author, authorIndex, config)
    })
    while (notionCreates.length > 0) {
      notionCreates = await createEntries(notionCreates, AuthorToNotion, authors.databaseID)
    }

    let notionUpdates = toUpdate.map((author: string) => {
      return prepareAuthorsForNotion(author, authorIndex, config)
    })
    while (notionUpdates.length > 0) {
      notionUpdates = await updateEntries(notionUpdates, AuthorToNotion)
    }
  }
}
