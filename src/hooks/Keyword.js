'use strict'

const nm = require('nanomatch')

class Keyword {
  constructor(list = []) {
    const globs = list.map(word => ({ name: word, glob: `*${word.toLowerCase()}*` }) )
    Object.defineProperty(this, 'list', { value: globs })
  }

  /**
   * match
   * @description Returns an object containing the first matched value (if any) and a bool if a match was found
   * @param {string} value
   * @returns {Object}
   */
  match(value) {
    let words = typeof value === Array ? [...value] : value
    //const matched = nm(value, this.list)
    const keywords = this.list.filter(word => nm(value, word.glob).length > 0).map(word => word.name)
    return keywords

  }
}

module.exports = Keyword