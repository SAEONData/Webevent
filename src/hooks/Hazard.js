'use strict'

const Keyword = require('./Keyword')

class Hazard extends Keyword {
  constructor(list) {
    super(list)
  }

  tweetHook(data) {
    const { tweet: { text } } = data
    const matchResult = this.match(text)
    return { ...data, matchResult }
  }
}