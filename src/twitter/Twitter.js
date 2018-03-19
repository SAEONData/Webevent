'use strict'

/**
 * imports
 * @ignore
 */
const Twit = require('twit')

/**
 * Module imports
 * @ignore
 */
const Registry = require('../Registry')

/**
 * Twitter
 * @param {object} opts Options for Twit
 * @param {number} timeout Timeout for HTTP requests (Twit option)
 * @param {*} endpoint Where to stream events to
 */
class Twitter {
  constructor(opts, { timeout = 60 * 1000, endpoint }) {
    Object.assign(opts, { timeout_ms: timeout })
    const T = new Twit(opts)

    const registry = new Registry()

    Object.defineProperty(this, 'twit', { value: T }) // twit
    Object.defineProperty(this, 'registry', { value: registry })
    Object.defineProperty(this, 'endpoint', { value: endpoint })
    Object.defineProperty(this, 'streams', { value: [] })
  }

  /**
   * Prepare an event to emit
   * @param {*} eventName
   * @param {*} hooks
   */
  event(eventName, hooks = []) {
    this.registry.registerEvent({ eventName, hooks, endpoint: this.endpoint })
  }

  /**
   * Add a keyword to track
   * @param {*} kword keyword to track
   * @param {*} event event name
   */
  keyword(kword, event) {
    const { twit } = this

    // if no event name is specified to be emitted, emit the keyword as an event
    if (!event) {
      event = kword
    }
    const stream = twit.stream('statuses/filter', { track: kword })
    stream.on('tweet', (tweet) => this.registry.emit(event, tweet))
  }

  location(bounds, event) {
    throw new Error('Not implemented yet')
  }
}

module.exports = Twitter