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
    authors: string | AuthorsDB | undefined,
    articles: string | ArticlesDB,
  },
  status: {
    prefix: string | "status:",
    colname: string | "Status",
    states: {
      [key: string]: string,
    }
  },
  topics: {
    prefix: string | "topic:",
    colname: string | "Topics",
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
    prefix: string | "method:",
    colname: string | "Methods",
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

  constructor({databases, status, topics, fields, methods, icons}: ConfigInterface) {
    this.databases = databases
    const {authors, articles} = databases;

    if (!_.isNil(authors) && _.isString(authors)) {
      this.databases.authors = {
        databaseID: authors as string,
        articleRef: "Papers",
      }
    }

    if (_.isString(articles)) {
      this.databases.articles = {
        databaseID: articles as string,
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

  get hasAuthorsDB() {
    return !_.isNil(this.databases.authors)
  }
}
