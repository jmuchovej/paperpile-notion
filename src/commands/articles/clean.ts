import {Command, Flags} from '@oclif/core'
import {removeEmptyRelationOrMultiSelects} from "../../notion";
import path from "node:path";
import {Config, ArticlesDB} from "../../config";

export default class ArticlesClean extends Command {
  static description = 'describe the command here'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
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
    const {args, flags} = await this.parse(ArticlesClean)

    const {default: obj} = await import(path.join(process.cwd(), flags.config))
    const config = new Config(obj)

    const articles = config.databases.articles as ArticlesDB

    console.log(`Removing Articles with no Authors.`)
    await archivePapersWithNoAuthors(articles, config.authorType)
    console.log()
    console.log()

    // TODO implement deduplication
  }
}

const archivePapersWithNoAuthors = async (articlesDB: ArticlesDB, propType: string) => {
  const {databaseID, authorRef} = articlesDB
  await removeEmptyRelationOrMultiSelects(databaseID, authorRef, propType);
}
