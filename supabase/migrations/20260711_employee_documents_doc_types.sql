-- ============================================================
-- Expand employee_documents.doc_type check to support
-- onboarding uploads introduced after the initial schema.
-- ============================================================

ALTER TABLE employee_documents
  DROP CONSTRAINT IF EXISTS employee_documents_doc_type_check;

ALTER TABLE employee_documents
  ADD CONSTRAINT employee_documents_doc_type_check
  CHECK (doc_type IN (
    'employment_contract',
    'td1_federal',
    'td1_ab',
    'id',
    'banking_info',
    'sin_document',
    'drivers_license_front',
    'drivers_license_back',
    'other'
  ));
