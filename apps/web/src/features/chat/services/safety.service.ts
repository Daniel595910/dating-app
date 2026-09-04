/**
 * Safety Service
 * Deterministic client-side safety checks for chat messages.
 * Server remains authoritative - this is for immediate UX feedback only.
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SafetyResult {
  riskLevel: RiskLevel;
  warnings: string[];
  shouldShowWarning: boolean;
  shouldBlockTemporarily: boolean;
}

const PAYMENT_PATTERNS = [
  /send me money/i,
  /need money urgently/i,
  /buy gift cards?/i,
  /send crypto/i,
  /invest in this/i,
  /guaranteed profit/i,
  /send your bank details/i,
  /give me your card/i,
  /send me a verification code/i,
  /send your otp/i,
  /bank transfer/i,
  /wire transfer/i,
  /western union/i,
  /moneygram/i,
  /\$\d+/i,
  /naira/i,
  /₦/i,
];

const OFF_PLATFORM_PATTERNS = [
  /telegram/i,
  /whatsapp me/i,
  /send me your email/i,
  /my private number is/i,
  /message me on another app/i,
  /snapchat/i,
  /instagram dm/i,
  /kik me/i,
  /signal me/i,
  /add me on/i,
  /contact me outside/i,
];

const URGENCY_PATTERNS = [
  /urgent/i,
  /emergency/i,
  /right now/i,
  /asap/i,
  /immediately/i,
  /hurry/i,
  /quick/i,
  /fast/i,
];

const CREDENTIAL_PATTERNS = [
  /password/i,
  /passwords/i,
  /otp/i,
  /verification code/i,
  /bank pin/i,
  /card security code/i,
  /cvv/i,
  /private key/i,
  /recovery code/i,
  /login details/i,
];

// Email detection
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Phone number detection (international and local formats)
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g;

export const safetyService = {
  analyzeMessage(content: string): SafetyResult {
    const warnings: string[] = [];
    let score = 0;

    // Check payment patterns
    const hasPaymentRequest = PAYMENT_PATTERNS.some((pattern) => pattern.test(content));
    if (hasPaymentRequest) {
      score += 3;
      warnings.push('This message appears to request money or financial information.');
    }

    // Check off-platform migration
    const hasOffPlatform = OFF_PLATFORM_PATTERNS.some((pattern) => pattern.test(content));
    if (hasOffPlatform) {
      score += 2;
      warnings.push('This message suggests moving the conversation off-platform.');
    }

    // Check urgency
    const hasUrgency = URGENCY_PATTERNS.some((pattern) => pattern.test(content));
    if (hasUrgency) {
      score += 1;
      warnings.push('This message uses urgency which is common in scams.');
    }

    // Check credential requests
    const hasCredentialRequest = CREDENTIAL_PATTERNS.some((pattern) => pattern.test(content));
    if (hasCredentialRequest) {
      score += 2;
      warnings.push('Never share passwords, OTPs, or verification codes with anyone.');
    }

    // Check for email addresses
    const emailMatches = content.match(EMAIL_PATTERN);
    if (emailMatches && emailMatches.length > 0) {
      score += 1;
      warnings.push('Email addresses can be used to move conversations off-platform. Stay safe.');
    }

    // Check for phone numbers
    const phoneMatches = content.match(PHONE_PATTERN);
    if (phoneMatches && phoneMatches.length > 0) {
      score += 1;
      warnings.push('Phone numbers can be used to move conversations off-platform. Stay safe.');
    }

    // Determine risk level
    let riskLevel: RiskLevel = 'LOW';
    let shouldShowWarning = false;
    let shouldBlockTemporarily = false;

    if (score >= 6) {
      riskLevel = 'CRITICAL';
      shouldShowWarning = true;
      shouldBlockTemporarily = true;
    } else if (score >= 4) {
      riskLevel = 'HIGH';
      shouldShowWarning = true;
    } else if (score >= 2) {
      riskLevel = 'MEDIUM';
      shouldShowWarning = true;
    } else if (score >= 1) {
      riskLevel = 'LOW';
      shouldShowWarning = false;
    }

    return {
      riskLevel,
      warnings,
      shouldShowWarning,
      shouldBlockTemporarily,
    };
  },

  getSafetyWarning(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'CRITICAL':
        return '⚠ Safety Alert: This message contains strong scam indicators. Never send money, bank details, passwords, or verification codes to someone you met online.';
      case 'HIGH':
        return '⚠ Be careful: Never send money, bank details, passwords, verification codes, or investment payments to someone you met online.';
      case 'MEDIUM':
        return 'Stay safe: Avoid sending money or sharing sensitive personal information with people you meet online. Never share passwords, OTPs, or verification codes.';
      default:
        return '';
    }
  },
};
