import {ArticlesDB} from "../../config"
import BaseCommand, {BaseArgTypes, BaseFlagTypes} from "../../base"
import {archiveEmptyFilters, ArticleCMS, createCMS} from "../../notion-cms"

export default class ArticlesClean extends BaseCommand {
  static summary: string = `Cleans up your Articles Database.`

  static description: string = `1. Removes dangling articles without authors.`

  static args: BaseArgTypes = BaseCommand.args
  static flags: BaseFlagTypes = BaseCommand.flags
  static examples: string[] = BaseCommand.examples

  public async run(): Promise<void> {
    await this.parse(ArticlesClean)

    const articlesCMS: ArticleCMS = createCMS<ArticlesDB>(
      this.config, this.appConfig, this.notion, "articles",
    )

    this.log(`Removing Articles with no Authors.`)
    const noAuthorsFilter = articlesCMS.filter.authors.is_empty(true)
    await archiveEmptyFilters(this, articlesCMS, noAuthorsFilter)
    this.log()
    this.log()

    // TODO implement deduplication
  }
}
