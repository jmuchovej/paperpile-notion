import {
  getPageTitle,
  getPropertyValue,
  PageWithChildren,
  richTextAsPlainText,
} from "@jitl/notion-api"
import {
  Database, makeRelation,
  makeTitle, MultiSelect,
  Notion,
  Relation,
  RichText, Select, Title,
} from "../notion"
import * as path from "node:path"
import * as _ from "lodash"
import {ConfigInterface} from "../config";

export class AuthorsDatabase extends Database<AuthorFrontmatter> {
  constructor(id: string, cacheDir: string) {
    super(CMSConfig, id, cacheDir)
  }

  mapAliases = (download: any): any => {
    type AuthorEntryMap = {
      [name: string]: any
    }
    let authors: AuthorEntryMap = {}

    return _.reduce(download, (result, entries) => {
      for (const entry of entries) {
        for (const author of entry.frontmatter.aliasesList) {
          result[author.trim()] = entry
        }
      }

      return result
    }, authors)
  }
}

export type AuthorFrontmatter = {
  aliases: RichText
  papers?: Relation,
  plain: {
    Name: string,
    Aliases: string,
  },

}

export const getFrontmatter = (page: PageWithChildren) => {
  // const blocks = await getChildBlocks(Notion, page.id)
  const name = getPageTitle(page)
  // TODO this needs to be changed based on whether there's an Author's database
  const aliases = getPropertyValue(page, {name: `Aliases`, type: `rich_text`})
  const papers = getPropertyValue(page, {name: `Papers`, type: `relation`})

  const plain = {
    Name: richTextAsPlainText(name).trim(),
    Aliases: richTextAsPlainText(aliases),
  }
  const aliasesList: string[] = [
    plain.Name,
    ...plain.Aliases.split(`;`),
  ].map(a => a.trim()).filter(a => a)

  // TODO gather child block lengths
  return {plain, name, aliases, aliasesList, pageID: page.id, papers}
}

export const CMSConfig = (cacheDir: string, databaseID: string) => {
  return {
    // eslint-disable-next-line camelcase
    database_id: databaseID,
    getFrontmatter,
    title: undefined,
    notion: Notion,
    slug: undefined,
    visible: true,
    cache: {
      directory: path.join(cacheDir, `authors`),
    },
    assets: {
      directory: path.join(cacheDir, `authors/assets`),
      downloadExternalAssets: true,
    },
  }
}

type Author = {
  name: string
}

export type AuthorIndex = {
  [name: string]: {
    frontmatter: {
      pageID: string
      papers: any[]
    }
  }
}

type NotionEntry = {
  Name: Title,
  Papers?: Relation,
}

export const AuthorToNotion = (author: NotionAuthorEntry) => {
  const Name = makeTitle(author.name.trim())
  // @ts-ignore
  const Papers = makeRelation(author?.papers)

  if (!Name)
    return

  let Entry: NotionEntry = {Name}
  Entry = Papers ? {...Entry, Papers} : Entry

  return Entry
}

export const initAuthorDB = async (authorDbID: string | undefined, cacheDir: string) => {
  if (authorDbID === undefined) {
    return {db: undefined, notion: undefined, authorIndex: undefined}
  }

  const authors = new AuthorsDatabase(authorDbID, cacheDir)
  await authors.setupDB()
  const notion = await authors.downloadDB("Name")
  const index = await authors.mapAliases(notion)

  return {db: authors, notion, authorIndex: index}
}

type NotionAuthorEntry = {
  name: string,
  papers?: { id: string }[]
}

export const prepareAuthorsForNotion = (author: string, authorIndex: AuthorIndex, config: ConfigInterface) => {
  const entry: NotionAuthorEntry = {
    name: author.trim()
  }

  entry.papers = authorIndex[author.trim()]?.frontmatter.papers

  return entry
}
