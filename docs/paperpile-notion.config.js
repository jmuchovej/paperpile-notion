const databases = {
  authors: {
    databaseID: "1234567890abcdef1234567890abcdef",
    articleRef: "Articles",
  },
  articles: {
    databaseID: "abcdef1234567890abcdef1234567890",
    authorRef: "Authors",
  },
}

const status = {
  prefix: "status:",
  colname: "Status",
  states: {
    unread: "⏳ Unread",
    "reading-list": "📚 Reading List",
    done: "🎉 Finished!",
  },
}

const topics = {
  prefix: "topic:",
  colname: "Topics",
  topics: {
    dl: "Deep Learning",
  },
}

const fields = {
  prefix: "field:",
  colname: "Fields",
  fields: {
    mas: "Multi-Agent Systems",
  },
}

const methods = {
  prefix: "method:",
  colname: "Methods",
  methods: {
    mcmc: "Markov-Chain Monte-Carlo",
    vi: "Variational Inference",
  },
}

const icons = {
  book: ":books:",
  "article-journal": ":blue_book:",
  inproceedings: ":bookmark_tabs:",
  "paper-conference": ":bookmark_tabs:",
  proceedings: ":bookmark_tabs:",
}

module.exports = {
  databases, status, topics, fields, methods, icons,
}
