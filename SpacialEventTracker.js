'use strict'


class EventMatcher {
  constructor() {
    Object.defineProperty(this, 'kwords', { value: [] })
    Object.defineProperty(this, 'fuseOpts', { value: {
      shouldSort: true,
      threshold: 0.6,
      distance: 100,
      masPatternLength: 32,
      minMatchCharLength: 1,
      keys: []
    }})
    Object.defineProperty(this, 'fuse', { writable: true, value: {} })
  }

  set kwords(value) {
    if(Array.isArray(value)) {
      for( let i = 0, ln = value.length; i < ln; i++ ) {
        this.kword.push(value[i])
      }
      return
    }
    this.kword.push(value)
  }
  /**
   *
   * @param {*} event Standard Flux event
   */
  push(event) {

  }
}