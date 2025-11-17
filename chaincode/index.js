'use strict';

const { Contract } = require('fabric-contract-api');

class ChainCertContract extends Contract {

  async InitLedger(ctx) {
    console.log('ChainCert chaincode initialized');
    return;
  }

  // PHASE 1: Template Creation (no holderID) - ACCEPTS SDK PARAMETERS
  async CreateCredentialTemplate(ctx, id, issuerID, credentialType, credentialName, description, metadata) {
    const exists = await this.CredentialExists(ctx, id);
    if (exists) {
      throw new Error(`Credential template ${id} already exists`);
    }

    const txTimestamp = ctx.stub.getTxTimestamp();
    const issuedDate = new Date(
      txTimestamp.seconds * 1000 + Math.floor(txTimestamp.nanos / 1000000)
    ).toISOString();

    const credential = {
      id: id,
      holderID: "",        // ✅ EMPTY - This is a template
      issuerID: issuerID,
      credentialType: credentialType,
      credentialName: credentialName,      // ✅ NEW
      description: description,            // ✅ NEW
      issuedDate: issuedDate,
      status: 'active',
      metadata: metadata,
      version: 1,
      isTemplate: true     // ✅ Flag to indicate this is a template
    };

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(credential)));
    return JSON.stringify(credential);
  }

  // PHASE 2: Assign Template to Holder (add holderID)
  async IssueCredentialToHolder(ctx, templateId, holderID, expiryDate, documentHash) {
    const templateJSON = await ctx.stub.getState(templateId);
    if (!templateJSON || templateJSON.length === 0) {
      throw new Error(`Credential template ${templateId} does not exist`);
    }

    const template = JSON.parse(templateJSON.toString());
    
    // Create instance with holder
    const credentialInstance = {
      ...template,
      id: `${templateId}_${holderID}_${Date.now()}`,  // Unique ID for this issuance
      holderID: holderID,  // ✅ NOW we assign the holder
      expiryDate: expiryDate,        // ✅ Added here at issue time
      documentHash: documentHash,    // ✅ Added here at issue time
      isTemplate: false,   // This is an actual instance
      assignedDate: new Date().toISOString()
    };

    await ctx.stub.putState(credentialInstance.id, Buffer.from(JSON.stringify(credentialInstance)));
    return JSON.stringify(credentialInstance);
  }

  async GetCredential(ctx, id) {
    const credentialJSON = await ctx.stub.getState(id);
    if (!credentialJSON || credentialJSON.length === 0) {
      throw new Error(`Credential ${id} does not exist`);
    }
    return credentialJSON.toString();
  }

  async VerifyCredential(ctx, id) {
    const credentialJSON = await ctx.stub.getState(id);
    if (!credentialJSON || credentialJSON.length === 0) {
      return JSON.stringify({ valid: false, reason: 'Credential not found' });
    }

    const credential = JSON.parse(credentialJSON.toString());

    if (credential.status !== 'active') {
      return JSON.stringify({ valid: false, reason: 'Credential is not active' });
    }

    // Only check expiry if expiryDate exists (for issued credentials)
    if (credential.expiryDate) {
      const now = new Date();
      const expiry = new Date(credential.expiryDate);
      if (now > expiry) {
        return JSON.stringify({ valid: false, reason: 'Credential has expired' });
      }
    }

    return JSON.stringify({ valid: true, credential: credential });
  }

  async RevokeCredential(ctx, id) {
    const credentialJSON = await ctx.stub.getState(id);
    if (!credentialJSON || credentialJSON.length === 0) {
      throw new Error(`Credential ${id} does not exist`);
    }

    const credential = JSON.parse(credentialJSON.toString());
    credential.status = 'revoked';

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(credential)));
    return JSON.stringify(credential);
  }

  async CredentialExists(ctx, id) {
    const credentialJSON = await ctx.stub.getState(id);
    return credentialJSON && credentialJSON.length > 0;
  }

  async GetCredentialsByHolder(ctx, holderID) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value) {
        const credential = JSON.parse(result.value.value.toString('utf8'));
        if (credential.holderID === holderID) {
          results.push(credential);
        }
      }
      result = await iterator.next();
    }

    await iterator.close();
    return JSON.stringify(results);
  }

  async GetCredentialsByIssuer(ctx, issuerID) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value) {
        const credential = JSON.parse(result.value.value.toString('utf8'));
        if (credential.issuerID === issuerID) {
          results.push(credential);
        }
      }
      result = await iterator.next();
    }

    await iterator.close();
    return JSON.stringify(results);
  }

  async GetCredentialHistory(ctx, credentialId) {
    console.log(`Getting history for credential: ${credentialId}`);

    const historyIterator = await ctx.stub.getHistoryForKey(credentialId);
    const allResults = [];

    let res = await historyIterator.next();
    while (!res.done) {
      if (res.value) {
        const record = {};
        record.txId = res.value.txId;

        const seconds = res.value.timestamp.seconds;
        const nanos = res.value.timestamp.nanos;
        const timestamp = (seconds * 1000) + Math.floor(nanos / 1000000);
        record.timestamp = new Date(timestamp).toISOString();

        record.isDelete = res.value.isDelete;

        if (!res.value.isDelete && res.value.value) {
          record.value = JSON.parse(res.value.value.toString('utf8'));
        }

        allResults.push(record);
      }
      res = await historyIterator.next();
    }

    await historyIterator.close();
    return JSON.stringify(allResults);
  }
}

module.exports = ChainCertContract;
