import _ from "lodash";
import {NotionClient} from "@jitl/notion-api";

export type AuthorsDB = {
  databaseID: string,
  articleRef: string
}
export type ArticlesDB = {
  databaseID: string,
  authorRef: string
}

export interface ConfigInterface {
  databases: {
    authors: AuthorsDB | string | undefined,
    articles: ArticlesDB | string,
  },
  status: {
    prefix: string,
    colname: string,
    states: {
      [key: string]: string,
    }
  },
  topics: {
    prefix: string,
    colname: string,
    topics: {
      [key: string]: string,
    }
  },
  fields: {
    prefix: string,
    colname: string,
    fields: {
      [key: string]: string,
    }
  },
  methods: {
    prefix: string,
    colname: string,
    methods: {
      [key: string]: string,
    }
  },
  icons: {
    [bibtexKey: string]: string,
  }
}

const _hexChars = _.split("1234567890abcdef", "")
const isValidPageID = (pageID: string) => {
  const is32char = pageID.replaceAll("-", "").length === 32
  const set = _.chain(pageID).split("").uniq().value()
  return _.isEmpty(_.difference(set, _hexChars)) && is32char
}

const getDBbyName = async (notion: NotionClient, name: string): Promise<string> => {
  const {results} = await notion.search({
    query: name,
    page_size: 1,
    filter: {property: "object", value: "database"},
  })
  return results[0].id.replaceAll("-", "")
}

export class Config implements ConfigInterface {
  public databases!: ConfigInterface["databases"]
  public readonly status: ConfigInterface["status"]
  public readonly topics: ConfigInterface["topics"]
  public readonly fields: ConfigInterface["fields"]
  public readonly methods: ConfigInterface["methods"]
  public readonly icons: ConfigInterface["icons"]
  private readonly databasesStore: ConfigInterface["databases"]
  private readonly notion: NotionClient

  constructor({
                databases,
                status,
                topics,
                fields,
                methods,
                icons
              }: ConfigInterface, notion: NotionClient,) {
    this.databasesStore = databases
    this.notion = notion

    this.status = status
    this.status.prefix = status.prefix ?? "status:"
    this.status.colname = status.colname ?? "Status"

    this.topics = topics
    this.topics.prefix = topics.prefix ?? "topic:"
    this.topics.colname = topics.colname ?? "Topics"

    this.fields = fields
    this.fields.prefix = fields.prefix ?? "field:"
    this.fields.colname = fields.colname ?? "Fields"

    this.methods = methods
    this.methods.prefix = methods.prefix ?? "method:"
    this.methods.colname = methods.colname ?? "Methods"

    this.icons = icons
  }

  async setupDBs(): Promise<void> {
    this.databases = this.databasesStore
    const {authors, articles} = this.databasesStore;

    if (!_.isNil(authors) && _.isString(authors)) {
      let dbID: string = isValidPageID(authors) ? authors : await getDBbyName(this.notion, authors)
      this.databases.authors = <AuthorsDB>{
        databaseID: <string>dbID,
        articleRef: "Articles",
      }
    } else {
      this.databases.authors = <AuthorsDB>authors
    }

    if (_.isString(articles)) {
      let dbID: string = isValidPageID(articles) ? articles : await getDBbyName(this.notion, articles)
      this.databases.articles = <ArticlesDB>{
        databaseID: <string>dbID,
        authorRef: "Authors",
      }
    } else {
      this.databases.articles = <ArticlesDB>articles
    }
  }

  get hasAuthorDB(): boolean {
    return !_.isNil(this.databases.authors)
  }

  get authorType(): string {
    return this.hasAuthorDB ? "relation" : "multi_select"
  }
}
