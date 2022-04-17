import _ from "lodash";

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

export class Config implements ConfigInterface {
  readonly databases: ConfigInterface["databases"]
  readonly status: ConfigInterface["status"]
  readonly topics: ConfigInterface["topics"]
  readonly fields: ConfigInterface["fields"]
  readonly methods: ConfigInterface["methods"]
  readonly icons: ConfigInterface["icons"]

  constructor({
                databases,
                status,
                topics,
                fields,
                methods,
                icons
              }: ConfigInterface) {
    this.databases = databases
    const {authors, articles} = databases;

    if (!_.isNil(authors) && _.isString(authors)) {
      this.databases.authors = <AuthorsDB>{
        databaseID: <string>authors,
        articleRef: "Articles",
      }
    }

    if (_.isString(articles)) {
      this.databases.articles = <ArticlesDB>{
        databaseID: <string>articles,
        authorRef: "Authors",
      }
    }

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

  get hasAuthorDB(): boolean {
    return !_.isNil(this.databases.authors)
  }

  get authorType(): string {
    return this.hasAuthorDB ? "relation" : "multi_select"
  }
}
