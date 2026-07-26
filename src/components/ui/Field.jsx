// Field.jsx
/*
  FILE: Field.jsx
  LAYMAN (Tropang Ex): Isang lugar lang para sa form inputs — label sa taas, input sa
  ilalim, tapos optional na "help" text o pulang "error" message. Dati, kada page
  may sariling istilo ng form; ngayon iisa na lang. May kasamang Input na pareho
  ang itsura kahit saan gamitin.

  TECHNICAL: Field = label + control + help/error layout over .cc-field. Input is a
  thin styled wrapper around the native element (.cc-input) so forms share focus
  rings and sizing. Errors flip .cc-input--error. (Select/Textarea wrappers were
  removed as dead code — U-7; re-add over .cc-input if a consumer appears.)

  PARAMS:
  - Field: label, htmlFor, required (bool), help, error, children.
  - Input: error (bool) + native props (...rest).

  RETURNS: accessible labelled form controls.
*/
import React from 'react';
import { AlertCircle } from 'lucide-react';

export function Field({ label, htmlFor, required = false, help, error, className = '', children }) {
  return (
    <div className={`cc-field ${className}`.trim()}>
      {label && (
        <label className="cc-label" htmlFor={htmlFor}>
          {label}{required && <span className="cc-req" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {help && !error && <span className="cc-help">{help}</span>}
      {error && <span className="cc-error"><AlertCircle size={13} aria-hidden="true" />{error}</span>}
    </div>
  );
}

export function Input({ error = false, className = '', ...rest }) {
  return <input className={`cc-input ${error ? 'cc-input--error' : ''} ${className}`.trim()} {...rest} />;
}

export default Field;
