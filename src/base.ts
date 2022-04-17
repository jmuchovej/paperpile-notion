import {Command, Flags} from "@oclif/core"
import {Config} from "./config";
import path from "node:path";
import {Input} from "@oclif/core/lib/interfaces";
import {BibTeXDB, readBibTeX} from "./bibtex";
import _ from "lodash";
import {NotionClient} from "@jitl/notion-api";

const baseFlags = {
  config: Flags.string({
    char: `c`,
    description: `Path to your config file, if not in <%= config.configDir %>/config.js.`,
  }),
  help: Flags.help({char: "h"})
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
  configPath: string | undefined
): Promise<Config> => {
  configPath = configPath ?
    path.join(process.cwd(), configPath) :
    path.join(configDir, "config.js")

  const {default: obj} = await import(configPath)
  return new Config(obj);
}

abstract class BaseCommand extends Command {
  static flags: BaseFlagTypes = baseFlags
  static args: BaseArgTypes = baseArgs

  static examples: string[] = [
    "<%= config.bin %> <%= command.id %> /path/to/references.bib",
    "<%= config.bin %> <%= command.id %> /path/to/references.bib -c /path/to/paperpile-notion.config.js",
  ]

  protected appConfig!: Config;
  protected BibTeX!: BibTeXDB
  protected BibTeXAuthors!: string[]

  // Solved from: https://github.com/oclif/oclif/issues/225#issuecomment-574484114
  async init(): Promise<void> {
    const {args, flags} = await this.parse(
      this.constructor as Input<any>
    )

    this.appConfig = await loadConfig(this.config.configDir, flags?.config)

    this.BibTeX = readBibTeX(args.bibtexPath)
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
