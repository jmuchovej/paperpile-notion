import {Command, Flags} from "@oclif/core"
import {CMS, CMSPage, NotionClient, NotionClientDebugLogger} from "@jitl/notion-api"
import {readBibTeX} from "../../bibtex"
import * as _ from "lodash"
import {Author, createEntries, EntryList, EntryMap, Notion, updateEntries} from "../../notion"
import {AuthorToNotion, CMSConfig as AuthorCMSConfig, initAuthorDB} from "../../models/author"
import path from "node:path";
import articlesDb from "../../hooks/prerun/articles-db";

export default class AuthorsSync extends Command {
  static description = `describe the command here`

  static examples = [
    `<%= config.bin %> <%= command.id %>`,
  ]

  static flags = {
    config: Flags.string({char: `c`, description: `Path to your config file`, required: true}),
    bibtex: Flags.string({char: `f`, description: `BibTeX file to update Notion from`, required: true}),
  }

  static args = []

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(AuthorsSync)

    const {default: Config} = await import(path.join(process.cwd(), flags.config))
    const {authors} = Config.databases

    if (!authors.databaseID) {
      console.log("You don't have an Authors database. Exiting.")
      return  // analogous to this.exit(0), but keeps WebStorm from whining
    }

    const BibTeX = readBibTeX(flags.bibtex)
    const bibtexAuthors: string[] = _.chain(BibTeX).values().flatMap((o) => o.authors).uniq().value()

    const {index} = await initAuthorDB(authors.databaseID, this.config.cacheDir)

    const authorsToCreate: string[] = _.difference(bibtexAuthors, _.keys(index))
    const authorsToUpdate: string[] = _.intersection(bibtexAuthors, _.keys(index))

    let notionCreates = authorsToCreate.filter((author: string) => author)
    while (notionCreates.length > 0) {
      notionCreates = await createEntries(notionCreates, AuthorToNotion, authors.databaseID)
    }

    let notionUpdates = authorsToUpdate.filter((author: string) => author)
    while (notionUpdates.length > 0) {
      notionUpdates = await updateEntries(notionUpdates, AuthorToNotion)
    }
  }
}
