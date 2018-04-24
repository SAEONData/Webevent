'use strict'
const chai = require('chai')
const should = chai.should()

const Keyword = require('../src/hooks/Keyword')

describe('Keyword', () => {
    describe('match', () => {
      it('should match a value from an array of words', () => {
        const kword = new Keyword(['one', 'two', "three"])
        kword.match('two').should.deep.equal(['two'])
      })

      it('should fuzzy match a word in a sentence from an array of words', () => {
        const kword = new Keyword(['one', 'two', 'three'])
        kword.match('There were two birds').should.deep.equal(['two'])
      })

      it('should fuzzy match multiple words in a string', () => {
        const kword = new Keyword(['one', 'two', 'three'])
        kword.match('There were two birds, and one dog').should.deep.equal([ 'one', 'two'])
      })
    })
})