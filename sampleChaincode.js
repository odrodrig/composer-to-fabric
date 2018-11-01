/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

'use strict';
const shim = require('fabric-shim');
const util = require('util');

const simpleAsset = require('./models/simpleAsset');
const simpleParticipant = require('./models/simpleParticipant');

let Chaincode = class {

  /**
   * The Init method is called when the Smart Contract 'carauction' is instantiated by the 
   * blockchain network. Best practice is to have any Ledger initialization in separate
   * function -- see initLedger()
   */
  async Init(stub) {
    console.info('=========== Instantiated fabcar chaincode ===========');
    return shim.success();
  }
  /**
   * The Invoke method is called as a result of an application request to run the 
   * Smart Contract 'carauction'. The calling application program has also specified 
   * the particular smart contract function to be called, with arguments
   */
  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];
    if (!method) {
      console.error('no function of name:' + ret.fcn + ' found');
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.info(err);
      return shim.error(err);
    }
  }

  /**
   * The initLedger method is called as a result of instantiating chaincode. 
   * It can be thought of as a constructor for the network. For this network 
   * we will create 3 members, a vehicle, and a vehicle listing.
   */
  async initLedger(stub, args) {
    console.info('============= START : Initialize Ledger ===========');

    let owner1 = new simpleParticipant('owner1', 'john', 'doe');
    let owner2 = new simpleParticipant('owner2', 'jane', 'doe');
    let owner3 = new simpleParticipant('owner3', 'jim', 'doe');

    let asset1 = new simpleAsset('asset1', 123, owner1);
    let asset2 = new simpleAsset('asset2', 456, owner2);
    let asset3 = new simpleAsset('asset3', 789, owner3);

    owner1.assets.push(asset1);
    owner2.assets.push(asset2);
    owner3.assets.push(asset3);

    await stub.putState(owner1.id, Buffer.from(JSON.stringify(owner1)));
    await stub.putState(owner2.id, Buffer.from(JSON.stringify(owner2)));
    await stub.putState(owner3.id, Buffer.from(JSON.stringify(owner3)));
    await stub.putState(asset1.id, Buffer.from(JSON.stringify(asset1)));
    await stub.putState(asset2.id, Buffer.from(JSON.stringify(asset2)));
    await stub.putState(asset3.id, Buffer.from(JSON.stringify(asset3)));

    console.info('============= END : Initialize Ledger ===========');
  }

  /**
   * Query the state of the blockchain by passing in a key  
   * @param arg[0] - key to query 
   * @return value of the key if it exists, else return an error 
   */
  async query(stub, args) {
    console.info('============= START : Query method ===========');
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting 1');
    }

    let query = args[0];

    let queryAsBytes = await stub.getState(query); //get the asset from world state
    if (!queryAsBytes || queryAsBytes.toString().length <= 0) {
      throw new Error('key' + ' does not exist: ');
    }
    console.info('query response: ');
    console.info(queryAsBytes.toString());
    console.info('============= END : Query method ===========');

    return queryAsBytes;

  }


  /**
   * Create a simpleAsset object in the state  
   * @param arg[0] - key for the asset (asset id number)
   * @param arg[1] - property of the asset
   * @param arg[2] - owner of the asset
   * onSuccess - create and update the state with a new asset object  
   */
  async createAsset(stub, args) {
    console.info('============= START : Create Asset ===========');

    if (args.length != 3) {
      throw new Error('Incorrect number of arguments. Expecting 3');
    }

    //Check to see if key is unique
    if(!isKeyUnique(stub, args[0])) {
      throw new Error('Key is not unique, try again with a unique id');
    }

    //Check to see if Owner of simpleAsset exists
    if(isKeyUnique(stub, args[2].id)) {
      throw new Error('Owner does not exist. Create owner first');
    }

    var asset = new simpleAsset(arg[0], arg[1], arg[2]);

    await stub.putState(args[0], Buffer.from(JSON.stringify(asset)));
    console.info('============= END : Create Asset ===========');
  }

  /**
   * Create a simpleParticipant object in the state  
   * @param arg[0] - key for the member (email)
   * @param arg[1] - first name of member
   * @param arg[2] - last name of member
   * onSuccess - create and update the state with a new member object  
   */
  async createParticipant(stub, args) {
    console.info('============= START : Create Participant ===========');
    if (args.length != 3) {
      throw new Error('Incorrect number of arguments. Expecting 3');
    }

    if(!isKeyUnique(stub, args[0])) {
      throw new Error('Key is not unique, try again with a unique id');
    }

    var participant = new simpleParticipant(args[0], args[1], args[2]);

    await stub.putState(args[0], Buffer.from(JSON.stringify(participant)));
    console.info('============= END : Create participant ===========');
  }

  /** 
   * Create a simple transaction to transfer an asset
   * @param arg[0] - transferer - Who is transferring asset
   * @param arg[1] - transferee - Who is the asset is being transferred to
   * @param arg[2] - asset - The asset being transferred
   * onSuccess - changes the ownership of the asset 
   */
  async transferAsset(stub, args) {
    console.info('============= START : Asset Transfer ===========');
    if (args.length != 3) {
      throw new Error('Incorrect number of arguments. Expecting 3');
    }

    //Check to see if transferer exists
    if(isKeyUnique(stub, args[0])) {
      throw new Error('Transferer does not exit, try again with a participant that exists');
    }

    //Check to see if transferee exists
    if(isKeyUnique(stub, args[1].id)) {
      throw new Error('Transferee does not exit, try again with a participant that exists');
    }

     //Check to see if Owner of simpleAsset exists
     if(isKeyUnique(stub, args[2].id)) {
      throw new Error('Asset does not exist. Create asset first');
    }

    if(arg[2].owner.id != arg[0].id) {
      throw new Error('Transferer does not own the asset')
    }

    let transferer = await stub.getState(arg[0].id);
    let transferee = await stub.getState(arg[1].id);
    let assetToTransfer = await stub.getState(arg[2].id);

    console.info('============ Commence transfer =============');

    var index = transferer.assets[assetToTransfer];

    if (index != -1) {
      transferer.assets.splice(index, 1);
      transferee.assets.push(assetToTransfer);
      assetToTransfer.owner = transferee;
    } else {
      throw new error("Asset does not exist in transferer's asset array");
    }
        //update the listing, use listingId as key, and the listing object as the value
        await stub.putState(args[0], Buffer.from(JSON.stringify(transferer)));        
        await stub.putState(args[1], Buffer.from(JSON.stringify(transferee)));   
        await stub.putState(args[2], Buffer.from(JSON.stringify(assetToTransfer)));         
  }
};

function isKeyUnique(stub, key) {
  let thing = await stub.getState(key);
  if (!thing || thing.toString().length <= 0) {
    return false;
  }
  return true;
}

shim.start(new Chaincode()); 
