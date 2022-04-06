require(`@citation-js/plugin-bibtex`)
const {Cite, plugins, inputs} = require(`@citation-js/core`)
import * as _ from "lodash"
import {readFileSync} from "node:fs"

const parseKeywords = (keywords: string[] | undefined) => {
  // eslint-disable-next-line eqeqeq
  if (keywords == undefined) {
    return {keywords: []}
  }

  let status = _.find(keywords, (k: string) => k.startsWith(`status:`))
  keywords = keywords.filter((k: string) => k != status)
  status = status?.replace(/status:/, ``)

  let topics = keywords.filter((k: string) => k.startsWith(`topic:`))
  keywords = keywords.filter((k: string) => !topics.includes(k))
  topics = topics?.map((t: string) => t.replace(/topic:/, ``))

  let fields = keywords.filter((k: string) => k.startsWith(`field:`))
  keywords = keywords.filter((k: string) => !fields.includes(k))
  fields = fields?.map((t: string) => t.replace(/field:/, ``))

  let methods = keywords.filter((k: string) => k.startsWith(`method:`))
  keywords = keywords.filter((k: string) => !methods.includes(k))
  methods = methods?.map((t: string) => t.replace(/method:/, ``))

  return {status, topics, fields, methods, keywords}
}

export type BibTeXDB = {
  [title: string]: any
}

export const readBibTeX = (path: string) => {
  const file = readFileSync(path, {encoding: `utf-8`})

  const {data: articles} = new Cite(file)

  const entries: BibTeXDB = {}

  return _.reduce(articles, (obj, citation) => {
    citation.keyword = citation.keyword?.replaceAll(",", ";")
    citation.keyword = citation.keyword?.split(";").map((x: string) => x.trim())
    citation = {...citation, ...parseKeywords(citation.keyword)}
    citation.authors = citation.author?.map(({family, given}: any) => {
      return [given, family].filter(e => e).join(" ").replaceAll(".", "")
    })

    // Notion doesn't allow Selects to be longer than 100 characters
    citation["container-title"] = truncate(citation["container-title"], 100)

    // @ts-ignore
    obj[citation["citation-label"]] = citation
    return obj
  }, entries)
}

const truncate = (str: string, maxlen: number = 100) => {
  return (str?.length > maxlen) ? str.slice(0, maxlen - 3) + "..." : str
}

export type BibTeXForNotion = {
  [name: string]: any
}
