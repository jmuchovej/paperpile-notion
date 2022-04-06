export interface Config {
  databases: {
    authors: string | undefined
    articles: string
  }
  status: {
    prefix: string | "status:"
    colname: string | "Status"
    states: {
      [key: string]: string
    }
  }
  fields: {
    prefix: string | "field:"
    colname: string | "Fields"
    fields: {
      [key: string]: string
    }
  }
  methods: {
    prefix: string | "method:"
    colname: string | "Methods"
    methods: {
      [key: string]: string
    }
  }
  icons: {
    [bibtexKey: string]: string
  }
}

export class PaperpileNotionConfig implements Config {
  readonly databases: Config["databases"]
  readonly status: Config["status"]
  readonly fields: Config["fields"]
  readonly methods: Config["methods"]
  readonly icons: Config["icons"]

  constructor({databases, status, fields, methods, icons}: Config) {
    this.databases = databases
    this.status = status
    this.fields = fields
    this.methods = methods
    this.icons = icons
  }
}
