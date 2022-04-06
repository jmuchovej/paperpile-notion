import {
  CMS,
  getChildBlocks,
  getPageTitle,
  getPropertyValue,
  PageWithChildren,
  richTextAsPlainText,
} from "@jitl/notion-api"
import {
  Database,
  makeTitle,
  Notion,
  Relation,
  RichText,
  Select
} from "../notion"
import * as path from "node:path"
import * as _ from "lodash"
import {GetDatabaseResponse} from "@notionhq/client/build/src/api-endpoints"
import * as assert from "node:assert"
import {ArticlesDatabase} from "./article";

export class AuthorsDatabase extends Database<AuthorFrontmatter> {
  constructor(id: string, cacheDir: string) {
    super(CMSConfig, id, cacheDir)
  }

  mapAliases = (download: any): any => {
    type AuthorEntryMap = {
      [name: string]: any
    }
    const authors: AuthorEntryMap = {}

    return _.reduce(download, (result, entries) => {
      for (const entry of entries) {
        for (const author of entry.frontmatter.aliasesList) {
          if (_.keys(result).includes(author as string) && entry.frontmatter.aliasesList == 1) {
            continue
          }
          result[author as string] = entry
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
  const title = getPageTitle(page)
  // TODO this needs to be changed based on whether there's an Author's database
  const aliases = getPropertyValue(page, {name: `Aliases`, type: `rich_text`})
  const papers = getPropertyValue(page, {name: `Papers`, type: `relation`})

  const plain = {
    Name: richTextAsPlainText(title).trim(),
    Aliases: richTextAsPlainText(aliases),
  }
  const aliasesList: string[] = [
    plain.Name,
    ...plain.Aliases.split(`;`).map(a => a.trim()).filter(a => a),
  ]

  // TODO gather child block lengths
  return {plain, title, aliases, aliasesList, pageID: page.id, papers}
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
    }
  }
}

export const AuthorToNotion = (author: Author) => {
  const Name = makeTitle(author.name)

  return {
    Name,
  }
}

export const CreateAuthor = (dbID: string | undefined, author: Author) => {
  if (dbID !== undefined) {
    return {
      parent: {database_id: dbID},
      properties: AuthorToNotion(author)
    }
  }
}

export const initAuthorDB = async (authorDbID: string | undefined, cacheDir: string) => {
  if (authorDbID === undefined) {
    return {db: undefined, notion: undefined, index: undefined}
  }

  const authors = new AuthorsDatabase(authorDbID, cacheDir)
  await authors.setupDB()
  const notion = await authors.downloadDB("Name")
  const index = await authors.mapAliases(notion)

  return {db: authors, notion, index}
}
