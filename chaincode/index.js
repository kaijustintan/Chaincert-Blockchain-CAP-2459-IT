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

    console.log('🚀 Writing new credential template to ledger:', id);
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(credential)));
    console.log('✅ Credential template written to ledger:', id);
    return JSON.stringify(credential);
  }

  // ✅ FIXED: PHASE 2 - Issue Credential (Assign Template to Holder)
  // ✅ FIX: Use timestamp for DETERMINISTIC instance ID (same on all peers)
  // ✅ NO client-generated IDs for issued instances - blockchain generates it
  async IssueCredential(ctx, templateId, holderID, expiryDate) {
    const templateJSON = await ctx.stub.getState(templateId);
    if (!templateJSON || templateJSON.length === 0) {
      throw new Error(`Credential template ${templateId} does not exist`);
    }

    const template = JSON.parse(templateJSON.toString());
    
    // ✅ FIXED: Use blockchain timestamp for deterministic ID
    // All peers will use the SAME timestamp from the transaction
    const txTimestamp = ctx.stub.getTxTimestamp();
    const txId = ctx.stub.getTxID();
    
    // Create instance ID using blockchain-provided data (deterministic on all peers)
    const credentialInstance = {
      ...template,
      id: `${templateId}_${holderID}_${txTimestamp.seconds}${txTimestamp.nanos}`,
      txId: txId,  // Add transaction ID for additional uniqueness
      holderID: holderID,  // ✅ NOW we assign the holder
      expiryDate: expiryDate || '',
      isTemplate: false,   // This is an actual instance
      assignedDate: new Date(txTimestamp.seconds * 1000 + Math.floor(txTimestamp.nanos / 1000000)).toISOString(),
      status: 'issued'
    };

    console.log('🚀 Issuing credential instance to holder:', holderID);
    console.log('📝 Instance ID:', credentialInstance.id);
    await ctx.stub.putState(credentialInstance.id, Buffer.from(JSON.stringify(credentialInstance)));
    console.log('✅ Credential instance issued to ledger:', credentialInstance.id);
    return JSON.stringify(credentialInstance);
  }

  // DEPRECATED: Use IssueCredential instead (kept for backward compatibility)
  async IssueCredentialToHolder(ctx, templateId, holderID, expiryDate, documentHash) {
    console.warn('⚠️  IssueCredentialToHolder is deprecated. Use IssueCredential instead.');
    
    const templateJSON = await ctx.stub.getState(templateId);
    if (!templateJSON || templateJSON.length === 0) {
      throw new Error(`Credential template ${templateId} does not exist`);
    }

    const template = JSON.parse(templateJSON.toString());
    
    const txTimestamp = ctx.stub.getTxTimestamp();
    const credentialInstance = {
      ...template,
      id: `${templateId}_${holderID}_${txTimestamp.seconds}${txTimestamp.nanos}`,
      holderID: holderID,
      expiryDate: expiryDate,
      documentHash: documentHash,
      isTemplate: false,
      assignedDate: new Date(txTimestamp.seconds * 1000 + Math.floor(txTimestamp.nanos / 1000000)).toISOString(),
      status: 'issued'
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

    if (credential.status !== 'active' && credential.status !== 'issued') {
      return JSON.stringify({ valid: false, reason: 'Credential is not active' });
    }

    // Only check expiry if expiryDate exists
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
    credential.revokedAt = new Date().toISOString();

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(credential)));
    console.log('✅ Credential revoked:', id);
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
    console.log(`Found ${results.length} credentials for holder ${holderID}`);
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
    console.log(`Found ${results.length} credentials for issuer ${issuerID}`);
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
    console.log(`Found ${allResults.length} history records for credential ${credentialId}`);
    return JSON.stringify(allResults);
  }

  // ✅ NEW: Get all templates (credentials with isTemplate: true)
  async GetCredentialTemplates(ctx, issuerID) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value) {
        const credential = JSON.parse(result.value.value.toString('utf8'));
        // Only return templates without holderID assigned
        if (credential.issuerID === issuerID && credential.isTemplate === true && credential.holderID === '') {
          results.push(credential);
        }
      }
      result = await iterator.next();
    }

    await iterator.close();
    console.log(`Found ${results.length} templates for issuer ${issuerID}`);
    return JSON.stringify(results);
  }

  // ✅ NEW: Get all issued instances (credentials with holderID assigned)
  async GetIssuedCredentials(ctx, issuerID) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value) {
        const credential = JSON.parse(result.value.value.toString('utf8'));
        // Only return issued instances (with holderID)
        if (credential.issuerID === issuerID && credential.isTemplate === false && credential.holderID !== '') {
          results.push(credential);
        }
      }
      result = await iterator.next();
    }

    await iterator.close();
    console.log(`Found ${results.length} issued credentials for issuer ${issuerID}`);
    return JSON.stringify(results);
  }
}

module.exports = ChainCertContract;