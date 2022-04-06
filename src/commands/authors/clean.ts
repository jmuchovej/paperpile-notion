import {Command, Flags} from "@oclif/core"
import {asyncIterableToArray, CMS, CMSPage, iteratePaginatedAPI} from "@jitl/notion-api"
import {CMSConfig as AuthorCMSConfig, initAuthorDB} from "../../models/author"
import {Author, batchEntries, EntryList, EntryMap, Notion, removeEmptyRelationOrMultiSelects} from "../../notion"
import * as _ from "lodash"
import {has} from "lodash"
import path from "node:path";
import {AuthorsDB} from "../../config";

export default class AuthorsClean extends Command {
  static description = "describe the command here"

  static examples = [
    "<%= config.bin %> <%= command.id %>",
  ]

  static flags = {
    config: Flags.string({char: `c`, description: `Path to your config file`, required: true}),
    bibtex: Flags.string({char: `f`, description: `BibTeX file to update Notion from`, required: true}),
  }

  static args = []

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(AuthorsClean)

    const {default: Config} = await import(path.join(process.cwd(), flags.config))

    if (!Config.databases.authors) {
      console.log("You don't have an Authors database. Exiting.")
      return  // analogous to this.exit(0), but keeps WebStorm from whining
    }

    await archiveAuthorsWithNoPapers(Config.databases.authors)

    // TODO implement deduplication
  }
}

const archiveAuthorsWithNoPapers = async (authorsDB: AuthorsDB) => {
  const {databaseID, articleRef} = authorsDB
  await removeEmptyRelationOrMultiSelects(databaseID, articleRef, "relation")
}
