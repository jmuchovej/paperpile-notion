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
import assert from "node:assert"
import {APIErrorCode, APIResponseError} from "@notionhq/client";
import {ArticleFrontmatter} from "./models/article";
import { AuthorFrontmatter } from "./models/author";

const token = process.env.NOTION_INTEGRATION_TOKEN
export const Notion = new NotionClient({auth: token, logger: NotionClientDebugLogger})

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
  private properties: any

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

  getDB = () => {
    return this.DB
  }

  getProperties = () => {
    assert(this.DB)
    this.properties = this.DB.properties
    return this.properties
  }

  downloadDB = async (pkey: string, limit = -1) => {
    let db: EntryList<Author | Article> = {}

    const startTime = performance.now()

    const iterable = iteratePaginatedAPI(Notion.databases.query, {database_id: this.id, page_size: 100})
    const asArray = await asyncIterableToArray(iterable)
    const totalTime = performance.now() - startTime

    console.log("Retrieved array", asArray.length)
    console.log(`Took: ${totalTime / 1000 / 60}min`)

    const entries = limit > 0 ? _.slice(asArray, 0, limit) : asArray

    for await (const entry of entries) {
      // TODO resolve typing error on CMSFrontmatter
      // @ts-ignore
      const frontmatter = this.cms.config.getFrontmatter(entry, this.cms, {})

      // @ts-ignore
      const ID = frontmatter.plain[pkey as string]

      const tmp = _.get(db, ID, [])
      db[ID] = [...tmp, {entry, frontmatter}]
    }

    return db
  }
}

export const BATCH_SIZE = 10;

export const batchEntries = async (entries: any[], toNotion: Function) => {
  const failedEntries: any[] = [];
  const chunks = _.chunk(entries, BATCH_SIZE)

  for await (const batch of chunks) {
    await Promise.all(_.map(batch, async entry => {
      try {
        await toNotion(entry)
      } catch (error: unknown) {
        if (APIResponseError.isAPIResponseError(error)) {
          switch (error.code) {
            case APIErrorCode.ConflictError:
              failedEntries.push(entry)
              break;
            case APIErrorCode.Unauthorized:
              break;
          }
        }
      }
    }))
  }

  return failedEntries;
}

export const createEntries = async (entries: any[], toNotion: Function, dbID: string) => {
  return await batchEntries(entries, async (entry: any) => {
    await Notion.pages.create({
      parent: {database_id: dbID},
      properties: toNotion(entry)
    })
  });
}

export const updateEntries = async (entries: any[], toNotion: Function) => {
  return await batchEntries(entries, async (entry: any) => {
    await Notion.pages.update({
      page_id: entry.pageID,
      properties: toNotion(entry)
    })
  });
}

export const removeEmptyRelationOrMultiSelects = async (database_id: string, fieldName: string, propType: string) => {
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
    asArray = await batchEntries(asArray, async (entry: any) => {
      await Notion.pages.update({
        page_id: entry.id,
        archived: true,
      })
    })
  }
}

export type MultiSelect = {
  multi_select: { name: string }[]
}
export type Relation = {
  relation: { id: string }[]
}
export type RichText = {
  rich_text: { type: "rich_text", text: { content: string } }[]
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
  return {title: [{type: "text", text: {content}}]}
}

export const makeRichText = (content: string): RichText | undefined => {
  if (!_.isNil(content) && !_.isEmpty(content)) {
    return
  }

  return {rich_text: [{type: "rich_text", text: {content}}]}
}

export const makeSelect = (option: string): Select | undefined => {
  if (!_.isNil(option) && !_.isEmpty(option)) {
    return
  }

  return {select: {name: option}}
}

export const makeMultiSelect = (options: string[]): MultiSelect | undefined => {
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
