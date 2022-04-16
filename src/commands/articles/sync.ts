import path = require("node:path");

import {Command, Flags,} from "@oclif/core"
import * as _ from "lodash"
import {BibTeXForNotion} from "../../bibtex";

import {
  BibTeXToNotion,
  initArticleDB,
  prepareBibTeXForNotion
} from "../../models/article"
import {initAuthorDB} from "../../models/author"
import {readBibTeX} from "../../bibtex"
import {createEntries, diff, updateEntries} from "../../notion"
import {ArticlesDB, AuthorsDB, Config} from "../../config";

export default class ArticlesSync extends Command {
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
    await this.parse(ArticlesSync)
    const {args, flags} = await this.parse(ArticlesSync)

    const {default: obj} = await import(path.join(process.cwd(), flags.config))
    const config = new Config(obj)

    const articlesDB = config.databases.articles as ArticlesDB
    const authorsDB = config.databases.authors as AuthorsDB

    const {notion: articles} = await initArticleDB(articlesDB.databaseID, this.config.cacheDir)

    const {authorIndex} = await initAuthorDB(authorsDB.databaseID, this.config.cacheDir)

    const BibTeX = _.chain(readBibTeX(flags.bibtex)).reduce(
      (obj: BibTeXForNotion, bib: any, key: string) => {
        obj[key] = prepareBibTeXForNotion(bib, authorIndex, config)
        return obj
      }, {}
    ).value()

    console.log(`Found ${_.keys(BibTeX).length} articles in BibTeX and ${_.keys(articles).length} on Notion...`)
    const {toCreate, toUpdate} = diff(_.keys(BibTeX), _.keys(articles))

    let notionCreates = _.map(toCreate, (ID: string) => {
      return BibTeX[ID]
    })

    while (notionCreates.length > 0) {
      notionCreates = await createEntries(notionCreates, BibTeXToNotion, articlesDB.databaseID)
    }

    let notionUpdates = _.map(toUpdate, (ID: string) => {
      const update = BibTeX[ID]
      const {pageID} = articles[ID as string][0].frontmatter
      return {pageID, ...update}
    })

    while (notionUpdates.length > 0) {
      notionUpdates = await updateEntries(notionUpdates, BibTeXToNotion)
    }
  }
}
