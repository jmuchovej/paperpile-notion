require(`@citation-js/plugin-bibtex`)
const {Cite} = require(`@citation-js/core`)
import * as _ from "lodash"
import {readFileSync} from "node:fs"

const parseKeywords = (keywords: string[] | undefined) => {
  // eslint-disable-next-line eqeqeq
  if (keywords == undefined) {
    return {keywords: []}
  }

  let status: string = keywords.find((k: string) => k.startsWith(`status:`))
  keywords = keywords.filter((k: string) => k.startsWith("status:"))
  status = status?.replace(/status:/, ``)

  let topics: string[] = keywords.filter((k: string) => k.startsWith(`topic:`))
  keywords = keywords.filter((k: string) => !topics.includes(k))
  topics = topics?.map((t: string) => t.replace(/topic:/, ``))

  let fields: string[] = keywords.filter((k: string) => k.startsWith(`field:`))
  keywords = keywords.filter((k: string) => !fields.includes(k))
  fields = fields?.map((t: string) => t.replace(/field:/, ``))

  let methods: string[] = keywords.filter((k: string) => k.startsWith(`method:`))
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
    const authors = citation.author ? citation.author : citation.editor
    citation.authors = authors?.map(({family, given}: any) => {
      return [given, family].filter(e => e).join(" ").replaceAll(/[.*]/g, "")
    })

    // Notion doesn't allow Selects to be longer than 100 characters
    let venue = citation["container-title"]
    venue = truncate(venue, 100)
    venue = venue?.replaceAll(",", " ")
    citation["container-title"] = venue

    const ID = citation["citation-label"]
    if (!_.isNil(citation.title) && !_.isNil(citation["citation-label"])) {
      obj[ID] = citation
    }

    return obj
  }, entries)
}

export const diffBibTeX = (prev: BibTeXDB, curr: BibTeXDB): BibTeXDB => {
  return _.keys(curr).map((key: string) => {
    if (!prev[key]) { // New BibTeX entry
      return key
    } else if (!_.isEqual(prev[key], curr[key])) { // Updated BibTeX entry
      return key
    }
  }).filter(k => k).reduce((obj: BibTeXDB, key: string) => {
    obj[key] = curr[key]
    return obj
  }, {})
}

const truncate = (str: string, maxlen: number = 100) => {
  return (str?.length > maxlen) ? str.slice(0, maxlen - 3) + "..." : str
}

export type BibTeXForNotion = {
  [name: string]: any
}
