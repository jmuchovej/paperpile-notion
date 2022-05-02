import {Command, Flags} from "@oclif/core"
import {newConfig, StrictConfig} from "./config"
import path from "node:path"
import {Input} from "@oclif/core/lib/interfaces"
import {BibTeXDB, diffBibTeX, readBibTeX} from "./bibtex"
import _ from "lodash"
import {NotionClient, NotionClientDebugLogger} from "@jitl/notion-api"

const baseFlags = {
  config: Flags.string({
    char: `c`,
    description: `Path to your config file, if not in <%= config.configDir %>/config.js.`,
  }),
  help: Flags.help({char: `h`}),
  token: Flags.string({
    char: `t`,
    env: `NOTION_INTEGRATION_TOKEN`,
    description: `Your Notion Integration Token. (NOTE: If you specify an environment variable of 'NOTION_INTEGRATION_TOKEN', that may be used.)`,
    required: true,
  }),
  diff: Flags.file({
    char: `d`,
    description: `Your BibTeX file to diff against.`,
    required: false,
    exists: true,
  }),
}
export type BaseFlagTypes = typeof baseFlags

const baseArgs = [
  {
    name: "bibtexPath",
    required: true,
  },
]
export type BaseArgTypes = typeof baseArgs

const loadConfig = async (
  configDir: string,
  configPath: string | undefined,
  notion: NotionClient,
): Promise<StrictConfig> => {
  configPath = configPath ?
    path.join(process.cwd(), configPath) :
    path.join(configDir, "config.js")

  const {default: obj} = await import(configPath)
  return await newConfig(obj, notion)
}

abstract class BaseCommand extends Command {
  static flags: BaseFlagTypes = baseFlags
  static args: BaseArgTypes = baseArgs

  static examples: string[] = [
    "<%= config.bin %> <%= command.id %> /path/to/references.bib",
    "<%= config.bin %> <%= command.id %> /path/to/references.bib -c /path/to/paperpile-notion.config.js",
    "<%= config.bin %> <%= command.id %> /path/to/references.bib -t <your-integration-token>",
    "<%= config.bin %> <%= command.id %> /path/to/references.bib -t <your-integration-token> -c /path/to/paperpile-notion.config.js",
    "<%= config.bin %> <%= command.id %> /path/to/references.bib",
    "<%= config.bin %> <%= command.id %> /path/to/references.bib -d /path/to/your/previous/references.bib",
    "<%= config.bin %> <%= command.id %> /path/to/references.bib -d /path/to/your/previous/references.bib -t <your-integration-token>",
    "<%= config.bin %> <%= command.id %> /path/to/references.bib -d /path/to/your/previous/references.bib -t <your-integration-token> -c /path/to/paperpile-notion.config.js",
  ]

  protected appConfig!: StrictConfig
  protected BibTeX!: BibTeXDB
  protected BibTeXAuthors!: string[]
  notion!: NotionClient

  // Solved from: https://github.com/oclif/oclif/issues/225#issuecomment-574484114
  async init(): Promise<void> {
    const {args, flags} = await this.parse(
      <Input<any>>this.constructor,
    )

    this.notion = new NotionClient({
      auth: flags.token,
      logger: NotionClientDebugLogger,
    })

    this.appConfig = await loadConfig(this.config.configDir, flags?.config, this.notion)

    let bibtex: BibTeXDB
    const currBibTeX: BibTeXDB = readBibTeX(args.bibtexPath)
    console.log(`Found ${_.keys(currBibTeX).length} entries`)
    if (flags.diff) {
      const prevBibTeX: BibTeXDB = readBibTeX(flags.diff)
      bibtex = diffBibTeX(prevBibTeX, currBibTeX)
      console.log(`Reduced to ${_.keys(bibtex).length} entries`)
    } else {
      bibtex = currBibTeX
    }
    this.BibTeX = bibtex
    this.BibTeXAuthors = _.chain(this.BibTeX).values().flatMap((o) => o.authors).uniq().filter().value()

    await super.init()
  }

  async catch(err: any): Promise<any> {
    return super.catch(err)
  }

  async finally(err: any): Promise<any> {
    return super.finally(err)
  }
}

export default BaseCommand
