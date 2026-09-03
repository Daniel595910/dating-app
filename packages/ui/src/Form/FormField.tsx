import React from 'react';
import styles from './FormField.module.css';

export interface FormFieldProps {
  label ? : string;
  required ? : boolean;
  error ? : string;
  helperText ? : string;
  children: React.ReactNode;
  htmlFor ? : string;
  className ? : string;
}

export const FormField: React.FC < FormFieldProps > = ({
  label,
  required = false,
  error,
  helperText,
  children,
  htmlFor,
  className,
}) => {
  const fieldId = htmlFor || React.useId();
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  
  const fieldClasses = [styles.field, error ? styles.hasError : '', className || '']
    .filter(Boolean)
    .join(' ');
  
  return (
    <div className={fieldClasses}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {React.isValidElement(children) &&
        React.cloneElement(children as React.ReactElement<any>, {
          id: fieldId,
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? errorId : helperText ? helperId : undefined,
        })}
      {error && (
        <p id={errorId} className={styles.errorText}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className={styles.helperText}>
          {helperText}
        </p>
      )}
    </div>
  );
};