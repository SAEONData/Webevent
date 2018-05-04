'use strict'

class Module {
    constructor(name) {
        Object.defineProperty(this, 'MODULE_NAME', { enumerable: true, writable: false, value: name})
    }

    init() {}
    start() {}

    toString() {
        return `[Module ${this.MODULE_NAME}]`
    }
}

module.exports = Module