'use strict';

module.exports = class SimpleParticipant {

    constructor(id, firstName, lastName) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.assets = new Array;
    }

}