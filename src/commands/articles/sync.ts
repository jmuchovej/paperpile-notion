import {ArticlesDB, AuthorsDB} from "../../config"
import BaseCommand, {BaseArgTypes, BaseFlagTypes} from "../../base"
import {
  ArticleCMS,
  ArticlePage,
  AuthorCMS,
  batchEntries,
  createCMS,
  Relation,
} from "../../notion-cms"
import _ from "lodash"
import {BibTeXToNotion, NotionArticle} from "../../models/article"
import {richTextAsPlainText} from "@jitl/notion-api"
import {performance} from "perf_hooks"

export default class ArticlesSync extends BaseCommand {
  static summary: string = `Syncs your Articles Database with the local BibTeX file.`

  static description: string = `Strictly creates or updates articles based on the ID assigned by Paperpile.`

  static args: BaseArgTypes = BaseCommand.args
  static flags: BaseFlagTypes = BaseCommand.flags
  static examples: string[] = BaseCommand.examples

  public async run(): Promise<void> {
    await this.parse(ArticlesSync)

    const articleCMS: ArticleCMS = createCMS<ArticlesDB>(this.config, this.appConfig, this.notion, "articles")

    let authorCMS: AuthorCMS | undefined
    if (this.appConfig.hasAuthorDB) {
      authorCMS = createCMS<AuthorsDB>(this.config, this.appConfig, this.notion, "authors")
    }

    const Status = this.appConfig.status.states
    const parent = {
      database_id: this.appConfig.databases.articles.databaseID,
    }

    const toUpdate: { page_id: string, properties: NotionArticle }[] = []
    const toCreate: { parent: typeof parent, properties: NotionArticle }[] = []

    const existingPages = await fetchDB(this.BibTeX, articleCMS)

    let counter: number = 0
    let startTime: number = performance.now(),
      endTime: number = performance.now()
    for await (const [ID, article] of _.entries(this.BibTeX)) {
      article.status = _.isNil(article.status) ? undefined : Status[article.status]

      let {authors} = article
      if (authors && this.appConfig.hasAuthorDB && authorCMS) {
        authors = await fetchAuthors(authors, authorCMS)
      }
      article.authors = authors?.filter((a: any) => a)

      const properties: NotionArticle = BibTeXToNotion(this.appConfig, article)

      const page: ArticlePage | undefined = existingPages[ID]
      if (page) {
        toUpdate.push({page_id: (<ArticlePage>page).content.id, properties})
      } else {
        toCreate.push({parent, properties})
      }

      if (counter % 100 == 0) {
        endTime = performance.now()
        const time: string = `${(endTime - startTime) / 1000 / 60}min`
        console.log(`Cumulative time: ~${time}.`)
      }

      counter++
    }

    await batchEntries(this, toCreate, async (entry: typeof toCreate[0]) => {
      await articleCMS.config.notion.pages.create(entry)
    })

    await batchEntries(this, toUpdate, async (entry: typeof toUpdate[0]) => {
      await articleCMS.config.notion.pages.update(entry)
    })
  }
}

type FetchedArticleDB = {
  [name: string]: ArticlePage
}

const fetchDB = async (BibTeX: any, cms: ArticleCMS): Promise<FetchedArticleDB> => {
  const db: FetchedArticleDB = {}

  const chunks = _.chain(BibTeX).keys().chunk(100).value()
  let batchId = 1

  for await (const batch of chunks) {
    const filter = cms.filter.or(
      ...batch.map((id: string) => cms.filter.ID.equals(id)),
    )
    for await (const page of cms.query({filter})) {
      const ID = richTextAsPlainText(page.frontmatter.ID)
      db[ID] = page
    }
    batchId++
  }

  return db
}

const fetchAuthors = async (authors: string[], cms: AuthorCMS): Promise<Relation["relation"]> => {
  const filter = cms.filter.or(
    ...authors.map((author: string) => cms.filter.or(
      cms.filter.name.equals(author), cms.filter.aliases.contains(author),
    )),
  )

  const sortKeys: number[] = []
  const relations: Relation["relation"] = []
  for await (const author of cms.query({filter: filter})) {
    let {content: {id}, frontmatter: {name, aliases}} = author

    name = richTextAsPlainText(name)
    aliases = richTextAsPlainText(aliases)
    const index: number | undefined = [name, ...aliases.split(";")].map(
      (alias: string): number => authors.indexOf(alias.trim()),
    ).find((n: number): boolean => n > -1)

    if (index !== undefined) {
      relations.push({id})
      sortKeys.push(index)
    }
  }
  return sortKeys.map((index: number) => relations[index])
}
