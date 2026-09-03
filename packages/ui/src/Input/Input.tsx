import React from 'react';
import styles from './Input.module.css';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'textarea';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: InputType;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
}

export const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    {
      type = 'text',
      label,
      error,
      helperText,
      required = false,
      textarea = false,
      rows = 4,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const inputClasses = [
      styles.input,
      textarea ? styles.textarea : '',
      error ? styles.error : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    const ariaProps = {
      'aria-invalid': Boolean(error),
      'aria-describedby': error ? errorId : helperText ? helperId : undefined,
    };

    if (textarea) {
      return (
        <div className={styles.container}>
          {label && (
            <label htmlFor={inputId} className={styles.label}>
              {label}
              {required && <span className={styles.required}>*</span>}
            </label>
          )}
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            className={inputClasses}
            rows={rows}
            required={required}
            {...ariaProps}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
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
    }

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          id={inputId}
          type={type}
          className={inputClasses}
          required={required}
          {...ariaProps}
          {...props}
        />
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
  }
);

Input.displayName = 'Input';