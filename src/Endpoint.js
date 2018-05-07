'use strict'

const { request } = require('graphql-request')

class Endpoint {
  constructor(api) {
    this.uri = api

    this.mutate = `
      mutation addEvent($text: String, $timestamp: String!, $stocks: [String], $hazards: [String], $event_type: String, $source: String, $locality: String) {
        event(text: $text, timestamp: $timestamp, stocks: $stocks, hazards: $hazards, event_type: $event_type, source: $source, locality: $locality) {
          key
        }
      }
    `
  }

  post(value, check = true) {

    const { timestamp } = value

    if(!check || this.check(value)) {
      return request(this.uri, this.mutate, value).then(data => console.log(data))
    }
    return new Promise(() => false)
  }

  check(value) {
    const { hazards, stocks } = value
    if(hazards === undefined || stocks === undefined) {
      return false
    }
    return hazards.length > 0 || stocks.length > 0
  }
}

module.exports = Endpoint