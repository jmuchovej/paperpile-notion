/* eslint-disable camelcase */
import {StrictConfig} from "../config"
import {
  makeMultiSelect,
  makeRelation,
  makeRichText,
  makeSelect,
  makeTitle,
  makeURL,
  MultiSelect,
  Relation,
  RichText,
  Select,
  Title,
  URL,
} from "../notion-cms"

export type ArticleEntry = any

export type NotionArticle = {
  Title: Title,
  ID: RichText,
  Status: Select,
  Authors?: MultiSelect | Relation,
  Topics?: MultiSelect,
  Fields?: MultiSelect,
  Methods?: MultiSelect,
  Keywords?: MultiSelect,
  Folders?: MultiSelect,
  Venue?: Select,
  URL?: URL,
}

export const BibTeXToNotion = (appConfig: StrictConfig, bib: ArticleEntry): NotionArticle => {
  const ID = <RichText>makeRichText(bib.id)
  const Title = makeTitle(bib.title)
  const Status = makeSelect(bib.status) ?? <Select>makeSelect("❓ Unknown")

  const Authors = appConfig.hasAuthorDB ?
    makeRelation(bib.authors) : makeMultiSelect(bib.authors)
  const Topics = makeMultiSelect(bib.topics)
  const Fields = makeMultiSelect(bib.fields)
  const Methods = makeMultiSelect(bib.methods)
  const Folders = makeMultiSelect(bib.folders)
  const Keywords = makeMultiSelect(bib.keywords)
  const Venue = makeSelect(bib["container-title"])
  const URL = makeURL(bib.url)

  let Entry: NotionArticle = {ID, Title, Status}
  Entry = Authors ? {...Entry, Authors} : Entry
  Entry = Topics ? {...Entry, Topics} : Entry
  Entry = Fields ? {...Entry, Fields} : Entry
  Entry = Methods ? {...Entry, Methods} : Entry
  Entry = Keywords ? {...Entry, Keywords} : Entry
  Entry = Folders ? {...Entry, Folders} : Entry
  Entry = Venue ? {...Entry, Venue} : Entry
  Entry = URL ? {...Entry, URL} : Entry

  return Entry
}
