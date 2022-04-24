import {
  CMS,
  CMSPageOf,
  inferDatabaseSchema,
  NotionClient,
  Property,
  richTextAsPlainText,
} from "@jitl/notion-api"
import {Config as CLIConfig} from "@oclif/core"
import path from "node:path"
import {ArticlesDB, AuthorsDB, StrictConfig as PNConfig} from "./config"
import _ from "lodash"
import BaseCommand from "./base"
import {APIErrorCode, APIResponseError} from "@notionhq/client"

export type Title = Property<"title">
export type Relation = Property<"relation">
export type RichText = Property<"rich_text">
export type Select = Omit<Property<"select">, "type">
export type MultiSelect = Property<"multi_select">
export type URL = Property<"url">

export const makeTitle = (content: string): Title => {
  return {
    type: "title",
    title: [{
      type: "text",
      // @ts-ignore
      text: {content: content.trim()},
    }],
  }
}

export const makeRichText = (content: string): RichText | undefined => {
  if (_.isNil(content) || _.isEmpty(content)) {
    return
  }

  return {
    type: "rich_text",
    rich_text: [{
      type: "text",
      // @ts-ignore
      text: {content: content.trim()},
    }],
  }
}

export const makeSelect = (option: string): Select | undefined => {
  if (_.isNil(option) || _.isEmpty(option)) {
    return
  }

  // @ts-ignore
  return {select: {name: option}}
}

export const makeMultiSelect = (options: string[]): MultiSelect | undefined => {
  if (_.isNil(options)) return
  options = options.filter(a => a)

  if (_.isEmpty(options) || !_.isString(options[0])) return

  const multi_select = options.map((name) => {
    return {name: <string>name}
  })
  // @ts-ignore
  return {type: "multi_select", multi_select}
}

export const makeRelation = (relations: any[]): Relation | undefined => {
  if (_.isNil(relations) || _.isEmpty(relations) || !_.isObjectLike(relations[0])) {
    return
  }

  const relation = relations.map(({id}) => {
    return {id: <string>id}
  })

  // @ts-ignore
  return {type: "relation", relation}
}

export const makeURL = (url: string): URL | undefined => {
  if (_.isNil(url) || _.isEmpty(url)) {
    return
  }

  // @ts-ignore
  return {type: "url", url}
}

type DBTypes = ArticlesDB | AuthorsDB
type DBNames = "articles" | "authors"
type DBStrings<T> =
  T extends ArticlesDB ? "articles" :
    T extends AuthorsDB ? "authors" :
      never;

type DBSchemas<T> =
  T extends ArticlesDB ? ArticleSchema :
    T extends AuthorsDB ? AuthorSchema :
      never;

export type AuthorCMS = CMS<any, AuthorSchema>
export type ArticleCMS = CMS<any, ArticleSchema>

export type ArticleSchema = {
  title: { type: "title", name: string },
  ID: { type: "rich_text", name: string }
  authors: { type: "relation" | "multi_select", name: string },
  status: { type: "select", name: string },
  topics: { type: "multi_select", name: string },
  fields: { type: "multi_select", name: string },
  methods: { type: "multi_select", name: string },
  folders: { type: "multi_select", name: string },
  venue: { type: "select", name: string },
  url: { type: "url", name: string },
}

function schemaArticlesDB(appConfig: PNConfig): ArticleSchema {
  return {
    title: {type: "title", name: "Title"},
    ID: {type: "rich_text", name: "ID"},
    authors: {
      type: appConfig.authorType,
      name: appConfig.databases.articles.authorRef,
    },
    status: {type: "select", name: appConfig.status.colname},
    topics: {type: "multi_select", name: appConfig.topics.colname},
    fields: {type: "multi_select", name: appConfig.fields.colname},
    methods: {type: "multi_select", name: appConfig.methods.colname},
    folders: {type: "multi_select", name: appConfig.folders.colname},
    venue: {type: "select", name: "Venue"},
    url: {type: "url", name: "URL"},
  }
}

export type AuthorSchema = {
  name: { type: "title", name: string },
  articles: { type: "relation", name: string },
  aliases: { type: "rich_text", name: string },
}

function schemaAuthorsDB(appConfig: PNConfig): AuthorSchema {
  return {
    name: {type: "title", name: "Name"},
    articles: {
      type: "relation",
      name: appConfig.databases.authors?.articleRef,
    },
    aliases: {type: "rich_text", name: "Aliases"},
  }
}

function getSchema<T>(db: string, appConfig: PNConfig): DBSchemas<T> {
  const schemas = {
    "articles": schemaArticlesDB,
    "authors": schemaAuthorsDB,
  }
  return inferDatabaseSchema(schemas[db](appConfig))
}

export type AuthorPage = CMSPageOf<AuthorCMS>
export type AuthorIteratorResult =
  IteratorYieldResult<AuthorPage>
  | IteratorReturnResult<AuthorPage>

export type ArticlePage = CMSPageOf<ArticleCMS>
export type ArticleIteratorResult =
  IteratorYieldResult<ArticlePage>
  | IteratorReturnResult<ArticlePage>

export function createCMS<T extends DBTypes>(
  cliConfig: CLIConfig,
  appConfig: PNConfig,
  notion: NotionClient,
  db: DBStrings<T>,
): CMS<any, DBSchemas<T>> {
  let {databaseID, primaryKey} = <T>appConfig.databases[db]

  const schema: DBSchemas<T> = getSchema<T>(db, appConfig)

  const getFrontmatter = ({properties}: any) => properties

  return new CMS<any, DBSchemas<T>>({
    database_id: databaseID, notion, schema,
    getFrontmatter,
    title: undefined,
    visible: true,
    // slug: undefined, /** NOTE setting this causes some weird errors... */
    // @ts-ignore
    slug: primaryKey,
    cache: {
      directory: path.join(cliConfig.cacheDir),
    },
    assets: {
      directory: path.join(cliConfig.cacheDir, "assets"),
      downloadExternalAssets: false,
    },
  })
}

export const buildCache = async (
  cms: ArticleCMS | AuthorCMS,
): Promise<void> => {
  for await (const page of cms.query()) {
  }
}

export const archiveEmptyFilters = async (CLI: BaseCommand, cms: ArticleCMS | AuthorCMS, filter) => {
  const toArchive = []
  for await (const page of cms.query({filter})) {
    const {content: {id, children}, frontmatter: {title}} = page
    if (children.length == 0) {
      toArchive.push({page_id: id, archived: true})
      continue
    }
    const Title = richTextAsPlainText(title)
    CLI.warn(`${Title} should be archived, but has content... Please clear it to enable archiving.`)
  }

  await batchEntries(CLI, toArchive, async (entry: typeof toArchive[0]) => {
    await cms.config.notion.pages.update(entry)
  })
}

export const BATCH_SIZE = 10

export const batchEntries = async (CLI: BaseCommand, entries: any[], toNotion: Function) => {
  const failedEntries: any[] = []
  const chunks = _.chunk(entries, BATCH_SIZE)

  for await (const batch of chunks) {
    await Promise.all(_.map(batch, async entry => {
      try {
        return await toNotion(entry)
      } catch (error: unknown) {
        if (APIResponseError.isAPIResponseError(error)) {
          switch (error.code) {
          case APIErrorCode.ConflictError:
            failedEntries.push(entry)
            break
          case APIErrorCode.Unauthorized:
            break
          case APIErrorCode.ValidationError:
            console.error("Validation Failed:")
            console.log(error.body)
            break
          case APIErrorCode.RateLimited:
            CLI.error("We've been rate limited. Please run again in ~20 minutes.")
            break
          default:
            console.log(error)
            break
          }
        }
      }
    }))
  }

  return failedEntries
}
