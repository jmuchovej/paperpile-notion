import {removeEmptyRelationOrMultiSelects} from "../../notion";
import {ArticlesDB} from "../../config";
import BaseCommand, {BaseArgTypes, BaseFlagTypes} from '../../base';

export default class ArticlesClean extends BaseCommand {
  static summary: string = `Cleans up your Articles Database.`

  static description: string = `1. Removes dangling articles without authors.`

  static args: BaseArgTypes = BaseCommand.args;
  static flags: BaseFlagTypes = BaseCommand.flags;
  static examples: string[] = BaseCommand.examples;

  public async run(): Promise<void> {
    await this.parse(ArticlesClean)

    const articles: ArticlesDB = <ArticlesDB>this.appConfig.databases.articles

    this.log(`Removing Articles with no Authors.`)
    await archivePapersWithNoAuthors(this, articles, this.appConfig.authorType)
    this.log()
    this.log()

    // TODO implement deduplication
  }
}

const archivePapersWithNoAuthors = async (CLI: BaseCommand, articlesDB: ArticlesDB, propType: string): Promise<void> => {
  const {databaseID, authorRef} = articlesDB
  await removeEmptyRelationOrMultiSelects(CLI, databaseID, authorRef, propType);
}
