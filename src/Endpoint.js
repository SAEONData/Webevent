'use strict'

const { request } = require('graphql-request')

class Endpoint {
  constructor(api) {
    this.uri = api

    this.mutate = `
      mutation addEvent($text: String!, $timestamp: Int!) {
        event(text: $text, timestamp: $timestamp): Event
      }
    `
  } 

  post(value) {
    if(this.check(value)) {
      request(this.uri, this.mutate, value).then(data => console.log(data))
    }
  }

  check(value) {
    const { hazards, stocks } = value
    if(hazards === undefined || stocks === undefined) {
      return false
    }
    return hazards.length > 0 && stocks.length > 0
  }
}

module.exports = Endpoint