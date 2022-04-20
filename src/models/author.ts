import {
  getPageTitle,
  getPropertyValue,
  PageWithChildren,
  richTextAsPlainText,
} from "@jitl/notion-api"
import {makeTitle, Title} from "../notion-cms"

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

export type Author = {
  name: string,
  articles?: string[]
}

export const AuthorToNotion = (author: Author): NotionAuthor => {
  const Name = makeTitle(author.name.trim())

  if (!Name)
    return

  return {Name}
}

export type NotionAuthor = {
  Name: Title,
}

export const prepareAuthorsForNotion = (author: string): Author => {
  const entry: Author = {
    name: author.trim(),
  }

  return entry
}

export namespace Author {
  const toNotion = AuthorToNotion
  const prepare = prepareAuthorsForNotion
}
