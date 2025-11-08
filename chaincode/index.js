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

        // ✅ FIXED: Use transaction timestamp instead of new Date()
        // This is deterministic and same across all endorsing peers
        const txTimestamp = ctx.stub.getTxTimestamp();
        const issuedDate = new Date(
            txTimestamp.seconds * 1000 + Math.floor(txTimestamp.nanos / 1000000)
        ).toISOString();

        const credential = {
            id: id,
            holderID: holderID,
            issuerID: issuerID,
            credentialType: credentialType,
            issuedDate: issuedDate,  // ← Now deterministic
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
