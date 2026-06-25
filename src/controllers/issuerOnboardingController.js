const couchDB = require('../couchDB_service');
const mailerService = require('../mailerService'); // F28: registration-pending emails

const {
  ISSUER_CATEGORY_REQUIREMENTS,
  ISSUER_REQUIREMENT_METADATA
} = require('../config/issuerRequirements');

const bcrypt = require('bcryptjs');
const { validateUploadedFile, validatePasswordStrength, sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2

const issuerOnboardingController = {
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

      console.log('=== ISSUER REGISTRATION DEBUG START (authController) ===');
      console.log('[1] orgName:', orgName);
      console.log('[2] contactName:', contactName);
      console.log('[3] email:', email);
      console.log('[4] issuerType:', issuerType);
      console.log('[5] rootAuthorityId:', rootAuthorityId);
      console.log('[6] category:', category);

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

      console.log('[HASH] Hashing password...');
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

      console.log('[COUCHDB] Saving issuer registration (pending issuer application)...');

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

      console.log('[REGISTER ISSUER] ✅ Result:', result);
      console.log('=== ISSUER REGISTRATION DEBUG END ===\n');

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

  // M2 (Phase 5 hardening): PUBLIC, minimal list of approved ROOT authorities.
  // The registration form needs this BEFORE the user has an account/token (a subordinate issuer
  // must pick its parent root authority during sign-up). It deliberately returns ONLY id + org
  // name + type. The full issuer record — which includes internal couchDBUrl / fabricIdentity /
  // walletId / email — stays behind admin auth at GET /api/admin/approved-issuers, so locking that
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
  }
};

module.exports = issuerOnboardingController;
