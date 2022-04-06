/* eslint-disable camelcase,new-cap */
import path = require("node:path");

require(`@citation-js/plugin-bibtex`)
const {Cite, plugins, inputs} = require(`@citation-js/core`)
import {CMS, CMSPage, NotionClient,} from "@jitl/notion-api"
import {Command, Flags,} from "@oclif/core"
import * as _ from "lodash"
import {performance} from "node:perf_hooks"
import {BibTeXForNotion} from "../../bibtex";

import {
  ArticleEntry,
  ArticlesDatabase,
  BibTeXToNotion,
  initArticleDB,
  prepareBibTeXForNotion
} from "../../models/article"
import {AuthorsDatabase, initAuthorDB} from "../../models/author"
import {readBibTeX} from "../../bibtex"
import {createEntries, Notion, updateEntries} from "../../notion"
import {APIErrorCode, APIResponseError} from "@notionhq/client";

const BATCH_SIZE = 10

export default class Sync extends Command {
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
    await this.parse(Sync)
    const {args, flags} = await this.parse(Sync)

    const {default: Config} = await import(path.join(process.cwd(), flags.config))
    const {articles, authors} = Config.databases

    const {
      notion: articlesOnNotion,
    } = await initArticleDB(articles.databaseID, this.config.cacheDir)

    const {
      index: authorIndex
    } = await initAuthorDB(authors.databaseID, this.config.cacheDir)

    let BibTeX = readBibTeX(flags.bibtex)
    BibTeX = _.reduce(BibTeX, (obj, bib: any, key: string) => {
      obj[key] = prepareBibTeXForNotion(bib, authorIndex, Config)
      return obj
    }, {} as BibTeXForNotion)

    const articleIDs = _.keys(articlesOnNotion)
    const bibtexIDs = _.keys(BibTeX)
    const updateIDs = _.intersection(articleIDs, bibtexIDs)
    const createIDs = _.difference(bibtexIDs, updateIDs)

    const createBibTeX = _.map(createIDs, (ID: string) => {
      return BibTeX[ID]
    })
    const updateBibTeX = _.map(updateIDs, (ID: string) => {
      const update = BibTeX[ID]
      const {pageID} = articlesOnNotion[ID as string][0].frontmatter
      return {pageID, ...update}
    })

    const bibTitleID = (bib: ArticleEntry) => !_.isNil(bib.title) && !_.isNil(bib["citation-label"])

    let notionCreates = _.filter(createBibTeX, bibTitleID)
    while (notionCreates.length > 0) {
      notionCreates = await createEntries(notionCreates, BibTeXToNotion, articles.databaseID)
    }

    let notionUpdates = _.filter(updateBibTeX, bibTitleID)
    while (notionUpdates.length > 0) {
      notionUpdates = await updateEntries(notionUpdates, BibTeXToNotion)
    }
  }
}
