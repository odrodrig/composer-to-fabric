'use strict';

const owner = require('./simpleParticipant');

module.exports = class SimpleAsset{

    constructor(id, property1, owner) {
        this.id = id;
        this.property1 = property1;
        this.owner = owner;
    }

}