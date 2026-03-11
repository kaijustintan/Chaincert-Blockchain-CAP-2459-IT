const couchDB = require('../couchDB_service');

const {
  ISSUER_CATEGORY_REQUIREMENTS,
  ISSUER_REQUIREMENT_METADATA
} = require('../config/issuerRequirements');

const bcrypt = require('bcryptjs');

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

      let accreditationCheck = null;
      try {
        console.log(`[ACCREDITATION] (Optional) Checking accreditation for "${orgName}"...`);
        accreditationCheck = await couchDB.checkIfOrgAccredited(orgName);
        console.log('[ACCREDITATION] Result (non-blocking):', accreditationCheck);
      } catch (accErr) {
        console.warn('[ACCREDITATION] Check failed (proceeding anyway):', accErr.message);
        accreditationCheck = null;
      }

      console.log('[HASH] Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);

      const docs = uploadedFiles.map(file => ({
        docType: String(file.fieldname || '').trim().toLowerCase(),
        originalname: file.originalname,
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
        result = await couchDB.createIssuerRegistration(issuerData, accreditationCheck);
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
        requiredDocumentsValidated: true,
        accredited: accreditationCheck?.isAccredited ?? false,
        accreditedType: accreditationCheck?.accreditedType ?? null
      });
    } catch (error) {
      console.error('Issuer registration error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
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
      return res.status(500).json({
        success: false,
        message: error.message
      });
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
      return res.status(500).json({
        success: false,
        message: error.message
      });
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
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = issuerOnboardingController;
