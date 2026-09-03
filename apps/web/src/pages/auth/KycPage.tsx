/**
 * KycPage Component
 * KYC verification page during registration
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { ROUTES } from '@/config/constants';
import { Button, Input } from '@dating-app/ui';
import { ImageUpload } from '@/components/common/ImageUpload';
import styles from './KycPage.module.css';

export const KycPage: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState < string > ('national_id');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Call KYC verification edge function
      const { error: kycError } = await supabase.functions.invoke('kyc-verification', {
        body: {
          user_id: user.id,
          document_type: documentType,
          document_number: documentNumber,
          full_name: fullName,
          date_of_birth: dateOfBirth,
          country,
        },
      });
      
      if (kycError) throw kycError;
      navigate(ROUTES.LOCATION);
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Identity Verification</h1>
      <p className={styles.subtitle}>
        Please provide your identification details for verification.
      </p>

      <div className={styles.form}>
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="As it appears on your ID"
          required
        />

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Document Type</label>
          <select
            className={styles.select}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="national_id">National ID</option>
            <option value="passport">Passport</option>
            <option value="drivers_license">Driver's License</option>
          </select>
        </div>

        <Input
          label="Document Number"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="Enter document number"
          required
        />

        <Input
          type="date"
          label="Date of Birth"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          required
        />

        <Input
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Your country of residence"
          required
        />

        <ImageUpload
          purpose="verification_document"
          onUpload={() => {}}
        />

        {error && <p className={styles.error}>{error}</p>}

        <Button onClick={handleSubmit} loading={loading} fullWidth>
          Submit for Verification
        </Button>
      </div>
    </div>
  );
};