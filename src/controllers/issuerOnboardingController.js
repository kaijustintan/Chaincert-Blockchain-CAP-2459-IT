// issuerOnboardingController.js
/*
  FILE: issuerOnboardingController.js
  LAYMAN (Tropang Ex): Ito yung "registration desk" ng mga issuer (paaralan, ahensya, training
  provider, atbp.). Dito sila nag-aapply, dito kinukuha kung anong mga dokumento ang kailangan
  base sa kategorya nila, dito tinitingnan/binubuksan ang na-upload nilang dokumento (admin, ang
  mismong applicant, o ang root authority nila lang ang may access), at dito rin nanggagaling ang
  PUBLIC na listahan ng root authorities (para sa sign-up form) at ang public issuer directory.

  TECHNICAL: Express controller for issuer onboarding. registerIssuer is the heavy handler:
  validates fields/category/issuerType, dedupes by email, enforces the category-driven required-docs
  list (+ root_authorization_letter for subordinates), runs M7 magic-number PDF validation + M8
  password strength, bcrypt-hashes the password, persists via couchDB.createIssuerRegistration, then
  fans out best-effort notifications/emails (admin team, chosen root authority, applicant). Document
  handlers enforce a 3-way access rule (admin OR the applicant issuer OR the subordinate's assigned
  root authority). Public list endpoints expose ONLY id+orgName+type (no infra fields). Errors go
  through sendServerError (M9).

  OUTLINE:
    REGISTRATION
      - registerIssuer(req,res)                    submit a pending issuer application (+docs, +emails)
    REQUIREMENTS LOOKUP
      - getIssuerRequirementsByCategory(req,res)   required-doc checklist for a category
    DOCUMENT ACCESS (admin / applicant / assigned root authority only)
      - getIssuerDocuments(req,res)                list an issuer's uploaded docs (metadata)
      - viewIssuerDocument(req,res)                stream/download one document attachment
    PUBLIC LISTS (no auth)
      - getPublicRootAuthorities(req,res)          approved root authorities for the sign-up form
      - getPublicDirectory(req,res)                public issuer directory + credibility aggregates (E)
*/

const couchDB = require('../couchDB_service');
const mailerService = require('../mailerService'); // F28: registration-pending emails

const {
  ISSUER_CATEGORY_REQUIREMENTS,
  ISSUER_REQUIREMENT_METADATA
} = require('../config/issuerRequirements');

const bcrypt = require('bcryptjs');
const { validateUploadedFile, validatePasswordStrength, sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2

const issuerOnboardingController = {
  /*
    Function Name: registerIssuer

    LAYMAN (Tropang Ex):
    Dito nag-su-submit ng application ang isang bagong issuer. Pinipili nila kung root authority ba o
    subordinate (kung subordinate, kailangan pumili ng root authority nila), mag-a-upload ng mga
    required na dokumento base sa kategorya, at gagawa ng account na "pending review" muna. Pagkatapos,
    may abiso/email sa admin, sa root authority (kung subordinate), at sa applicant mismo. HINDI pa sila
    makaka-issue hangga't hindi na-aprubahan (at, para sa subordinate, hangga't hindi pa tapos ang
    manual na Fabric setup).

    TECHNICAL:
    Multipart handler (req.files via multer). Steps: validate required fields + password match; dedupe
    email (couchDB.isEmailAlreadyUsed → 409; if a PREVIOUSLY-REJECTED doc exists it's deleted to allow
    reapply); validate issuerType ∈ {root,subordinate} and category ∈ ISSUER_CATEGORY_REQUIREMENTS; for
    subordinates require + verify rootAuthorityId against approved issuers; enforce the allowed/required
    docs set (+root_authorization_letter for subordinates); M8 password strength; M7 magic-number PDF
    validation on every file; bcrypt hash; persist via couchDB.createIssuerRegistration. Post-persist
    side-effects are best-effort: admin notification + admin/root/applicant emails (fire-and-forget) and
    an in-app notification to the root authority for subordinates. No blockchain write here — approval
    (admin/root) is where the on-chain Log* happens.

    PARAMS:
    - req — req.body { orgName, contactName, email, password, confirmPassword, issuerType,
      rootAuthorityId?, category }; req.files [{ fieldname, buffer, ... }].
    - res — Express response.

    RETURNS:
    201 { success, issuerId, issuerType, rootAuthorityId, rootAuthorityName, category,
    requiredDocumentsValidated } on success; 400 (missing/invalid fields, bad category/type, missing or
    invalid docs, weak password, non-PDF); 409 (email already used / registration exists);
    else 500 via sendServerError.

    STEPS
      Step 1 — Validate basics
        Technical : require all fields; password === confirmPassword.
      Step 2 — Dedupe email
        Technical : isEmailAlreadyUsed → 409; delete a prior REJECTED doc to permit reapplication.
      Step 3 — Validate type + category (+ resolve root authority for subordinates)
        Technical : issuerType ∈ {root,subordinate}; category in requirements map; subordinate must
                    reference an approved rootAuthorityId (captures name + email for notices).
      Step 4 — Validate documents
        Technical : reject unknown fieldnames; require the category list (+root_authorization_letter);
                    M7 magic-number check accepts PDF only.
      Step 5 — Harden + persist
        Technical : M8 password strength; bcrypt.hash; createIssuerRegistration (status pending_review /
                    pending_root_approval for subordinates).
      Step 6 — Notify (best-effort)
        Technical : admin notification + admin/root/applicant emails (fire-and-forget) + root in-app notice.

    EXAMPLE
      POST /api/issuer/register (multipart: fields + PDF docs)
      → 201 { success:true, issuerId:"issuer_…", issuerType:"subordinate", category:"university", ... }
      → 409 { success:false, message:"Email is already registered in the system." }
  */
  registerIssuer: async (req, res) => {
    try {
      const {
        orgName,
        contactName,
        email,
        password,
        confirmPassword,
        issuerType,
        rootAuthorityId,
        category
      } = req.body;

      if (!orgName || !contactName || !email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const dupCheck = await couchDB.isEmailAlreadyUsed(normalizedEmail);
      if (dupCheck?.exists) {
        return res.status(409).json({
          success: false,
          message: 'Email is already registered in the system.',
          where: dupCheck.where
        });
      }

      if (dupCheck?.previouslyRejected && dupCheck?.rejectedDocId && dupCheck?.rejectedDocRev) {
        await couchDB.deleteIssuerDoc(dupCheck.rejectedDocId, dupCheck.rejectedDocRev);
      }

      const normalizedIssuerType = String(issuerType || 'root').trim().toLowerCase();
      if (!['root', 'subordinate'].includes(normalizedIssuerType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid issuerType. Must be 'root' or 'subordinate'."
        });
      }

      const normalizedCategory = String(category || '').trim().toLowerCase();

      if (!normalizedCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category is required.'
        });
      }

      if (!ISSUER_CATEGORY_REQUIREMENTS[normalizedCategory]) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category selected.'
        });
      }

      let rootAuthorityName = null;
      let rootAuthorityEmail = null; // F28: captured for the subordinate-pending email

      if (normalizedIssuerType === 'subordinate') {
        if (!rootAuthorityId) {
          return res.status(400).json({
            success: false,
            message: 'rootAuthorityId is required when issuerType is subordinate.'
          });
        }

        const approved = await couchDB.getApprovedIssuers();
        const rootDoc = (approved || []).find(r => r?._id === rootAuthorityId);

        if (!rootDoc) {
          return res.status(400).json({
            success: false,
            message: 'Invalid rootAuthorityId. Must be an approved root authority issuer.'
          });
        }

        rootAuthorityName = rootDoc.orgName || rootDoc.contactName || rootDoc.email || null;
        rootAuthorityEmail = rootDoc.email || null;
      }

      const uploadedFiles = Array.isArray(req.files) ? req.files : [];
      const uploadedFieldNames = new Set(
        uploadedFiles.map(file => String(file.fieldname || '').trim().toLowerCase())
      );

      const allowedDocs = new Set([
        ...ISSUER_CATEGORY_REQUIREMENTS[normalizedCategory],
        ...(normalizedIssuerType === 'subordinate' ? ['root_authorization_letter'] : [])
      ]);

      const invalidDocs = [...uploadedFieldNames].filter(doc => !allowedDocs.has(doc));

      if (invalidDocs.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type uploaded.',
          invalidDocuments: invalidDocs
        });
      }
      const requiredDocs = [...ISSUER_CATEGORY_REQUIREMENTS[normalizedCategory]];

      if (normalizedIssuerType === 'subordinate') {
        requiredDocs.push('root_authorization_letter');
      }

      const missingDocs = requiredDocs.filter(docKey => !uploadedFieldNames.has(docKey));

      if (missingDocs.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required documents.',
          missingDocuments: missingDocs
        });
      }

      // M8 (Phase 5 hardening): enforce password strength before creating the issuer account.
      const pwCheck = validatePasswordStrength(password);
      if (!pwCheck.ok) {
        return res.status(400).json({ success: false, message: pwCheck.message });
      }

      // M7 (Phase 5 hardening): validate each uploaded document by its REAL bytes (magic number),
      // not the client-claimed type. Issuer onboarding documents (CHED/SEC/board resolutions/etc.)
      // are formal records that are always PDFs, so we accept PDF ONLY here — the narrowest allow-list
      // is the strongest (smaller attack surface). Reject the registration if any file isn't a real PDF.
      for (const file of uploadedFiles) {
        const fileCheck = validateUploadedFile(file.buffer, ['pdf']);
        if (!fileCheck.ok) {
          return res.status(400).json({
            success: false,
            message: `Document "${file.fieldname || file.originalname || 'file'}": ${fileCheck.message}`
          });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const docs = uploadedFiles.map(file => ({
        docType: String(file.fieldname || '').trim().toLowerCase(),
        // M7: neutralize path separators in the stored display name (defensive; not used as a path).
        originalname: String(file.originalname || 'document').replace(/[\\/]/g, '_').replace(/\.{2,}/g, '.'),
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer
      }));

      const issuerData = {
        orgName: String(orgName).trim(),
        contactName: String(contactName).trim(),
        email: normalizedEmail,
        password: hashedPassword,
        documents: docs,
        issuerType: normalizedIssuerType,
        rootAuthorityId: normalizedIssuerType === 'subordinate' ? rootAuthorityId : null,
        rootAuthorityName: normalizedIssuerType === 'subordinate' ? rootAuthorityName : null,
        category: normalizedCategory
      };

      let result;
      try {
        result = await couchDB.createIssuerRegistration(issuerData, null);
      } catch (err) {
        if (err.statusCode === 409) {
          return res.status(409).json({
            success: false,
            message: 'Issuer registration already exists for this email/org.',
            existing: err.details || null
          });
        }
        throw err;
      }

      try {
        await couchDB.createAdminNotification({
          category: 'issuer_registration',
          title: 'New Issuer Registration',
          message: `${issuerData.orgName} has registered and is pending approval.`,
          issuerId: result.id,
          issuerEmail: issuerData.email
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create issuer registration notification:', notificationError.message);
      }

      // F28: email the ChainCert admin team that an application is pending (best-effort).
      try {
        const adminEmails = await couchDB.getAdminEmails();
        const typeLabel = issuerData.issuerType === 'subordinate' ? 'subordinate issuer' : 'root authority issuer';
        // G3: fire-and-forget each send; the try/catch stays because getAdminEmails()
        // above is a DB read that can throw.
        for (const adminEmail of adminEmails) {
          mailerService.sendMailFireAndForget({
            to: adminEmail,
            subject: 'New ChainCert Issuer Registration Pending Approval',
            html: mailerService.renderEmail({
              heading: 'New Issuer Registration',
              bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">A new <strong>${typeLabel}</strong> has registered and is awaiting review:</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>${issuerData.orgName}</strong> &mdash; ${issuerData.email}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Open the ChainCert admin dashboard to review and approve or reject this application.</p>`
            }),
            text: `A new ${typeLabel} has registered and is pending approval: ${issuerData.orgName} (${issuerData.email}). Review it in the ChainCert admin dashboard.`
          }, '[registerIssuer]');
        }
      } catch (emailErr) {
        console.error('[registerIssuer] Admin email lookup failed (non-fatal):', emailErr?.message || emailErr);
      }

      // F28: for a subordinate, also notify its chosen root authority (best-effort).
      // G3: fire-and-forget so registration responds immediately.
      if (issuerData.issuerType === 'subordinate' && rootAuthorityEmail) {
        mailerService.sendMailFireAndForget({
          to: rootAuthorityEmail,
          subject: 'A Subordinate Issuer Is Pending Your Approval',
          html: mailerService.renderEmail({
            heading: 'Subordinate Pending Your Approval',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${issuerData.rootAuthorityName || 'Root Authority'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">A subordinate issuer, <strong>${issuerData.orgName}</strong> (${issuerData.email}), has applied under your authority and is awaiting your approval.</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Log in to ChainCert to review and approve or reject this subordinate.</p>`
          }),
          text: `A subordinate issuer (${issuerData.orgName}, ${issuerData.email}) has applied under your authority and is awaiting your approval. Log in to ChainCert to review it.`
        }, '[registerIssuer]');

        // N1: in-app notification to the ROOT AUTHORITY issuer that a subordinate is pending.
        try {
          await couchDB.createNotification({
            targetRole: 'issuer',
            issuerId: issuerData.rootAuthorityId,
            issuerEmail: rootAuthorityEmail,
            category: 'subordinate_pending',
            title: 'A subordinate is pending your approval',
            message: `${issuerData.orgName} (${issuerData.email}) applied under your authority and is awaiting your approval.`
          });
        } catch (e) { console.warn('[ISSUER NOTIFICATION] subordinate-pending:', e.message); }
      }

      // REG3 + F28: confirm to the APPLICANT that their application was received and is
      // pending review. Fire-and-forget (G3). Applicant is an issuer account (test
      // address in the demo), so realRecipient is left unset → routes to the central
      // inbox while SMTP_OVERRIDE_TO is set; in production it reaches the real applicant.
      const nextStep = issuerData.issuerType === 'subordinate'
        ? 'Your application will first be reviewed by your root authority, then by the ChainCert administration team.'
        : 'Your application will be reviewed by the ChainCert administration team.';
      mailerService.sendMailFireAndForget({
        to: issuerData.email,
        subject: 'We Received Your ChainCert Issuer Application',
        html: mailerService.renderEmail({
          heading: 'Application Received',
          bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${issuerData.orgName || issuerData.contactName || 'Applicant'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Thank you for registering as an issuer on ChainCert. Your application has been <strong>received</strong> and is now <strong>pending review</strong>.</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">${nextStep}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">You will be notified by email once a decision is made. No action is needed from you in the meantime.</p>`
        }),
        text: `Dear ${issuerData.orgName || issuerData.contactName || 'Applicant'},\n\nThank you for registering as an issuer on ChainCert. Your application has been received and is now pending review.\n${nextStep}\n\nYou will be notified once a decision is made.`
      }, '[registerIssuer]');

      return res.status(201).json({
        success: true,
        message: 'Issuer registration submitted successfully (pending approval)',
        issuerId: result.id,
        issuerType: issuerData.issuerType,
        rootAuthorityId: issuerData.rootAuthorityId,
        rootAuthorityName: issuerData.rootAuthorityName,
        category: issuerData.category,
        requiredDocumentsValidated: true
      });
    } catch (error) {
      console.error('Issuer registration error:', error);
      return sendServerError(res, error, 'ISSUER-ONBOARDING'); // M9
    }
  },

  /*
    Function Name: getIssuerRequirementsByCategory
    LAYMAN (Tropang Ex): Ibinibigay ang listahan ng mga dokumentong kailangan i-upload para sa isang
    kategorya (hal. university → CHED recognition, SEC/charter, board resolution). Ginagamit ng
    registration form para dynamic ang checklist.
    TECHNICAL: Lookup. Maps ISSUER_CATEGORY_REQUIREMENTS[category] → [{ key, label, description }] using
    ISSUER_REQUIREMENT_METADATA. 400 if category missing.
    PARAMS: req (req.params.category), res.
    RETURNS: 200 { success, category, requiredDocuments:[{key,label,description}] } | 400 | 500.
  */
  getIssuerRequirementsByCategory: async (req, res) => {
    try {
      const category = String(req.params.category || '').trim().toLowerCase();

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category is required.'
        });
      }

      const requirements = ISSUER_CATEGORY_REQUIREMENTS[category];

      // Guard: an unknown/misspelled category yields undefined here — return a clean 400
      // instead of letting .map() throw into a generic 500 (matches registerIssuer's guard).
      if (!requirements) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category.'
        });
      }

      const requirementDetails = requirements.map((key) => ({
        key,
        label: ISSUER_REQUIREMENT_METADATA[key]?.label || key,
        description: ISSUER_REQUIREMENT_METADATA[key]?.description || ""
      }));

        return res.status(200).json({
          success: true,
          category,
          requiredDocuments: requirementDetails
        });
    } catch (error) {
      console.error('Error fetching issuer requirements:', error);
      return sendServerError(res, error, 'ISSUER-ONBOARDING'); // M9
    }
  },

  /*
    Function Name: getIssuerDocuments
    LAYMAN (Tropang Ex): Ibinibigay ang listahan (metadata) ng mga na-upload na dokumento ng isang
    issuer. Tanging admin, ang mismong applicant, o ang root authority ng subordinate ang may access.
    TECHNICAL: Auth-gated read. Loads the issuer (404), then enforces a 3-way access rule:
    isAdmin || isApplicantIssuer (id/email match) || isAssignedRootAuthority (subordinate's
    rootAuthorityId === requester.id). Returns document metadata via couchDB.getIssuerDocuments.
    PARAMS: req (req.params.issuerId, req.user), res.
    RETURNS: 200 { success, issuerId, orgName, issuerType, rootAuthorityId, rootAuthorityName,
    documents:[], count } | 400 | 401 | 403 | 404 | 500.
  */
  getIssuerDocuments: async (req, res) => {
    try {
      const { issuerId } = req.params;

      if (!issuerId) {
        return res.status(400).json({
          success: false,
          message: 'issuerId is required'
        });
      }

      const issuerDoc = await couchDB.getIssuerById(issuerId);
      if (!issuerDoc) {
        return res.status(404).json({
          success: false,
          message: 'Issuer not found'
        });
      }

      const requester = req.user;

      if (!requester) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const isAdmin = requester.role === 'admin';
      const isApplicantIssuer = requester.role === 'issuer' &&
        (requester.id === issuerDoc._id || requester.email === issuerDoc.email);

      const isAssignedRootAuthority = requester.role === 'issuer' &&
        String(issuerDoc.issuerType || '').toLowerCase() === 'subordinate' &&
        issuerDoc.rootAuthorityId &&
        requester.id === issuerDoc.rootAuthorityId;

      if (!isAdmin && !isApplicantIssuer && !isAssignedRootAuthority) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: you do not have access to these documents.'
        });
      }

      const documents = await couchDB.getIssuerDocuments(issuerId);

      return res.status(200).json({
        success: true,
        issuerId: issuerDoc._id,
        orgName: issuerDoc.orgName,
        issuerType: issuerDoc.issuerType || 'root',
        rootAuthorityId: issuerDoc.rootAuthorityId || null,
        rootAuthorityName: issuerDoc.rootAuthorityName || null,
        documents: documents || [],
        count: Array.isArray(documents) ? documents.length : 0
      });
    } catch (error) {
      console.error('Error fetching issuer documents:', error);
      return sendServerError(res, error, 'ISSUER-ONBOARDING'); // M9
    }
  },

  /*
    Function Name: viewIssuerDocument
    LAYMAN (Tropang Ex): Binubuksan o dino-download ang ISANG partikular na dokumento ng issuer.
    Parehong access rule sa getIssuerDocuments (admin / applicant / assigned root authority lang).
    TECHNICAL: Auth-gated stream. Same 3-way access check; finds the attachment in the issuer record
    (404 if absent), streams the bytes via couchDB.getIssuerDocumentStream, and sets Content-Type +
    Content-Disposition (inline by default, attachment when ?download=1). originalname is URL-encoded.
    PARAMS: req (req.params.issuerId, req.params.attachmentName, req.query.download?, req.user), res.
    RETURNS: 200 file bytes (with headers) | 400 | 401 | 403 | 404 | 500.
  */
  viewIssuerDocument: async (req, res) => {
    try {
      const { issuerId, attachmentName } = req.params;

      if (!issuerId || !attachmentName) {
        return res.status(400).json({
          success: false,
          message: 'issuerId and attachmentName are required'
        });
      }

      const decodedAttachmentName = decodeURIComponent(attachmentName);
      const issuerDoc = await couchDB.getIssuerById(issuerId);
      if (!issuerDoc) {
        return res.status(404).json({
          success: false,
          message: 'Issuer not found'
        });
      }

      const requester = req.user;

      if (!requester) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const isAdmin = requester.role === 'admin';
      const isApplicantIssuer = requester.role === 'issuer' &&
        (requester.id === issuerDoc._id || requester.email === issuerDoc.email);

      const isAssignedRootAuthority = requester.role === 'issuer' &&
        String(issuerDoc.issuerType || '').toLowerCase() === 'subordinate' &&
        issuerDoc.rootAuthorityId &&
        requester.id === issuerDoc.rootAuthorityId;

      if (!isAdmin && !isApplicantIssuer && !isAssignedRootAuthority) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: you do not have access to this document.'
        });
      }

      const documents = issuerDoc.documents || [];
      const targetDoc = documents.find(d => d && d.attachmentName === decodedAttachmentName);

      if (!targetDoc) {
        return res.status(404).json({
          success: false,
          message: 'Document attachment not found in issuer record.'
        });
      }

      const fileBuffer = await couchDB.getIssuerDocumentStream(issuerId, decodedAttachmentName);

      const contentType = targetDoc.mimetype || 'application/octet-stream';
      const originalname = targetDoc.originalname || decodedAttachmentName;
      const forceDownload = String(req.query.download || '0') === '1';

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `${forceDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(originalname)}"`
      );

      return res.status(200).send(fileBuffer);
    } catch (error) {
      console.error('Error viewing issuer document:', error);
      return sendServerError(res, error, 'ISSUER-ONBOARDING'); // M9
    }
  },

  /*
    Function Name: getPublicRootAuthorities
    LAYMAN (Tropang Ex): PUBLIC na listahan ng mga approved na root authority — ginagamit ng sign-up
    form ng subordinate para pumili ng parent nila, kahit wala pang account/token.
    TECHNICAL: Public read. Filters approved issuers to root/root_authority and maps to ONLY
    { id, orgName, issuerType } — never infra fields (couchDBUrl/fabricIdentity/walletId/email), which
    stay behind admin auth at GET /api/admin/approved-issuers (M2 rationale).
    PARAMS: req, res. RETURNS: 200 { success, data:[{id,orgName,issuerType}], count } | 500.
  */
  // M2 (Phase 5 hardening): PUBLIC, minimal list of approved ROOT authorities.
  // The full issuer record stays behind admin auth at GET /api/admin/approved-issuers, so locking that
  // endpoint down does not leak infrastructure details to the public sign-up page.
  getPublicRootAuthorities: async (req, res) => {
    try {
      const approved = await couchDB.getApprovedIssuers();
      const rootAuthorities = (Array.isArray(approved) ? approved : [])
        .filter((doc) => {
          const t = String(doc.issuerType || 'root').toLowerCase();
          return t === 'root' || t === 'root_authority';
        })
        .map((doc) => ({
          id: doc._id,
          orgName: doc.orgName,
          issuerType: doc.issuerType || 'root'
        }));

      return res.status(200).json({
        success: true,
        data: rootAuthorities,
        count: rootAuthorities.length
      });
    } catch (error) {
      console.error('Error fetching public root authorities:', error);
      return sendServerError(res, error, 'ISSUER-ONBOARDING'); // M9
    }
  },

  /*
    Function Name: getPublicDirectory
    LAYMAN (Tropang Ex): PUBLIC na "directory" ng mga approved na issuer + credibility stats (ilang
    public templates, ilang credentials na na-issue, atbp.) — para sa browseable issuer directory page.
    TECHNICAL: Public read. Delegates to couchDB.getPublicIssuerDirectory() (aggregates per approved
    issuer, null-safe across unprovisioned ones). Feature "E".
    PARAMS: req, res. RETURNS: 200 { success, data:[...], count } | 500 via sendServerError.
  */
  // E: PUBLIC issuer directory — approved issuers + credibility aggregates.
  getPublicDirectory: async (req, res) => {
    try {
      const data = await couchDB.getPublicIssuerDirectory();
      return res.status(200).json({ success: true, data, count: data.length });
    } catch (error) {
      console.error('Error fetching public issuer directory:', error);
      return sendServerError(res, error, 'ISSUER-ONBOARDING'); // M9
    }
  }
};

module.exports = issuerOnboardingController;
