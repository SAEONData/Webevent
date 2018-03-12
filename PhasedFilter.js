'use strict'

const Fuse = require('fuse.js')

class PhasedFilter {
  constructor(keys) {
    Object.defineProperty(this, 'kwords', { value: [] })
    Object.defineProperty(this, 'fuseOpts', { value: {
      shouldSort: true,
      threshold: 0.6,
      distance: 100,
      masPatternLength: 32,
      minMatchCharLength: 1,
      keys
    }})
    Object.defineProperty(this, 'fuse', { writable: true, value: { } })

  }

  set kwords(value) {
    if(Array.isArray(value)) {
      for( let i = 0, ln = value.length; i < ln; i++ ) {
        this.kword.push(value[i])
      }
      this.resetFuse()
      return
    }
    this.kword.push(value)
    this.resetFuse()
  }

  resetFuse() {
    this.fuse = new Fuse(this.kwords, this.fuseOpts)
  }

  /**
   *
   * @param {*} event Standard Flux event
   */
  match(event) {
    this.fuse.search()
  }
}

