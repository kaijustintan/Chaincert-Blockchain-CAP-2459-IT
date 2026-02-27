// ==========================================================================================================================================================================
//                                                              index.js (chaincode)
// ==========================================================================================================================================================================

/* [ OUTLINE ]
  =====================================================================
  FILE: index.js
  TECHNICAL: Hyperledger Fabric chaincode (smart contract) for ChainCert
  TROPA: “Utak sa blockchain side” – on-chain credential logic.
  =====================================================================

  CATEGORY: SYSTEM INITIALIZATION
  - InitLedger(ctx)

  CATEGORY: CREDENTIAL TEMPLATE LIFECYCLE
  - CreateCredentialTemplate(ctx, id, issuerID, credentialType, credentialName, description, metadata)

  CATEGORY: ISSUED CREDENTIAL INSTANCES
  - IssueCredential(ctx, templateId, holderID, expiryDate)

  CATEGORY: VERIFICATION & REVOCATION
  - VerifyCredentialByID(ctx, credentialId)
  - RevokeCredential(ctx, id)

  CATEGORY: UTILITY CHECKS
  - Check_CredentialExists(ctx, id)

  CATEGORY: CREDENTIAL HISTORY / AUDIT
  - Get_CredentialTemplateOrIssuedCredentialHistory(ctx, credentialId)
  - Get_IssuerCredentialsHistory

  CATEGORY: BULK QUERIES / FILTERED LISTS
  - Get_HolderCredentials(ctx, holderID)
  - Get_IssuerCredentialTemplates(ctx, issuerID)
  - Get_IssuerIssuedCredentials(ctx, issuerID)
  - Get_AllTemplates(ctx)
  - Get_AllIssuedCredentials(ctx)
  - (any additional bulk/list functions in file)
*/


'use strict';
const { Contract } = require('fabric-contract-api');

/*
  Contract Name: ChainCertContract

  Technical:
  Main ChainCert smart contract class. Handles:
  - credential template creation,
  - issuing credentials to holders,
  - on-chain verification,
  - revocation,
  - listing by holder/issuer,
  - template vs issued separation,
  - and credential history.

  Tropang Ex:
  Ito yung “utak sa blockchain side” ng ChainCert. Lahat ng galaw ng credentials sa ledger
  (gawa template, issue sa user, revoke, history) dito dumadaan.
*/
class ChainCertContract extends Contract {

  // =========================================================================================================
  // A. SYSTEM INITIALIZATION
  // =========================================================================================================

  /*
    Function Name: InitLedger

    Tropang Ex:
    starting the chaincode lang. Walang seed data na niloload.
  */
  async InitLedger(ctx) {
    console.log('ChainCert chaincode initialized');
    return;
  }
// ==========================================================================================================================================================================

  // =========================================================================================================
  // B. CREDENTIAL TEMPLATE LIFECYCLE (NO HOLDER)
  // =========================================================================================================

  /*
    Function Name: CreateCredentialTemplate

    Technical:
    Creates a new credential template on the ledger:
    - Validates that the ID does not already exist.
    - Uses Fabric transaction timestamp as issuedDate.
    - Stores a record with isTemplate: true and empty holderID.

    Tropang Ex:
    issuer makes template and is added to its list of credentials na pwede iisue sa mga users/holders
  */
  async CreateCredentialTemplate(ctx, id, issuerID, credentialType, credentialName, description, metadata) {
    
    /* Step 1: Check if a credential template with the same ID already exists

       Technical:
       Uses Check_CredentialExists() helper to avoid overwriting an existing template/record with the same id
    */
    const exists = await this.Check_CredentialExists(ctx, id);
    if (exists) {
      throw new Error(`Credential template ${id} already exists`);
    }

    /* Step 2: Get deterministic blockchain timestamp for issuedDate

       Technical:
       Uses ctx.stub.getTxTimestamp() to ensure all peers see the same timestamp for this transaction.

       Tropang Ex / WHY? :
        On a blockchain, all endorsing peers must compute exactly the same result for the same transaction, 
        otherwise endorsement comparison fails and the transaction is rejected. Thus if magvary ng kahit konti yung time the peer will
        consider it as a different transaction, leading for it to reject it
        
        Ex: peer 1 reads transaction w time 12:45:36 seconds
            peer 2 reads transaction w time 12:45:37 seconds
            = endorsement failure, yes ganyan ka oa

        So:
        ctx.stub.getTxTimestamp()
        Fabric provides a single timestamp value for that transaction.
        All endorsing peers see the same seconds and nanos for that tx.
        That makes the timestamp deterministic (same input → same output on all peers).    
    */
    const txTimestamp = ctx.stub.getTxTimestamp();
    const issuedDate = new Date(
      txTimestamp.seconds * 1000 + Math.floor(txTimestamp.nanos / 1000000)
    ).toISOString();

    /* Step 3: Build the credential template object

       Technical:
       Creates a JSON object representing the template. Key points:
       - holderID: "" (empty, kasi template)
       - isTemplate: true
       - status: 'active'
       - includes credentialType, credentialName, description, metadata

       Tropang Ex:
       Ginagawa dito yung “blueprint” ng credential template.
    */
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

    /* Step 4: Write the template to the ledger

       Technical:
       Serializes the credential object and stores it under key = id via putState().

       Tropang Ex:
       Dito na siya talagang “sinusulat sa blockchain”.
    */
    console.log('🚀 Writing new credential template to ledger:', id);
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(credential)));
    console.log('✅ Credential template written to ledger:', id);

    /* Step 5: Return the created template as JSON string

       Technical:
       Returns the same object as a string for the client (SDK/backend).

       Tropang Ex:
       Ibinabalik lang sa caller yung bagong gawa na template para magamit sa UI / logs.
    */
    return JSON.stringify(credential);
  }
// ==========================================================================================================================================================================

  // =========================================================================================================
  // C. ISSUING CREDENTIAL TO HOLDER/USER
  // =========================================================================================================

  /*
    Function Name: IssueCredential

    Technical:
    Issues a new credential instance to a specific holder based on an existing template:
    - Loads template from ledger via templateId.
    - Uses Fabric transaction timestamp + templateId + holderID to build a deterministic ID.
    - Copies template fields and overrides:
      - id (new instance ID)
      - holderID
      - expiryDate
      - isTemplate = false
      - assignedDate
      - status = 'issued'
      - txId (transaction ID for traceability)

    Tropang Ex:
    Ito yung actual “pagbigay ng credential” sa estudyante/holder.
    Pipili ka ng template, pipili ka ng holder, tapos si chaincode gagawa ng unique 
    instance ID at magse-save sa ledger bilang issued credential.
  */
  async IssueCredential(ctx, templateId, holderID, expiryDate) {
    
    /* Step 1: Load the template from the ledger

       Technical:
       Uses getState(templateId) to retrieve the template JSON by key.
       If not found, throws error.

       Tropang Ex:
       Hinahanap muna niya yung template na gagamitin bilang base.
       Kung walang template na ganun, error kasi walang pwedeng i-issue.
    */
    const templateJSON = await ctx.stub.getState(templateId);
    if (!templateJSON || templateJSON.length === 0) {
      throw new Error(`Credential template ${templateId} does not exist`);
    }

    /* Step 2: Parse the template JSON into an object

       Technical:
       Converts the stored buffer/string into a JavaScript object.

       Tropang Ex:
       Ginagawang normal na object yung template para pwedeng i-edit at dagdagan ng holder details.
    */
    const template = JSON.parse(templateJSON.toString());
    
    /* Step 3: Get blockchain timestamp and transaction ID

       Technical:
       - ctx.stub.getTxTimestamp() for deterministic timestamp.
       - ctx.stub.getTxID() to record txId in the instance for traceability.

       Tropang Ex:
       Kumukuha ulit ng oras sa blockchain + yung ID ng transaction, para unique at traceable yung issued credential instance.
    */
    const txTimestamp = ctx.stub.getTxTimestamp();
    const txId = ctx.stub.getTxID();
    
    /* Step 4: Build the issued credential instance object

       Technical:
       - Spreads template fields (...template)
       - Overrides id with a deterministic pattern: templateId_holderID_<timestampParts>
       - Sets holderID, expiryDate, isTemplate, assignedDate, status, txId.

       Tropang Ex:
       Ito yung moment na nagiging “personalized” na yung credential:
       - Na-assign na sa specific holderID,
       - May expiryDate kung meron,
       - Marked as isTemplate = false (ibig sabihin issued na, hindi na template).
    */
      const credentialInstance = {
      // 1. Identity of this issued instance
      id: `${templateId}_${holderID}_${txTimestamp.seconds}${txTimestamp.nanos}`,

      // 2. Holder & issuer
      holderID: holderID,
      issuerID: template.issuerID,

      // 3. Core template fields
      credentialType: template.credentialType,
      credentialName: template.credentialName,
      description: template.description,

      // 4. Dates & status
      issuedDate: template.issuedDate,
      status: 'issued',
      expiryDate: expiryDate || '',
      assignedDate: new Date(
        txTimestamp.seconds * 1000 + Math.floor(txTimestamp.nanos / 1000000)
      ).toISOString(),

      // 5. Metadata & versioning
      metadata: template.metadata,
      version: template.version,
      isTemplate: false,

      // 6. Traceability
      txId: txId
    };

    /* Step 5: Write the issued credential instance to the ledger
       Technical: putState(instance.id, JSON.stringify(instance)) persists the new credential instance.
    */
    console.log('🚀 Issuing credential instance to holder:', holderID);
    console.log('📝 Instance ID:', credentialInstance.id);
    await ctx.stub.putState(credentialInstance.id, Buffer.from(JSON.stringify(credentialInstance)));
    console.log('✅ Credential instance issued to ledger:', credentialInstance.id);

    /* Step 6: Return the issued credential instance

       Technical:
       Returns the full instance JSON (as string) to the client.

       Tropang Ex:
       Ibinabalik sa backend/UI yung buong detalye ng bagong issued credential para ma-display or ma-save sa CouchDB.
    */
    return JSON.stringify(credentialInstance);
  }
// ==========================================================================================================================================================================

  // =========================================================================================================
  // D. SINGLE CREDENTIAL READ / VERIFY / REVOKE
  // =========================================================================================================

  /*
    Function Name: Get_CredentialTemplateOrIssuedCredential

    Technical:
    Retrieves a single credential (template or issued) from the ledger by its ID.
    Ex: If you call Get_CredentialTemplateOrIssuedCredential(ctx, 'template_ABC') and that key belongs to a template, you get a template.
        If you call Get_CredentialTemplateOrIssuedCredential(ctx, 'template_ABC_user123_1700000000...'), you get an issued instance.

    Tropang Ex:
    Simple “get by ID” sa blockchain. Kung alam mo yung exact ID, dito mo makukuha yung full JSON ng credential.
  */
  async Get_CredentialTemplateOrIssuedCredential(ctx, id) {

    /* Step 1: Read ledger state by key (id)
       Technical: Uses getState(id) to fetch the associated value (if any).
    */
    const credentialJSON = await ctx.stub.getState(id);
    if (!credentialJSON || credentialJSON.length === 0) {
      throw new Error(`Credential ${id} does not exist`);
    }

    /* Step 2: Return raw string JSON

       Technical:
       Returns the stored byte buffer as string for the client to parse.

       Tropang Ex:
       Ibinabalik lang yung exact JSON string na naka-save sa ledger.
    */
    return credentialJSON.toString();
  }
// ==========================================================================================================================================================================

  /*
    Function Name: VerifyCredential

    Technical:
    On-chain verification with explicit reasons:
    - If no credential found: valid: false, reason: 'Credential not found'.
    - If status === 'revoked': valid: false, reason: 'Credential has been revoked'.
    - If expiryDate is set and has passed: valid: false, reason: 'Credential has expired'.
    - If status not 'active' or 'issued': valid: false, reason: 'Credential is not in a valid status (...)'.
    - Otherwise: valid: true with credential payload.

    Tropang Ex:
    - Does the credential to be verified exist? If yes:
      - Na-revoke na ba?
      - Expired na ba?
      - Nasa tamang status ba (active/issued)?
    - Kung pasado lahat, valid: true.
  */
  async VerifyCredential(ctx, id) {
    
    /* Step 1: Load credential by ID

       Technical:
       getState(id); if no result, return valid: false, reason: 'Credential not found'.

       Tropang Ex:
       “Hanapin mo muna kung may ganyan talagang credential sa ledger.”
    */
    const credentialJSON = await ctx.stub.getState(id);
    if (!credentialJSON || credentialJSON.length === 0) {
      return JSON.stringify({ valid: false, reason: 'Credential not found' });
    }

    /* Step 2: Parse credential object

       Technical:
       JSON.parse the stored data.

       Tropang Ex:
       Gawing JS object para madali i-check yung fields like status at expiryDate.
    */
    const credential = JSON.parse(credentialJSON.toString());

    /* Step 3: Explicit revoked check

       Technical:
       If status === 'revoked', the credential is invalid regardless of expiry date.

       Tropang Ex:
       Kapag sinabi na ng issuer na “revoked na ’to”, wala nang appeal.
       Kahit hindi pa expired sa date, dapat invalid na agad.
    */
    if (credential.status === 'revoked') {
      return JSON.stringify({
        valid: false,
        reason: 'Credential has been revoked'
      });
    }

    /* Step 4: Explicit expiry check (date-based)

       Technical:
       If expiryDate exists and now > expiryDate, credential is invalid (expired).

       Tropang Ex:
       Kahit hindi naka-mark sa status, kung lampas na sa expiryDate,
       expired na sa totoong buhay, kaya invalid din.
    */
    if (credential.expiryDate) {
      const now = new Date();
      const expiry = new Date(credential.expiryDate);
      if (now > expiry) {
        return JSON.stringify({
          valid: false,
          reason: 'Credential has expired'
        });
      }
    }

    /* Step 5: Enforce that only 'active' or 'issued' are valid statuses

       Technical:
       After filtering revoked/expired, ensure the remaining status is still acceptable.
       If status is something else (pending, draft, etc.), treat as invalid.

       Tropang Ex:
       Dito sinasabi: “Para mabilang na valid, dapat nasa malinis na state ka pa rin:
       active o issued lang. Kung pending/draft/ano pa man, hindi pa considered valid.”
    */
    if (credential.status !== 'active' && credential.status !== 'issued') {
      return JSON.stringify({
        valid: false,
        reason: `Credential is not in a valid status (${credential.status})`
      });
    }

    /* Step 6: If all checks pass, return valid: true + credential

       Technical:
       Returns a JSON with { valid: true, credential: <object> }.

       Tropang Ex:
       Kapag hindi siya not found, hindi revoked, hindi expired,
       at nasa tamang status (active/issued), dito na natin sinasabing valid na siya,
       kasama ng lahat ng details.
    */
    return JSON.stringify({ valid: true, credential: credential });
  }
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
// G. VERIFICATION LOGS (ON-CHAIN AUDIT)
// ==========================================================================================================================================================================

/*
  Function Name: LogVerification

  Technical:
  Writes a verification audit log entry to the ledger.

  - Does NOT re-verify the credential.
  - Assumes the backend already called VerifyCredential and passes the result.
  - Stores one log per transaction under key = vlog_<txId>.

  Tropang Ex:
  Tuwing may magve-verify sa UI (may name/email), puwede mong tawagin 'to
  para may naka-record sa blockchain kung:
    - anong credential ang na-check,
    - sino ang HOLDER at anong credential name,
    - ano ang naging result (valid / reason),
    - sino sa Fabric side (identity + org) ang nag-log,
    - anong oras nangyari (oras galing sa blockchain, hindi sa local PC).
*/
async LogVerification(ctx, credentialId, verifierName, verifierEmail, resultJson) {

  // Step 1: Basic validation ng input
  // Tropang Ex: Siguraduhin na may credential ID na ike-kwento sa log.
  if (!credentialId) {
    throw new Error('credentialId is required for LogVerification');
  }

  verifierName = verifierName || '';
  verifierEmail = verifierEmail || '';
  resultJson = resultJson || '';

  // Step 2: Kunin kung sino ang tumatawag sa Fabric side (X.509 identity)
  // Tropang Ex: Para alam natin kung aling org/identity ang nag-log ng verification.
  const cid = ctx.clientIdentity;
  const invokerId = cid.getID();      // unique string based on cert
  const invokerMSP = cid.getMSPID();  // e.g. Org1MSP, DLSUMSP

  // Step 3: Gumamit ng blockchain transaction time (deterministic)
  // Tropang Ex: Oras galing mismo sa Fabric, hindi sa local machine time.
  const txTime = ctx.stub.getTxTimestamp();
  const verifiedAt = new Date(
    txTime.seconds * 1000 + Math.floor(txTime.nanos / 1000000)
  ).toISOString();

  // Step 4: I-parse yung verification result na pinasa ng backend (optional)
  // Tropang Ex: Halimbawa: { "valid": true, "reason": "Credential is valid on-chain" }
  let parsedResult = null;
  try {
    if (resultJson && resultJson.length > 0) {
      parsedResult = JSON.parse(resultJson);
    }
  } catch (e) {
    parsedResult = { raw: resultJson };
  }

  // Step 4.1: Enrich log with credential details (holderID, credentialName, issuerID)
  // Tropang Ex:
  //  “Para sa logs, maganda nang kita agad kung kaninong holder at anong certificate
  //   yung na-verify, hindi lang raw credentialId string.”
  let holderID = '';
  let credentialName = '';
  let issuerID = '';

  try {
    const credJSON = await ctx.stub.getState(credentialId);
    if (credJSON && credJSON.length > 0) {
      const cred = JSON.parse(credJSON.toString());
      holderID = cred.holderID || '';
      credentialName = cred.credentialName || '';
      issuerID = cred.issuerID || '';
    }
  } catch (e) {
    console.warn(
      'LogVerification: failed to enrich with credential details',
      e.message
    );
    // best-effort lang, huwag i-fail yung log kahit pumalya ito
  }

  // Step 5: Buoin ang log object na ise-save sa ledger
  // Tropang Ex: vlog_<txId> ang ID para unique per transaction.
  const logId = `vlog_${ctx.stub.getTxID()}`;

  const log = {
    id: logId,
    type: 'verification',
    credentialId,
    // NEW enriched fields:
    holderID,
    credentialName,
    issuerID,
    verifierName,
    verifierEmail,
    result: parsedResult,
    invokerId,
    invokerMSP,
    txId: ctx.stub.getTxID(),
    verifiedAt,
    version: 1,
  };

  // Step 6: Isulat sa world state (CouchDB)
  // Tropang Ex: Para ma-query mo lahat ng verification logs sa future.
  await ctx.stub.putState(logId, Buffer.from(JSON.stringify(log)));

  // Step 7: Mag-emit ng Fabric event (optional, pang future real-time UI)
  await ctx.stub.setEvent('VerificationLogged', Buffer.from(JSON.stringify(log)));

  // Step 8: Ibalik ang log sa caller
  return JSON.stringify(log);
}
// ==========================================================================================================================================================================

async LogIssuerStatusChange(ctx, issuerEmail, previousStatus, newStatus, reason) {

  if (!issuerEmail) {
    throw new Error("issuerEmail is required");
  }

  if (!newStatus) {
    throw new Error("newStatus is required");
  }

  if (!reason || reason.trim() === "") {
    throw new Error("Reason is required for issuer status change");
  }

  const txTimestamp = ctx.stub.getTxTimestamp();
  const timestamp = new Date(
    txTimestamp.seconds * 1000 + Math.floor(txTimestamp.nanos / 1000000)
  ).toISOString();

  const txId = ctx.stub.getTxID();

  const logId = `issuer_status_${txId}`;

  const log = {
    id: logId,
    type: "issuer_status_change",
    entity: "issuer",
    issuerEmail,
    previousStatus: previousStatus || "",
    newStatus,
    reason,
    performedBy: ctx.clientIdentity.getID(),
    performedByMSP: ctx.clientIdentity.getMSPID(),
    txId,
    timestamp,
    version: 1
  };

  await ctx.stub.putState(logId, Buffer.from(JSON.stringify(log)));

  await ctx.stub.setEvent("IssuerStatusChanged", Buffer.from(JSON.stringify(log)));

  return JSON.stringify(log);
}
// ==========================================================================================================================================================================

async LogUserStatusChange(ctx, userEmail, previousStatus, newStatus, reason) {

  if (!userEmail) {
    throw new Error("userEmail is required");
  }

  if (!newStatus) {
    throw new Error("newStatus is required");
  }

  if (!reason || reason.trim() === "") {
    throw new Error("Reason is required for user status change");
  }

  const txTimestamp = ctx.stub.getTxTimestamp();
  const timestamp = new Date(
    txTimestamp.seconds * 1000 + Math.floor(txTimestamp.nanos / 1000000)
  ).toISOString();

  const txId = ctx.stub.getTxID();

  const logId = `user_status_${txId}`;

  const log = {
    id: logId,
    type: "user_status_change",
    entity: "user",
    userEmail,
    previousStatus: previousStatus || "",
    newStatus,
    reason,
    performedBy: ctx.clientIdentity.getID(),
    performedByMSP: ctx.clientIdentity.getMSPID(),
    txId,
    timestamp,
    version: 1
  };

  await ctx.stub.putState(logId, Buffer.from(JSON.stringify(log)));

  await ctx.stub.setEvent("UserStatusChanged", Buffer.from(JSON.stringify(log)));

  return JSON.stringify(log);
}
// ==========================================================================================================================================================================

async GetIssuerStatusLogs(ctx, issuerEmail) {

  if (!issuerEmail) {
    throw new Error("issuerEmail is required");
  }

  const iterator = await ctx.stub.getStateByRange('', '');
  const results = [];

  let res = await iterator.next();
  while (!res.done) {
    if (res.value && res.value.value) {
      const parsed = JSON.parse(res.value.value.toString('utf8'));

      if (
        parsed.type === "issuer_status_change" &&
        parsed.issuerEmail === issuerEmail
      ) {
        results.push(parsed);
      }
    }
    res = await iterator.next();
  }

  await iterator.close();

  return JSON.stringify(results);
}
// ==========================================================================================================================================================================

async GetUserStatusLogs(ctx, userEmail) {

  if (!userEmail) {
    throw new Error("userEmail is required");
  }

  const iterator = await ctx.stub.getStateByRange('', '');
  const results = [];

  let res = await iterator.next();
  while (!res.done) {
    if (res.value && res.value.value) {
      const parsed = JSON.parse(res.value.value.toString('utf8'));

      if (
        parsed.type === "user_status_change" &&
        parsed.userEmail === userEmail
      ) {
        results.push(parsed);
      }
    }
    res = await iterator.next();
  }

  await iterator.close();

  return JSON.stringify(results);
}
// ==========================================================================================================================================================================

async GetAllStatusLogs(ctx) {

  const iterator = await ctx.stub.getStateByRange('', '');
  const results = [];

  let res = await iterator.next();
  while (!res.done) {
    if (res.value && res.value.value) {
      const parsed = JSON.parse(res.value.value.toString('utf8'));

      if (
        parsed.type === "issuer_status_change" ||
        parsed.type === "user_status_change"
      ) {
        results.push(parsed);
      }
    }
    res = await iterator.next();
  }

  await iterator.close();

  return JSON.stringify(results);
}
// ==========================================================================================================================================================================

/*
  Function Name: GetVerificationLogById

  Technical:
  Retrieves a single verification log from the ledger by its ID (e.g., "vlog_<txId>").
  - Uses getState(logId) to fetch the record.
  - Throws if not found.
  - Validates that the record is indeed a verification log (type === 'verification').

  Tropang Ex:
  Kapag alam mo na yung exact vlog ID galing sa LogVerification (yung "id" field sa payload),
  dito mo makukuha yung buong detalye ng log na yun para ma-check sa UI/API.
*/
async GetVerificationLogById(ctx, logId) {

  /* Step 1: Basic input validation

     Tropang Ex:
     “Siguraduhin muna na may ID tayong hahanapin.”
  */
  if (!logId) {
    throw new Error('logId is required for GetVerificationLogById');
  }

  console.log('🔎 Fetching verification log by ID:', logId);

  /* Step 2: Read ledger state by key (logId)

     Technical:
     Uses ctx.stub.getState(logId).
  */
  const logJSON = await ctx.stub.getState(logId);
  if (!logJSON || logJSON.length === 0) {
    throw new Error(`Verification log with id ${logId} does not exist`);
  }

  /* Step 3: Parse and validate that this is a verification log

     Tropang Ex:
     “Double-check na hindi ibang klase ng record ‘to (e.g., credential),
      dapat type === 'verification'.”
  */
  const log = JSON.parse(logJSON.toString());

  if (log.type !== 'verification') {
    throw new Error(
      `State with id ${logId} is not a verification log (type = ${log.type})`
    );
  }

  /* Step 4: Return the log as JSON string

     Technical:
     Returns the raw log object as JSON string for the client to parse.

     Tropang Ex:
     Ibinabalik yung buong log para pwedeng i-display sa dashboard o i-store sa backend.
  */
  return JSON.stringify(log);
}
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
/*
  Function Name: GetAllVerificationLogs

  Technical:
  Retrieves all verification logs stored in the world state.
  - Scans all keys using getStateByRange('', '').
  - Parses each value as JSON.
  - Filters records where type === 'verification'.
  - Returns an array of log objects.

  Tropang Ex:
  Ito yung pang-“audit view” ng lahat ng verification attempts na na-log sa blockchain.
  Makikita mo dito lahat ng:
  - credentialId na na-check,
  - HOLDER ID at credentialName (kung na-enrich),
  - result (valid / reason),
  - verifierName / verifierEmail,
  - Fabric identity (invokerMSP, invokerId),
  - at oras (verifiedAt).
*/
async GetAllVerificationLogs(ctx) {

  /* Step 1: Open iterator over all keys in this chaincode namespace

     Technical:
     Uses getStateByRange('', '') to iterate through entire world state.
  */
  console.log('📜 Fetching ALL verification logs from world state...');

  const iterator = await ctx.stub.getStateByRange('', '');
  const results = [];

  /* Step 2: Loop through all records and filter only verification logs

     Tropang Ex:
     “Dadaan sa lahat ng entries, tapos kukunin lang yung may type === 'verification'.”
  */
  let res = await iterator.next();
  while (!res.done) {
    if (res.value && res.value.value) {
      try {
        const raw = res.value.value.toString('utf8');
        const parsed = JSON.parse(raw);

        // Only keep verification log entries
        if (parsed.type === 'verification') {
          results.push(parsed);
        }
      } catch (err) {
        console.warn(
          '⚠️ Failed to parse state value as JSON, skipping. Key:',
          res.value.key,
          'Error:',
          err
        );
      }
    }

    res = await iterator.next();
  }

  /* Step 3: Close iterator and log count

     Technical:
     Closes iterator and logs how many logs were found.
  */
  await iterator.close();
  console.log(`✅ Found ${results.length} verification logs in world state`);

  /* Step 4: Return logs as JSON string

     Technical:
     Returns JSON.stringify(arrayOfLogs).

     Tropang Ex:
     Ibinabalik lahat ng verification logs para ma-render sa UI
     bilang list / table ng lahat ng verification events.
  */
  return JSON.stringify(results);
}
// ==========================================================================================================================================================================
  /*
    Function Name: RevokeCredential

    Technical:
    Revokes a credential by ID:
    - Loads credential from ledger.
    - Sets status = 'revoked'.
    - Adds revokedAt timestamp (ISO string).
    - Writes updated record back.

    Tropang Ex:
    Ito yung opisyal na “pag-disable” ng credential sa ledger. Pag na-revoke na, hindi na siya dapat pumasa sa verification.
  */
  async RevokeCredential(ctx, id, rejectionReason) {

  /* Step 1: Load credential from ledger

     Tropang Ex:
     “Hanapin muna yung credential na gusto mong i-revoke.”
  */
  const credentialJSON = await ctx.stub.getState(id);
  if (!credentialJSON || credentialJSON.length === 0) {
    throw new Error(`Credential ${id} does not exist`);
  }

  /* Step 2: Parse and update status to revoked (DETERMINISTIC TIME)

     Technical:
     - JSON.parse
     - credential.status = 'revoked'
     - credential.revokedAt uses ctx.stub.getTxTimestamp() so all peers compute the same value.

     Tropang Ex:
     Binabago niya yung status ng credential to 'revoked' at nilalagyan ng oras kung kailan siya na‑revoke,
     gamit yung oras galing sa mismong blockchain transaction (pare‑pareho sa lahat ng peers).
  */
  const credential = JSON.parse(credentialJSON.toString());

  const txTimestamp = ctx.stub.getTxTimestamp();
  const revokedAt = new Date(
    txTimestamp.seconds * 1000 + Math.floor(txTimestamp.nanos / 1000000)
  ).toISOString();

  // Instead of mutating and re‑stringify as‑is (na pwedeng iba ang field order per peer),
  // buuin natin ulit sa canonical / fixed field order para deterministic ang ProposalResponsePayload.
  const updatedCredential = {
    id: credential.id,
    holderID: credential.holderID,
    issuerID: credential.issuerID,
    credentialType: credential.credentialType,
    credentialName: credential.credentialName,
    description: credential.description,
    issuedDate: credential.issuedDate,
    status: 'revoked',
    expiryDate: credential.expiryDate || '',
    assignedDate: credential.assignedDate,
    metadata: credential.metadata,
    version: credential.version,
    isTemplate: credential.isTemplate,
    txId: credential.txId,
    revokedAt: revokedAt,
    rejectionReason: rejectionReason || ''  // - polo
  };

  /* Step 3: Write updated credential back to ledger

     Technical:
     putState(id, JSON.stringify(credential)).
  */
  await ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedCredential)));
  console.log('✅ Credential revoked:', id);

  /* Step 4: Return the updated credential

     Technical:
     Returns JSON string with revoked status.

     Tropang Ex:
     Ibinabalik sa caller yung bagong version ng credential na may revoked flag.
  */
  return JSON.stringify(updatedCredential);
}


// ==========================================================================================================================================================================

  // =========================================================================================================
  // E. UTILITY CHECKS
  // =========================================================================================================

  /*
    Function Name: Check_CredentialExists

    Technical:
    Returns true if credential exists, false otherwise.

    Tropang Ex:
    Parang “ping” kung may record sa key na ’to. Convenient check bago gumawa ng bago o mag-update.
  */
  async Check_CredentialExists(ctx, id) {
    
    /* Step 1: Read state by key
       Tropang Ex:
       Simple check lang: “May nakasave ba dito o wala?”
    */
    const credentialJSON = await ctx.stub.getState(id);

    /* Step 2: Return boolean based on buffer presence

       Technical:
       Returns true if buffer exists & length > 0.

       Tropang Ex:
       True kung may laman talaga, false kung wala.
    */
    return credentialJSON && credentialJSON.length > 0;
  }
// ==========================================================================================================================================================================

  // =========================================================================================================
  // F. CREDENTIAL HISTORY / AUDIT TRAIL
  // =========================================================================================================

  /*
    Function Name: Get_CredentialTemplateOrIssuedCredentialHistory

    Technical:
    Retrieves the full history (audit trail) of a credential by its key (credentialId):
    - Uses getHistoryForKey(credentialId).
    - For each historical record, captures:
      - txId
      - timestamp (converted to ISO)
      - isDelete flag
      - value (if not deleted)

    Tropang Ex:
    Ito yung full “life story” ng credential:
    - kailan na-create,
    - kailan na-update,
    - kung na-revoke o na-delete,
    - at anong laman niya sa bawat transaction.
  */
  async Get_CredentialTemplateOrIssuedCredentialHistory(ctx, credentialId) {
    /* Step 1: Log which credential ID we are fetching history for

       Technical:
       console.log for debugging/tracing.

       Tropang Ex:
       Para lang alam sa logs kung aling credential ang minamap yung history.
    */
    console.log(`Getting history for credential: ${credentialId}`);

    /* Step 2: Open history iterator for the given key

       Technical:
       getHistoryForKey(credentialId) returns all historical values.

       Tropang Ex:
       Parang sinasabi sa ledger: “Ipakita mo lahat ng nabago tungkol sa credential na ’to.”
    */
    const historyIterator = await ctx.stub.getHistoryForKey(credentialId);
    const allResults = [];

    /* Step 3: Loop through each historical record

       Technical:
       For each history entry:
       - capture txId
       - compute timestamp from seconds + nanos
       - set isDelete flag
       - if not deleted and has value, parse it into record.value

       Tropang Ex:
       Binubuo dito yung listahan ng lahat ng versions:
       bawat transaction, anong oras, at ano yung laman noong time na ’yon.
    */
    let res = await historyIterator.next();
    while (!res.done) {
      if (res.value) {
        const record = {};
        record.txId = res.value.txId;

        // Convert protobuf timestamp to JS Date ISO string
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

    /* Step 4: Close history iterator and log record count

       Technical:
       Closes iterator and logs how many historical records were found.

       Tropang Ex:
       Tinatapos na yung pag-scan ng buong history, tapos sinasabi kung ilang versions
       ang nahanap.
    */
    await historyIterator.close();
    console.log(`Found ${allResults.length} history records for credential ${credentialId}`);

    /* Step 5: Return full history array as JSON string

       Technical:
       Returns JSON.stringify(allResults).

       Tropang Ex:
       Ibinabalik yung buong timeline/history ng credential, ready for audit UI.
    */
    return JSON.stringify(allResults);
  }

  // ==========================================================================================================================================================================

  /*
    Function Name: Get_IssuerCredentialsHistory

    Technical:
    Retrieves the complete history (audit trail) of ALL credentials for a specific issuer:
    - First queries all credentials where issuerID matches.
    - For each credential found, fetches its full history using getHistoryForKey().
    - Returns an array of credentials, each containing:
      - Credential metadata (id, name, type, current status, isTemplate flag)
      - Full history array with all transactions (txId, timestamp, isDelete, value)

    Tropang Ex:
    Ito yung "buong audit trail ng lahat ng credentials ng issuer" - whether templates or issued instances.
    Makikita lahat:
    - Kailan na-create yung template,
    - Kailan na-issue sa holder,
    - Kailan na-revoke (kung meron),
    - At anong state niya sa bawat transaction.
    
    Perfect for:
    - Compliance/audit dashboards
    - Full activity timeline ng issuer
    - Blockchain transparency verification
  */
  async Get_IssuerCredentialsHistory(ctx, issuerID) {
    
    /* Step 1: Log which issuer we are fetching history for

       Technical:
       console.log for debugging/tracing during chaincode invocation.

       Tropang Ex:
       Para alam natin sa logs kung sinong issuer ang kinukuhanan ng buong history.
    */
    console.log(`📊 Getting complete credentials history for issuer: ${issuerID}`);

    /* Step 2: Query all credentials belonging to this issuer

       Technical:
       Uses getStateByRange('', '') to iterate over all keys in the chaincode namespace.
       Filters records where credential.issuerID matches the provided issuerID.
       Collects all matching credential IDs for history retrieval.

       Tropang Ex:
       Hinahanap muna lahat ng credentials (templates + issued) na pag-aari ng issuer,
       para alam natin kung ano-anong IDs ang kukunan ng history.
    */
    const iterator = await ctx.stub.getStateByRange('', '');
    const credentialIDs = [];

    let result = await iterator.next();
    while (!result.done) {
      if (result.value) {
        try {
          const credential = JSON.parse(result.value.value.toString('utf8'));
          // Only collect credentials belonging to this issuer
          if (credential.issuerID === issuerID) {
            credentialIDs.push(credential.id);
          }
        } catch (err) {
          console.warn(`⚠️ Failed to parse credential, skipping:`, err);
        }
      }
      result = await iterator.next();
    }

    await iterator.close();
    console.log(`✅ Found ${credentialIDs.length} credentials for issuer ${issuerID}`);

    /* Step 3: Build history result array for all credentials

       Technical:
       For each credentialID found:
       - Opens a history iterator using getHistoryForKey(credentialID).
       - For each historical record:
         - Captures txId, timestamp (converted from protobuf seconds+nanos to ISO string),
           isDelete flag, and the credential value (if not deleted).
       - Extracts metadata from the most recent state:
         - credentialName, credentialType, isTemplate, currentStatus
       - Stores everything in a structured result object.

       Tropang Ex:
       Para sa bawat credential ID na nakita:
       - Kukunin yung buong kasaysayan niya (lahat ng transactions),
       - Iko-convert yung timestamp sa human-readable format,
       - Kukunin yung name/type/status para madaling maintindihan sa UI.
    */
    const allHistory = [];

    for (const credID of credentialIDs) {
      const historyIterator = await ctx.stub.getHistoryForKey(credID);
      const credHistory = [];
      
      let credentialName = '';
      let credentialType = '';
      let isTemplate = false;
      let currentStatus = '';

      let histRes = await historyIterator.next();
      while (!histRes.done) {
        if (histRes.value) {
          const record = {};
          record.txId = histRes.value.txId;

          // Convert protobuf timestamp to JS Date ISO string
          const seconds = histRes.value.timestamp.seconds;
          const nanos = histRes.value.timestamp.nanos;
          const timestamp = (seconds * 1000) + Math.floor(nanos / 1000000);
          record.timestamp = new Date(timestamp).toISOString();

          record.isDelete = histRes.value.isDelete;

          // Parse credential value if not deleted
          if (!histRes.value.isDelete && histRes.value.value) {
            try {
              const credValue = JSON.parse(histRes.value.value.toString('utf8'));
              record.value = credValue;

              // Extract metadata from the latest state (most recent record)
              if (!credentialName && credValue.credentialName) {
                credentialName = credValue.credentialName;
              }
              if (!credentialType && credValue.credentialType) {
                credentialType = credValue.credentialType;
              }
              if (credValue.hasOwnProperty('isTemplate')) {
                isTemplate = credValue.isTemplate;
              }
              if (credValue.status) {
                currentStatus = credValue.status;
              }
            } catch (err) {
              console.warn(`⚠️ Failed to parse credential value in history for ${credID}:`, err);
            }
          }

          credHistory.push(record);
        }
        histRes = await historyIterator.next();
      }

      await historyIterator.close();

      /* Step 4: Package credential with its full history

         Technical:
         Constructs a result object containing:
         - credentialId: The unique ID of the credential
         - credentialName: Human-readable name (e.g., "NARUTO Certificate")
         - credentialType: Type of credential (e.g., "Certificate", "Badge")
         - isTemplate: Boolean flag (true = template, false = issued instance)
         - currentStatus: Latest status (e.g., "active", "issued", "revoked")
         - history: Array of all historical transactions for this credential

         Tropang Ex:
         Ginagawa dito yung "summary card" ng bawat credential:
         - May pangalan, type, status ngayon,
         - Plus yung buong timeline/history niya.
      */
      if (credHistory.length > 0) {
        allHistory.push({
          credentialId: credID,
          credentialName: credentialName,
          credentialType: credentialType,
          isTemplate: isTemplate,
          currentStatus: currentStatus,
          history: credHistory
        });
      }
    }

    /* Step 5: Log total results and return as JSON string

       Technical:
       - Logs how many credentials with history were found.
       - Returns JSON.stringify(allHistory) for the client.

       Tropang Ex:
       Sinasabi kung ilang credentials ang may nakitang history,
       tapos ibinabalik lahat ng data as JSON para sa dashboard/UI.
    */
    console.log(`✅ Returning history for ${allHistory.length} credentials`);
    return JSON.stringify(allHistory);
  }

// ==========================================================================================================================================================================

// ==========================================================================================================================================================================

// =========================================================================================================
  // G. BULK QUERIES (BY HOLDER / ISSUER) | FILTERED VIEWS: TEMPLATES VS ISSUED CREDENTIALS
  // =========================================================================================================

  /*
    Function Name: Get_HolderCredentials

    Technical:
    Returns all credential records whose holderID matches the provided holderID:
    - Iterates over all ledger keys using getStateByRange('', '').
    - Parses each record and filters by credential.holderID === holderID.

    Tropang Ex:
    Ito yung pangkuha ng “lahat ng credentials ng isang user” sa blockchain side, regardless kung active, revoked, etc. (walang status filter dito).
  */
  async Get_HolderCredentials(ctx, holderID) {
   
    /* Step 1: Open an iterator over all keys

       Technical:
       getStateByRange('', '') walks all key-value pairs in this chaincode namespace.

       Tropang Ex:
       Parang sinasabi sa ledger: “Ilista mo lahat ng entries na meron ka.”
    */
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];

    /* Step 2: Loop through all results and filter by holderID

       Technical:
       - For each record, parse JSON.
       - If credential.holderID === holderID, push to results.

       Tropang Ex:
       gets credentials that are = to holderID
    */
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

    /* Step 3: Close iterator and log count
       Tropang Ex:
       closes iterator n makes a log of how many credentials were found for the holder 
    */
    await iterator.close();
    console.log(`Found ${results.length} credentials for holder ${holderID}`);

    /* Step 4: Return results as JSON string

       Technical:
       Returns JSON.stringify(arrayOfCredentials).

       Tropang Ex:
       Ibinabalik lahat ng credentials ni holder bilang array, ready for UI/backend.
    */
    return JSON.stringify(results);
  }
// ==========================================================================================================================================================================


  // ✅ NEW: Get all templates (credentials with isTemplate: true)
  /*
    Function Name: Get_IssuerCredentialTemplates

    Technical:
    Returns all credential templates for a given issuer:
    - issuerID matches,
    - isTemplate === true,
    - holderID === '' (no holder assigned).

    Tropang Ex:
    Ito yung listahan ng lahat ng template ni issuer (e.g. lahat ng klase ng diploma/badge),
    hindi pa naka-assign sa kahit sinong holder.
  */
  async Get_IssuerCredentialTemplates(ctx, issuerID) {
    /* Step 1: Open iterator over all ledger states

       Technical:
       getStateByRange('', '') pulls all credentials to filter in code.

       Tropang Ex:
       Parang hinahanap lahat ng credentials ulit, pero this time,
       pipiliin lang natin yung templates.
    */
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];

    /* Step 2: Loop and filter only template records for this issuer

       Technical:
       Condition:
       - credential.issuerID === issuerID
       - credential.isTemplate === true
       - credential.holderID === ''

       Tropang Ex:
       Pinipili lang yung records na:
       - gawa ng issuer na ito,
       - naka-flag as template,
       - at wala pang naka-assign na holder.
    */
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

    /* Step 3: Close iterator and log number of templates

       Technical:
       Closes iterator and logs count.

       Tropang Ex:
       Tinatapos yung pag-scan at sinasabi kung ilang templates ang nakita para sa issuer.
    */
    await iterator.close();
    console.log(`Found ${results.length} templates for issuer ${issuerID}`);

    /* Step 4: Return templates as JSON string

       Technical:
       Returns JSON.stringify(results).

       Tropang Ex:
       Ibinabalik sa caller yung buong listahan ng templates na pwedeng i-display sa dashboard.
    */
    return JSON.stringify(results);
  }
// ==========================================================================================================================================================================

  /*
    Function Name: Get_IssuerIssuedCredentials

    Technical:
    Returns all issued (non-template) credentials for a given issuer:
    - issuerID matches,
    - isTemplate === false,
    - holderID !== '' (has a holder assigned).

    Tropang Ex:
    Ito naman yung listahan ng lahat ng credentials na na-issue na talaga ni issuer
    sa mga holders (students, etc.).
  */
  async Get_IssuerIssuedCredentials(ctx, issuerID) {
    /* Step 1: Open iterator over all ledger states

       Technical:
       getStateByRange('', '') to scan all credentials, filter in code.

       Tropang Ex:
       Kukuha ulit ng lahat ng credentials, pero this time, pipiliin lang yung issued.
    */
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];

    /* Step 2: Loop and filter issued instances for this issuer

       Technical:
       Condition:
       - credential.issuerID === issuerID
       - credential.isTemplate === false
       - credential.holderID !== ''

       Tropang Ex:
       Pinipili lang yung credentials na:
       - galing sa issuer na ito,
       - hindi na template (isTemplate = false),
       - at naka-assign na sa isang holder (holderID may laman).
    */
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

    /* Step 3: Close iterator and log count of issued credentials

       Technical:
       Closes iterator and logs count.

       Tropang Ex:
       Tinatapos scanning at naglo-log kung ilang issued credentials ang nakita para sa issuer.
    */
    await iterator.close();
    console.log(`Found ${results.length} issued credentials for issuer ${issuerID}`);

    /* Step 4: Return issued credentials as JSON string

       Technical:
       Returns JSON.stringify(results).

       Tropang Ex:
       Ibinabalik sa dashboard/backend yung buong listahan ng issued credentials ng issuer.
    */
    return JSON.stringify(results);
  }

      // =========================================================================================================
    // ADMIN AUDIT: ISSUER APPROVAL
    // =========================================================================================================
    async LogIssuerApproval(ctx, issuerId, issuerEmail, orgName, reason) {

      if (!issuerId) throw new Error("issuerId is required");
      if (!issuerEmail) throw new Error("issuerEmail is required");
      if (!orgName) throw new Error("orgName is required");
      if (!reason || reason.trim() === "") {
        throw new Error("Reason is required for issuer approval");
      }

      const txTimestamp = ctx.stub.getTxTimestamp();
      const timestamp = new Date(
        txTimestamp.seconds * 1000 +
        Math.floor(txTimestamp.nanos / 1000000)
      ).toISOString();

      const txId = ctx.stub.getTxID();
      const logId = `issuer_approval_${txId}`;

      const log = {
        id: logId,
        type: "issuer_decision",
        decision: "approved",
        entity: "issuer",
        issuerId,
        issuerEmail,
        orgName,
        reason,
        performedBy: ctx.clientIdentity.getID(),
        performedByMSP: ctx.clientIdentity.getMSPID(),
        txId,
        timestamp,
        version: 1
      };

      await ctx.stub.putState(logId, Buffer.from(JSON.stringify(log)));
      await ctx.stub.setEvent("IssuerApproved", Buffer.from(JSON.stringify(log)));

      return JSON.stringify(log);
    }

    // =========================================================================================================
// ADMIN AUDIT: ISSUER REJECTION
// =========================================================================================================
      async LogIssuerRejection(ctx, issuerId, issuerEmail, orgName, reason) {

        if (!issuerId) throw new Error("issuerId is required");
        if (!issuerEmail) throw new Error("issuerEmail is required");
        if (!orgName) throw new Error("orgName is required");
        if (!reason || reason.trim() === "") {
          throw new Error("Reason is required for issuer rejection");
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(
          txTimestamp.seconds * 1000 +
          Math.floor(txTimestamp.nanos / 1000000)
        ).toISOString();

        const txId = ctx.stub.getTxID();
        const logId = `issuer_rejection_${txId}`;

        const log = {
          id: logId,
          type: "issuer_decision",
          decision: "rejected",
          entity: "issuer",
          issuerId,
          issuerEmail,
          orgName,
          reason,
          performedBy: ctx.clientIdentity.getID(),
          performedByMSP: ctx.clientIdentity.getMSPID(),
          txId,
          timestamp,
          version: 1
        };

        await ctx.stub.putState(logId, Buffer.from(JSON.stringify(log)));
        await ctx.stub.setEvent("IssuerRejected", Buffer.from(JSON.stringify(log)));

        return JSON.stringify(log);
      }

      // =========================================================================================================
// QUERY: Get issuer approval/rejection logs (filtered by email)
// =========================================================================================================
      async GetIssuerDecisionLogs(ctx, issuerEmail) {

        if (!issuerEmail) {
          throw new Error("issuerEmail is required");
        }

        const iterator = await ctx.stub.getStateByRange('', '');
        const results = [];

        let res = await iterator.next();
        while (!res.done) {
          if (res.value && res.value.value) {

            const parsed = JSON.parse(res.value.value.toString('utf8'));

            if (
              parsed.type === "issuer_decision" &&
              parsed.issuerEmail === issuerEmail
            ) {
              results.push(parsed);
            }
          }
          res = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(results);
      }
}

module.exports = ChainCertContract;
