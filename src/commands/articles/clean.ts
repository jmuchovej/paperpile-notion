import {Command, Flags} from '@oclif/core'
import {readBibTeX} from "../../bibtex";
import {asyncIterableToArray, iteratePaginatedAPI} from "@jitl/notion-api";
import {BATCH_SIZE, Notion, removeEmptyRelationOrMultiSelects} from "../../notion";
import path from "node:path";
import _ from "lodash";
import {ArticlesDB} from "../../config";

export default class ArticlesClean extends Command {
  static description = 'describe the command here'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static flags = {
    config: Flags.string({char: `c`, description: `Path to your config file`, required: true}),
    bibtex: Flags.string({char: `f`, description: `BibTeX file to update Notion from`, required: true}),
  }

  static args = []

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(ArticlesClean)

    const {default: Config} = await import(path.join(process.cwd(), flags.config))

    let propType;
    propType = Config.hasAuthorsDB ? "relation" : "multi_select"
    await archivePapersWithNoAuthors(Config.databases.articles, propType)

    // TODO implement deduplication
  }
}

const archivePapersWithNoAuthors = async (articlesDB: ArticlesDB, propType: string) => {
  const {databaseID, authorRef} = articlesDB
  await removeEmptyRelationOrMultiSelects(databaseID, authorRef, propType);
}
