'use strict'

class Keyword {
  constructor(list = []) {
    Object.defineProperty(this, 'list', { value: list })
  }

  /**
   * match
   * @description Returns an object containing the first matched value (if any) and a bool if a match was found
   * @param {string} value
   * @returns {Object}
   */
  match(value) {
    list.forEach(kword => {
      if(value.match(kword)) {
        return {
          keyword: kword,
          match: true
        }
      }
    });
    return { match: false }
  }
}