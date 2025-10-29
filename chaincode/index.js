'use strict';

const { Contract } = require('fabric-contract-api');

class ChainCertContract extends Contract {

    async InitLedger(ctx) {
        console.log('ChainCert chaincode initialized');
        return;
    }

    async IssueCredential(ctx, id, holderID, issuerID, credentialType, expiryDate, metadata, documentHash) {
        const exists = await this.CredentialExists(ctx, id);
        if (exists) {
            throw new Error(`Credential ${id} already exists`);
        }

        const credential = {
            id: id,
            holderID: holderID,
            issuerID: issuerID,
            credentialType: credentialType,
            issuedDate: new Date().toISOString(),
            expiryDate: expiryDate,
            status: 'active',
            metadata: metadata,
            documentHash: documentHash,
            version: 1
        };

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(credential)));
        return JSON.stringify(credential);
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

        const now = new Date();
        const expiry = new Date(credential.expiryDate);
        if (now > expiry) {
            return JSON.stringify({ valid: false, reason: 'Credential has expired' });
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

    async GetCredentialsByHolder(ctx, holderID) {
        const queryString = {
            selector: {
                holderID: holderID
            }
        };
        return await this.getQueryResult(ctx, JSON.stringify(queryString));
    }

    async GetCredentialsByIssuer(ctx, issuerID) {
        const queryString = {
            selector: {
                issuerID: issuerID
            }
        };
        return await this.getQueryResult(ctx, JSON.stringify(queryString));
    }

    async CredentialExists(ctx, id) {
        const credentialJSON = await ctx.stub.getState(id);
        return credentialJSON && credentialJSON.length > 0;
    }

    async getQueryResult(ctx, queryString) {
        const iterator = await ctx.stub.getQueryResult(queryString);
        const results = [];

        let result = await iterator.next();
        while (!result.done) {
            const credential = JSON.parse(result.value.value.toString('utf8'));
            results.push(credential);
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
            
            // FIX: Convert timestamp properly
            const seconds = res.value.timestamp.seconds;
            const nanos = res.value.timestamp.nanos;
            // Convert to milliseconds
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
