/* eslint-disable camelcase,unicorn/no-useless-undefined */
import {
  asyncIterableToArray,
  CMS,
  CMSPage,
  iteratePaginatedAPI,
  NotionClient,
  NotionClientDebugLogger,
} from "@jitl/notion-api"
import * as _ from "lodash"
import {GetDatabaseResponse} from "@notionhq/client/build/src/api-endpoints"
import {APIErrorCode, APIResponseError} from "@notionhq/client";
import {performance} from "perf_hooks";
import BaseCommand from "./base";

// TODO do a better job at supporting legacy ENV vars and a --token flag
const token = process.env.NOTION_INTEGRATION_TOKEN
export const Notion = new NotionClient({
  auth: token,
  logger: NotionClientDebugLogger
})

export interface EntryList<T> {
  [key: string]: {
    frontmatter: any,
    entry: any
  }[]
}

export interface EntryMap<T> {
  [key: string]: {
    frontmatter: any
    entry: any
  }
}

export type Author = CMSPage<any>;
export type Article = CMSPage<any>

export class Database<T> {
  private readonly id: string
  private readonly cms: CMS<T>
  private DB: GetDatabaseResponse | undefined

  constructor(CMSConfig: any, id: string, cacheDir: string) {
    this.id = id
    // eslint-disable-next-line new-cap
    this.cms = new CMS<T>(CMSConfig(cacheDir, this.id))
    this.DB = undefined
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  setupDB = async () => {
    this.DB = await Notion.databases.retrieve({
      // eslint-disable-next-line camelcase
      database_id: this.id,
    })
  }

  downloadDB = async (pkey: string, limit = -1) => {
    let db: EntryList<Author | Article> = {}

    const startTime = performance.now()

    const iterable = iteratePaginatedAPI(Notion.databases.query, {
      database_id: this.id,
      page_size: 100
    })
    const asArray = await asyncIterableToArray(iterable)
    const totalTime = performance.now() - startTime

    console.log("Retrieved array", asArray.length)
    console.log(`Took: ${totalTime / 1000 / 60}min`)

    const entries = limit > 0 ? _.slice(asArray, 0, limit) : asArray

    for (const entry of entries) {
      // TODO resolve typing error on CMSFrontmatter
      // @ts-ignore
      const frontmatter = this.cms.config.getFrontmatter(entry, this.cms, {})

      // @ts-ignore
      const ID = frontmatter.plain[pkey as string].trim()
      if (ID === "") continue

      const tmp = _.get(db, ID, [])
      db[ID] = [...tmp, {entry, frontmatter}]
    }

    return db
  }
}

export const BATCH_SIZE = 10;

export const batchEntries = async (CLI: BaseCommand, entries: any[], toNotion: Function) => {
  const failedEntries: any[] = [];
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
              break;
            case APIErrorCode.Unauthorized:
              break;
            case APIErrorCode.ValidationError:
              console.error("Validation Failed:")
              console.log(error.body)
              break;
            case APIErrorCode.RateLimited:
              CLI.error("We've been rate limited. Please run again in ~20 minutes.")
              break;
            default:
              console.log(error)
              break
          }
        }
      }
    }))
  }

  return failedEntries;
}

export const createEntries = async (CLI: BaseCommand, entries: any[], toNotion: Function, dbID: string) => {
  return await batchEntries(CLI, entries, async (entry: any) => {
    const response = await Notion.pages.create({
      parent: {database_id: dbID},
      properties: toNotion(entry)
    })
  });
}

export const updateEntries = async (CLI: BaseCommand, entries: any[], toNotion: Function) => {
  return await batchEntries(CLI, entries, async (entry: any) => {
    const response = await Notion.pages.update({
      page_id: entry.pageID,
      properties: toNotion(entry)
    })
  });
}

export const removeEmptyRelationOrMultiSelects = async (CLI: BaseCommand, database_id: string, fieldName: string, propType: string) => {
  const iterable = iteratePaginatedAPI(Notion.databases.query, {
    database_id,
    // @ts-ignore
    filter: {
      property: fieldName,
      [propType]: {
        is_empty: true,
      }
    },
    page_size: 100,
  })
  let asArray = await asyncIterableToArray(iterable)

  while (asArray.length > 0) {
    asArray = await batchEntries(CLI, asArray, async (entry: any) => {
      await Notion.pages.update({
        page_id: entry.id,
        archived: true,
      })
    })
  }
}

export const diff = (local: any[], notion: any[]) => {
  const toCreate = _.difference(local, notion).filter(a => a)
  console.log(`Creating... ${toCreate.length}`)
  const toUpdate = _.intersection(local, notion).filter(a => a)
  console.log(`Updating... ${toUpdate.length}`)
  return {toCreate, toUpdate}
}

export type MultiSelect = {
  multi_select: { name: string }[]
}
export type Relation = {
  relation: { id: string }[]
}
export type RichText = {
  rich_text: { type: "text", text: { content: string } }[]
}
export type Title = {
  title: { type: "text", text: { content: string } }[],
}
export type Select = {
  select: { name: string }
}
export type URL = {
  url: string
}

export const makeTitle = (content: string): Title => {
  return {title: [{type: "text", text: {content: content.trim()}}]}
}

export const makeRichText = (content: string): RichText | undefined => {
  if (_.isNil(content) || _.isEmpty(content)) {
    return
  }

  return {rich_text: [{type: "text", text: {content: content.trim()}}]}
}

export const makeSelect = (option: string): Select | undefined => {
  if (_.isNil(option) || _.isEmpty(option)) {
    return
  }

  return {select: {name: option}}
}

export const makeMultiSelect = (options: string[]): MultiSelect | undefined => {
  if (_.isNil(options) || _.isEmpty(options) || !_.isString(options[0])) {
    return
  }
  options = options.filter(a => a)

  if (_.isNil(options) || _.isEmpty(options) || !_.isString(options[0])) {
    return
  }

  return {
    multi_select: options.map((name: string) => {
      return {name}
    })
  }
}

export const makeRelation = (relations: any[]): Relation | undefined => {
  if (_.isNil(relations) || _.isEmpty(relations) || !_.isObjectLike(relations[0])) {
    return
  }
  return {
    relation: relations.map(({id}) => {
      return {id}
    })
  }
}

export const makeURL = (url: string): URL | undefined => {
  if (_.isNil(url) || _.isEmpty(url)) {
    return
  }

  return {url}
}
