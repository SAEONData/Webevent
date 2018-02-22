'use strict'

const Twit = require('twit')
const geoJsonBounds = require('geojson-bounds')

/**
 * @class TwitterEventTracker
 * @see https://github.com/acdlite/flux-standard-action
 */
class TwitterEventTracker {
  constructor(opts, timeout) {
    timeout = timeout || 60 * 1000
    Object.assign(opts, { timeout_ms: timeout })
    const T = new Twit(opts)

    Object.defineProperty(this, 'T', { value: T }) // twit
    Object.defineProperty(this, 'registry', { value: {}, enumerable: true }) // event listener registry
    Object.defineProperty(this, 'history', { value: [], enumerable: true  }) // event listener history (this should be a database really)

    Object.defineProperty(this, 'feed', {
      value: {
        dispatch: (action) => {
          const { type, payload } = action
          if (typeof this.registry[type] == 'undefined') {
            console.error(`Event ${type} was fired but does not exist`)
          } else {
            this.history.push(this.registry[type](action))
          }
        }
      }
    }) // event feed


  }

  addEventListener(event, callback) {
    if(typeof callback == 'undefined' || typeof event == 'undefined' ) {
      throw new Error("Event and callback needed to add a new event listener")
    }
    this.registry[event] = callback
  }

  trackLocation(bounds, type) {
    const { T } = this
    const stream = T.stream('statuses/filter', { locations: bounds })
    stream.on('tweet', (tweet) => this.feed.dispatch({ type, payload: tweet }))
  }

  trackKeyword(kword, type) {
    const { T } = this
    if(!type) {
      type = kword
    }
    const stream = T.stream('statuses/filter', { track: kword })
    stream.on('tweet', (tweet) => this.feed.dispatch({ type, payload: tweet }))
  }
}

module.exports = TwitterEventTracker