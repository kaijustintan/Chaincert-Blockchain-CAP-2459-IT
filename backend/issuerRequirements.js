const ISSUER_CATEGORY_REQUIREMENTS = {
  university: [
    'ched_recognition',
    'sec_registration',
    'board_resolution'
  ],

  government: [
    'office_order',
    'agency_proof'
  ],

  training_provider: [
    'sec_dti',
    'business_permit',
    'program_brief'
  ],

  industry_certifier: [
    'sec_registration',
    'industry_accreditation',
    'certification_framework'
  ]
};

module.exports = ISSUER_CATEGORY_REQUIREMENTS;