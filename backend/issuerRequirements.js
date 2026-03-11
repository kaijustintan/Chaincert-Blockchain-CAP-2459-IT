const ISSUER_CATEGORY_REQUIREMENTS = {
  university: [
    "ched_recognition_or_government_recognition",
    "legal_personality_document",
    "board_resolution_chaincert_authorization",
    "quality_accreditation_certificate_optional"
  ],

  government: [
    "legal_creation_instrument",
    "mandate_or_function_document",
    "office_order_chaincert_authorization",
    "sample_official_credential_template"
  ],

  training_provider: [
    "sec_or_dti_registration",
    "lgu_business_permit",
    "tesda_copr_or_equivalent_program_approval",
    "program_brief_or_training_regulation_alignment"
  ],

  industry_certifier: [
    "sec_registration_or_charter",
    "industry_or_professional_recognition",
    "documented_certification_scheme_iso17024_aligned",
    "board_resolution_chaincert_and_scheme_approval"
  ]
};

const ISSUER_REQUIREMENT_METADATA = {
  // UNIVERSITY / HEI
  ched_recognition_or_government_recognition: {
    label: "CHED / Government Recognition",
    description:
      "Copy of CHED Government or Institutional Recognition, and/or program recognition, or charter/ordinance for SUCs/LUCs, confirming authority to operate and grant degrees."
  },
  legal_personality_document: {
    label: "Legal Personality Document",
    description:
      "SEC Certificate of Incorporation for private HEIs, or Republic Act/charter/ordinance establishing the HEI as a public institution."
  },
  board_resolution_chaincert_authorization: {
    label: "Board Resolution – ChainCert Authorization",
    description:
      "Governing board resolution approving participation in ChainCert and designating authorized officials to issue digital credentials."
  },
  quality_accreditation_certificate_optional: {
    label: "Quality Accreditation Certificate (Optional)",
    description:
      "Current accreditation certificate from a CHED-recognized accrediting body (e.g., PAASCU, PACUCOA, AACCUP) as a quality assurance signal."
  },

  // GOVERNMENT AGENCY / OFFICE
  legal_creation_instrument: {
    label: "Legal Creation Instrument",
    description:
      "Copy of the Republic Act, Executive Order, Administrative Order, or local ordinance formally creating the government agency or office."
  },
  mandate_or_function_document: {
    label: "Mandate / Function Document",
    description:
      "Documented mandate (e.g., enabling law provisions, administrative code, or agency charter) showing authority to issue the relevant credentials."
  },
  office_order_chaincert_authorization: {
    label: "Office Order / Memorandum – ChainCert Authorization",
    description:
      "Office Order or Memorandum designating the specific unit and officials authorized to issue credentials via ChainCert."
  },
  sample_official_credential_template: {
    label: "Sample Official Credential Template",
    description:
      "Specimen or template of the current government-issued certificate, license, or eligibility document that will be digitized."
  },

  // TRAINING PROVIDER / PRIVATE EDUCATION PROVIDER
  sec_or_dti_registration: {
    label: "SEC or DTI Registration",
    description:
      "SEC Certificate of Incorporation for corporations/partnerships, or DTI Business Name Registration for sole proprietors, matching the provider’s legal name."
  },
  lgu_business_permit: {
    label: "LGU Business / Mayor’s Permit",
    description:
      "Latest business permit from the city/municipality confirming authority to operate at the specified address."
  },
  tesda_copr_or_equivalent_program_approval: {
    label: "TESDA CoPR / Program Approval",
    description:
      "TESDA Certificate of Program Registration (CoPR) for TVET programs, or equivalent written approval/accreditation for non-TESDA programs claiming formal outcomes."
  },
  program_brief_or_training_regulation_alignment: {
    label: "Program Brief / Training Regulation Alignment",
    description:
      "Program description including learning outcomes, curriculum, assessment methods, and alignment with TESDA Training Regulations or other standards."
  },

  // INDUSTRY CERTIFIER / PROFESSIONAL CERTIFICATION BODY
  sec_registration_or_charter: {
    label: "SEC Registration or Charter",
    description:
      "SEC Certificate of Incorporation, or Republic Act/charter, establishing the certification body’s legal existence and purposes."
  },
  industry_or_professional_recognition: {
    label: "Industry / Professional Recognition",
    description:
      "Evidence of recognition by relevant industry or professional bodies (e.g., national association, PRC collaboration, international recognition)."
  },
  documented_certification_scheme_iso17024_aligned: {
    label: "Documented Certification Scheme (ISO/IEC 17024-aligned)",
    description:
      "Written certification scheme describing competence requirements, assessment methods, recertification, and governance, aligned with ISO/IEC 17024 principles."
  },
  board_resolution_chaincert_and_scheme_approval: {
    label: "Board Resolution – Scheme & ChainCert Approval",
    description:
      "Governing board resolution approving the certification scheme and authorizing issuance of credentials through ChainCert."
  },
  // for subordinates
  root_authorization_letter: {
  label: "Root Authority Authorization Letter",
  description:
    "Formal authorization letter issued by the root authority permitting the subordinate issuer to operate under its supervision and issue credentials through ChainCert."
}
};

module.exports = {
  ISSUER_CATEGORY_REQUIREMENTS,
  ISSUER_REQUIREMENT_METADATA
};

