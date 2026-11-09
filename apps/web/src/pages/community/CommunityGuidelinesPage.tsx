import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, Heart, Users, MessageCircle, AlertTriangle, Lock,
  Sparkles, MoreVertical, Headphones, MessageSquare, LifeBuoy
} from 'lucide-react';
import styles from './CommunityGuidelinesPage.module.css';

export const CommunityGuidelinesPage: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const sections = [
    { icon: Heart, title: 'Be Respectful', description: 'Treat everyone with kindness and respect. Do not harass, bully, or discriminate against others.', rules: ['No hate speech or discrimination', 'No harassment or bullying', 'No threats of violence'] },
    { icon: Shield, title: 'Stay Safe', description: 'Your safety is our priority. Never share sensitive information with people you meet online.', rules: ['Never share passwords or OTPs', 'Never send money to people you meet online', 'Never share bank details or card information', 'Report suspicious behavior immediately'] },
    { icon: Users, title: 'Be Authentic', description: 'Use your real identity. Fake profiles and impersonation are not allowed.', rules: ['Use your real photos', 'Do not impersonate others', 'One account per person', 'Complete KYC verification'] },
    { icon: MessageCircle, title: 'Keep Conversations Appropriate', description: 'Keep conversations respectful and appropriate for a dating community.', rules: ['No explicit sexual content', 'No solicitation', 'No spam or advertising', 'No off-platform scamming'] },
    { icon: AlertTriangle, title: 'Report Violations', description: 'Help us keep the community safe by reporting any violations.', rules: ['Report suspicious users', 'Report inappropriate content', 'Report scam attempts', 'Block users who make you uncomfortable'] },
    { icon: Lock, title: 'Privacy', description: 'Protect your privacy and the privacy of others.', rules: ["Do not share others' personal information", 'Do not screenshot private conversations without consent', 'Respect privacy settings'] },
  ];

  const handleSupportClick = () => {
    setMenuOpen(false);
    // Placeholder — wire this to your live chat later
    alert('Contact Customer Support — coming soon.');
  };

  const handleLiveChatClick = () => {
    setMenuOpen(false);
    // Placeholder — wire this to your live chat later
    alert('Live Chat — coming soon.');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.headerButton}
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Community Guidelines</h1>

        {/* 3-dot menu */}
        <div className={styles.menuWrapper} ref={menuRef}>
          <button
            className={styles.headerButton}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreVertical size={22} />
          </button>

          {menuOpen && (
            <div className={styles.dropdown}>
              <button className={styles.dropdownItem} onClick={handleSupportClick}>
                <LifeBuoy size={16} />
                Contact Customer Support
              </button>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} onClick={handleLiveChatClick}>
                <MessageSquare size={16} />
                Live Chat
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroIconWrap}>
            <Sparkles size={32} className={styles.heroIcon} />
          </div>
          <h2 className={styles.heroTitle}>Keep Our Community Safe</h2>
          <p className={styles.heroText}>
            These guidelines help ensure a safe and respectful environment for everyone.
          </p>
        </div>

        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconWrap}>
                  <Icon size={18} className={styles.sectionIcon} />
                </div>
                <h3 className={styles.sectionTitle}>{section.title}</h3>
              </div>
              <p className={styles.sectionDescription}>{section.description}</p>
              <ul className={styles.rulesList}>
                {section.rules.map((rule) => (
                  <li key={rule} className={styles.ruleItem}>
                    <span className={styles.ruleDot} />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div className={styles.supportCard}>
          <Headphones size={32} className={styles.supportIcon} />
          <h3 className={styles.supportTitle}>Need help?</h3>
          <p className={styles.supportText}>
            Our support team is here to help with any concerns or questions.
          </p>
          <button className={styles.supportButton} onClick={handleLiveChatClick}>
            Start Live Chat
          </button>
        </div>
      </div>
    </div>
  );
};