/**
 * ProfileCompletionPage
 *
 * Runs immediately after signup (email or Google) for any user whose
 * profile is missing required fields. Collects gender, date of birth,
 * and one photo, saving after each step. Ends at /community.
 *
 * Required fields kept minimal on purpose: users can fill the rest
 * later from Settings / Edit Profile.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { ROUTES } from '@/config/constants';
import { ArrowLeft, User, Calendar, Camera, Check } from 'lucide-react';
import { AvatarCropper } from '@/features/profile/components/AvatarCropper';
import styles from './ProfileCompletionPage.module.css';

type Step = 'gender' | 'dob' | 'photo';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const ProfileCompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [step, setStep] = useState<Step>('gender');
  const [saving, setSaving] = useState(false);

  const [gender, setGender] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleGenderNext = async () => {
    if (!user || !gender) {
      showToast('Pick an option to continue', 'warning');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ gender })
      .eq('user_id', user.id);
    setSaving(false);

    if (error) {
      showToast(error.message || 'Could not save', 'error');
      return;
    }
    setStep('dob');
  };

  const handleDobNext = async () => {
    if (!user || !dob) {
      showToast('Enter your date of birth', 'warning');
      return;
    }

    // Basic age check: must be 18+
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    if (age < 18) {
      showToast('You must be 18 or older to use this app', 'error');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ birth_date: dob })
      .eq('user_id', user.id);
    setSaving(false);

    if (error) {
      showToast(error.message || 'Could not save', 'error');
      return;
    }
    setStep('photo');
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Pick an image file', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setCropperImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!user) return;
    setCropperImage(null);
    setUploading(true);

    try {
      const filePath = `avatar/${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, croppedBlob, {
          cacheControl: '3600',
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlData.publicUrl);
      showToast('Photo saved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = async () => {
    await refreshUser();
    navigate(ROUTES.COMMUNITY, { replace: true });
  };

  return (
    <div className={styles.page}>
      {cropperImage && (
        <AvatarCropper
          imageSrc={cropperImage}
          onCropComplete={handleCroppedImage}
          onCancel={() => setCropperImage(null)}
        />
      )}

      <header className={styles.header}>
        {step !== 'gender' && (
          <button
            className={styles.headerButton}
            onClick={() => {
              if (step === 'dob') setStep('gender');
              else if (step === 'photo') setStep('dob');
            }}
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div className={styles.progress}>
          <div className={`${styles.progressDot} ${step === 'gender' ? styles.progressDotActive : styles.progressDotDone}`} />
          <div className={`${styles.progressDot} ${step === 'dob' ? styles.progressDotActive : step === 'photo' ? styles.progressDotDone : ''}`} />
          <div className={`${styles.progressDot} ${step === 'photo' ? styles.progressDotActive : ''}`} />
        </div>
      </header>

      {step === 'gender' && (
        <div className={styles.content}>
          <div className={styles.iconWrap}><User size={28} /></div>
          <h1 className={styles.title}>How do you identify?</h1>
          <p className={styles.subtitle}>This helps us match you with the right people.</p>

          <div className={styles.optionList}>
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.option} ${gender === opt.value ? styles.optionActive : ''}`}
                onClick={() => setGender(opt.value)}
              >
                <span>{opt.label}</span>
                {gender === opt.value && <Check size={18} />}
              </button>
            ))}
          </div>

          <button
            className={styles.primaryButton}
            onClick={handleGenderNext}
            disabled={!gender || saving}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 'dob' && (
        <div className={styles.content}>
          <div className={styles.iconWrap}><Calendar size={28} /></div>
          <h1 className={styles.title}>When were you born?</h1>
          <p className={styles.subtitle}>You must be 18 or older.</p>

          <input
            type="date"
            className={styles.dateInput}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            autoFocus
          />

          <button
            className={styles.primaryButton}
            onClick={handleDobNext}
            disabled={!dob || saving}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 'photo' && (
        <div className={styles.content}>
          <div className={styles.iconWrap}><Camera size={28} /></div>
          <h1 className={styles.title}>Add a profile photo</h1>
          <p className={styles.subtitle}>This is what people see first. Choose wisely.</p>

          <div className={styles.photoPreview}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Your photo" className={styles.photoImg} />
            ) : (
              <span className={styles.photoFallback}>
                <Camera size={40} />
              </span>
            )}
            {uploading && <div className={styles.uploadOverlay}>Uploading…</div>}
          </div>

          <label className={styles.fileLabel}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />
            <span className={styles.secondaryButton}>
              {avatarUrl ? 'Change photo' : 'Choose photo'}
            </span>
          </label>

          <button
            className={styles.primaryButton}
            onClick={handleFinish}
            disabled={!avatarUrl || uploading}
          >
            {avatarUrl ? 'Finish' : 'Skip for now'}
          </button>

          <button className={styles.textButton} onClick={handleFinish}>
            Skip and finish
          </button>
        </div>
      )}
    </div>
  );
};