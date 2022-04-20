import _ from "lodash"
import {NotionClient} from "@jitl/notion-api"

export type AuthorsDB = {
  databaseID: string,
  articleRef: string
  primaryKey: string,
}
export type ArticlesDB = {
  databaseID: string,
  authorRef: string
  primaryKey: string,
}

interface StrictConfigInterface {
  databases: {
    authors?: AuthorsDB
    articles: ArticlesDB,
  },
  status: {
    prefix?: string,
    colname?: string,
    states: {
      [key: string]: string,
    }
  },
  topics: {
    prefix?: string,
    colname?: string,
    topics: {
      [key: string]: string,
    }
  },
  fields: {
    prefix?: string,
    colname?: string,
    fields: {
      [key: string]: string,
    }
  },
  methods: {
    prefix?: string,
    colname?: string,
    methods: {
      [key: string]: string,
    }
  },
  folders: {
    prefix?: string,
    colname?: string,
    folder: {
      [key: string]: string,
    }
  },
  icons: {
    [bibtexKey: string]: string,
  }
}

export interface LooseConfigInterface {
  databases: {
    authors: StrictConfigInterface["databases"]["authors"] | string,
    articles: StrictConfigInterface["databases"]["articles"] | string,
  },
  status: StrictConfigInterface["status"],
  topics: StrictConfigInterface["topics"],
  fields: StrictConfigInterface["fields"],
  methods: StrictConfigInterface["methods"],
  folders: StrictConfigInterface["folders"],
  icons: StrictConfigInterface["icons"],
}

const _hexChars = _.split("1234567890abcdef", "")
const isValidPageID = (pageID: string) => {
  const is32char = pageID.replaceAll("-", "").length === 32
  const set = _.chain(pageID).split("").uniq().value()
  const valid = _.isEmpty(_.difference(set, _hexChars)) && is32char
  return valid ? pageID : undefined
}

const getDBbyName = async (notion: NotionClient, name: string): Promise<string> => {
  const {results} = await notion.search({
    query: name,
    page_size: 1,
    filter: {property: "object", value: "database"},
  })
  return results[0].id.replaceAll("-", "")
}

export const newConfig = async (config: LooseConfigInterface, notion: NotionClient): Promise<StrictConfig> => {
  let {
    status,
    topics,
    fields,
    methods,
    folders,
    icons,
  } = config

  status.prefix = status.prefix ?? "status:"
  status.colname = status.colname ?? "Status"

  topics.prefix = topics.prefix ?? "topic:"
  topics.colname = topics.colname ?? "Topics"

  fields.prefix = fields.prefix ?? "field:"
  fields.colname = fields.colname ?? "Fields"

  methods.prefix = methods.prefix ?? "method:"
  methods.colname = methods.colname ?? "Methods"

  folders.prefix = folders.prefix ?? "folder:"
  folders.colname = folders.colname ?? "Folders"

  let databases = await setupDBs(config, notion)

  return new StrictConfig({
    databases, status, topics, fields, methods, folders, icons,
  })
}

const setupDBs = async (
  {databases}: LooseConfigInterface,
  notion: NotionClient,
): Promise<StrictConfigInterface["databases"]> => {
  let {authors, articles} = databases

  if (_.isString(authors)) {
    let dbID: string = isValidPageID(authors) ?? await getDBbyName(notion, authors)
    databases.authors = <AuthorsDB>{
      databaseID: <string>dbID,
      articleRef: "Articles",
      primaryKey: "name",
    }
  } else if (!_.isNil(authors)) {
    databases.authors = undefined
  }

  if (_.isString(articles)) {
    let dbID: string = isValidPageID(articles) ?? await getDBbyName(notion, articles)
    databases.articles = <ArticlesDB>{
      databaseID: <string>dbID,
      authorRef: "Authors",
      primaryKey: "ID",
    }
  }

  if (_.isString(databases.articles) || _.isString(databases.authors)) {
    throw new Error("Failed to convert string to object. Please open a bug report on GitHub.")
  }

  // @ts-expect-error  TODO sort out why this causes an error...
  return databases
}

export class StrictConfig implements StrictConfigInterface {
  public readonly databases: StrictConfigInterface["databases"]
  public readonly status: StrictConfigInterface["status"]
  public readonly topics: StrictConfigInterface["topics"]
  public readonly fields: StrictConfigInterface["fields"]
  public readonly methods: StrictConfigInterface["methods"]
  public readonly folders: StrictConfigInterface["folders"]
  public readonly icons: StrictConfigInterface["icons"]

  constructor({
    databases,
    status,
    topics,
    fields,
    methods,
    folders,
    icons,
  }: StrictConfigInterface) {
    this.databases = databases
    this.status = status
    this.topics = topics
    this.fields = fields
    this.methods = methods
    this.folders = folders
    this.icons = icons
  }

  get hasAuthorDB(): boolean {
    return !_.isNil(this.databases.authors)
  }

  get authorType(): "relation" | "multi_select" {
    return this.hasAuthorDB ? "relation" : "multi_select"
  }
}
