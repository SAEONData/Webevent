'use strict'

/**
 * imports
 * @ignore
 */
const _ = require('lodash')
const EventEmitter = require('events')

class EventRegistry extends EventEmitter{
  constructor() {
    super()
    Object.defineProperty(this, 'registry', { value: {} })
  }

  registerEvent({ eventName, hooks = [], endpoint = console.log(d) }) {
    this.registry[eventName] = { hooks }
    this.on(eventName, (data) => {
      let res = data

      if(hooks.length > 0) {
        hooks.map(hook => res = hook(res))
      }
      endpoint(res)
      return res
    })
  }

  registerHook(eventName, callback) {
    if(this.registry[eventName]) {
      let { hooks } = this.registry[eventName]
      hooks.push(callback)
    } else {
      instance.logger.warn(`registerHook was called with an unknown eventName: ${eventName}.`)
    }
  }

}

module.exports = EventRegistry