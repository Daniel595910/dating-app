import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Heart, Users, MessageCircle, AlertTriangle, Lock, Sparkles } from 'lucide-react';

export const CommunityGuidelinesPage: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: Heart,
      title: 'Be Respectful',
      description: 'Treat everyone with kindness and respect. Do not harass, bully, or discriminate against others.',
      rules: [
        'No hate speech or discrimination',
        'No harassment or bullying',
        'No threats of violence',
      ],
    },
    {
      icon: Shield,
      title: 'Stay Safe',
      description: 'Your safety is our priority. Never share sensitive information with people you meet online.',
      rules: [
        'Never share passwords or OTPs',
        'Never send money to people you meet online',
        'Never share bank details or card information',
        'Report suspicious behavior immediately',
      ],
    },
    {
      icon: Users,
      title: 'Be Authentic',
      description: 'Use your real identity. Fake profiles and impersonation are not allowed.',
      rules: [
        'Use your real photos',
        'Do not impersonate others',
        'One account per person',
        'Complete KYC verification',
      ],
    },
    {
      icon: MessageCircle,
      title: 'Keep Conversations Appropriate',
      description: 'Keep conversations respectful and appropriate for a dating community.',
      rules: [
        'No explicit sexual content',
        'No solicitation',
        'No spam or advertising',
        'No off-platform scamming',
      ],
    },
    {
      icon: AlertTriangle,
      title: 'Report Violations',
      description: 'Help us keep the community safe by reporting any violations.',
      rules: [
        'Report suspicious users',
        'Report inappropriate content',
        'Report scam attempts',
        'Block users who make you uncomfortable',
      ],
    },
    {
      icon: Lock,
      title: 'Privacy',
      description: 'Protect your privacy and the privacy of others.',
      rules: [
        'Do not share others\' personal information',
        'Do not screenshot private conversations without consent',
        'Respect privacy settings',
      ],
    },
  ];

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#faf9f7', maxWidth: 480, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', paddingTop: 'calc(0.625rem + env(safe-area-inset-top))', backgroundColor: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#111827', padding: '0.5rem', borderRadius: '9999px', minWidth: 44, minHeight: 44 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Community Guidelines</h1>
      </header>

      <div style={{ padding: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem' }}>
            <Sparkles size={28} style={{ color: '#3b82f6' }} />
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem' }}>
            Keep Our Community Safe
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
            These guidelines help ensure a safe and respectful environment for everyone.
          </p>
        </div>

        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1rem', marginBottom: '0.75rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Icon size={18} style={{ color: '#ef4444' }} />
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                  {section.title}
                </h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                {section.description}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {section.rules.map((rule) => (
                  <li key={rule} style={{ fontSize: '0.8125rem', color: '#374151', padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};
