import * as _ from "lodash"
import {BibTeXForNotion} from "../../bibtex";

import {
  BibTeXToNotion,
  initArticleDB,
  prepareBibTeXForNotion
} from "../../models/article"
import {initAuthorDB} from "../../models/author"
import {createEntries, diff, updateEntries} from "../../notion"
import {ArticlesDB, AuthorsDB} from "../../config";
import BaseCommand from '../../base';

export default class ArticlesSync extends BaseCommand {
  static summary: string = `Syncs your Articles Database with the local BibTeX file.`

  static description: string = `Strictly creates or updates articles based on the ID assigned by Paperpile.`

  public async run(): Promise<void> {
    await this.parse(ArticlesSync)

    const articlesDB: ArticlesDB = <ArticlesDB>this.appConfig.databases.articles
    const authorsDB: AuthorsDB = <AuthorsDB>this.appConfig.databases.authors

    const {notion: articles} = await initArticleDB(articlesDB.databaseID, this.config.cacheDir)

    const {authorIndex} = await initAuthorDB(authorsDB.databaseID, this.config.cacheDir)

    const BibTeX = _.chain(this.BibTeX).reduce(
      (obj: BibTeXForNotion, bib: any, key: string) => {
        obj[key] = prepareBibTeXForNotion(bib, authorIndex, this.appConfig)
        return obj
      }, {}
    ).value()

    this.log(`Found ${_.keys(BibTeX).length} articles in BibTeX and ${_.keys(articles).length} on Notion...`)
    const {toCreate, toUpdate} = diff(_.keys(BibTeX), _.keys(articles))

    let notionCreates = _.map(toCreate, (ID: string) => {
      return BibTeX[ID]
    })
    while (notionCreates.length > 0) {
      notionCreates = await createEntries(this, notionCreates, BibTeXToNotion, articlesDB.databaseID)
    }

    let notionUpdates = _.map(toUpdate, (ID: string) => {
      const update = BibTeX[ID]
      const {pageID} = articles[ID as string][0].frontmatter
      return {pageID, ...update}
    })
    while (notionUpdates.length > 0) {
      notionUpdates = await updateEntries(this, notionUpdates, BibTeXToNotion)
    }
  }
}
