import { AppLanguage, NotificationEventType } from '../types';

export interface Translations {
  // Navigation / Header
  appTitle: string;
  account: string;
  availableBalance: string;
  online: string;
  offline: string;
  connecting: string;
  logout: string;
  logoutButton: string;
  languageLabel: string;

  // Tabs
  tabSendMoney: string;
  tabActivity: string;
  tabSmsInbox: string;
  tabSecurity: string;

  // Notification Center
  notificationCenter: string;
  notificationsTitle: string;
  unreadCountSuffix: string;
  markAllAsRead: string;
  noNotifications: string;
  actionRequired: string;
  reviewPayment: string;
  dismiss: string;
  justNow: string;

  // Synthetic SMS Inbox
  syntheticSmsTitle: string;
  syntheticSmsBadge: string;
  syntheticSmsSubtitle: string;
  noSmsMessages: string;
  smsSender: string;
  smsDelivered: string;

  // Event Titles
  eventTitles: Record<NotificationEventType, string>;

  // Event Message Formatters
  eventMessages: {
    paymentInitiated: (amount: string, merchant: string) => string;
    approvalRequired: (amount: string, merchant: string, caution: string) => string;
    paymentApproved: (amount: string, merchant: string) => string;
    paymentCompleted: (amount: string, merchant: string) => string;
    paymentBlocked: (amount: string, max: string) => string;
    paymentRejected: (amount: string) => string;
    limitChanged: (caution: string, max: string) => string;
  };

  // Synthetic SMS Formatters (FinGuard Bank: ...)
  smsMessages: {
    paymentInitiated: (amount: string, merchant: string) => string;
    approvalRequired: (amount: string, merchant: string) => string;
    paymentApproved: (amount: string, merchant: string) => string;
    paymentCompleted: (amount: string, merchant: string) => string;
    paymentBlocked: (amount: string, max: string) => string;
    paymentRejected: (amount: string) => string;
    limitChanged: (caution: string, max: string) => string;
  };

  // Approval Modal & Realtime Alert
  realtimeApprovalAlertTitle: string;
  realtimeApprovalAlertDesc: (amount: string, merchant: string, caution: string) => string;
  verifyPayment: string;
  verifyPaymentSubtitle: string;
  cancelPayment: string;
  cautionLimitLabel: string;
  maximumLimitLabel: string;
  enterPinLabel: string;
  verifyWithPin: string;
  useBiometric: string;
  demoPinHint: string;
  approving: string;

  // Security / Limits Tab
  transactionSafetyLimits: string;
  limitsSubtitle: string;
  cautionThresholdLabel: string;
  cautionThresholdDesc: string;
  maxLimitLabel: string;
  maxLimitDesc: string;
  saveLimitsBtn: string;
  savingLimits: string;
  limitsSavedSuccess: string;

  // Composer
  sendMoneyHeader: string;
  presetNormal: string;
  presetCaution: string;
  presetHigh: string;
  presetCritical: string;
  sendPaymentAction: (amount: string) => string;
}

export const TRANSLATIONS: Record<AppLanguage, Translations> = {
  en: {
    appTitle: 'FinGuard Pay',
    account: 'Account',
    availableBalance: 'Available Balance',
    online: 'ONLINE',
    offline: 'OFFLINE',
    connecting: 'CONNECTING',
    logout: 'Logout',
    logoutButton: 'LOG OUT OF THIS PHONE',
    languageLabel: 'Language',

    tabSendMoney: 'Send Money',
    tabActivity: 'Activity',
    tabSmsInbox: 'SMS Inbox',
    tabSecurity: 'Limits & Security',

    notificationCenter: 'Notification Center',
    notificationsTitle: 'Notifications',
    unreadCountSuffix: 'unread',
    markAllAsRead: 'Mark all as read',
    noNotifications: 'No notifications yet',
    actionRequired: 'Action Required',
    reviewPayment: 'REVIEW PAYMENT',
    dismiss: 'Dismiss',
    justNow: 'Just now',

    syntheticSmsTitle: 'Bank SMS Inbox',
    syntheticSmsBadge: 'SYNTHETIC SMS • DEMO',
    syntheticSmsSubtitle: 'Realtime transactional SMS simulated over Firestore stream',
    noSmsMessages: 'No SMS messages delivered yet',
    smsSender: 'FinGuard Bank',
    smsDelivered: 'Delivered',

    eventTitles: {
      PAYMENT_INITIATED: 'Payment Initiated',
      APPROVAL_REQUIRED: 'Payment Verification Required',
      PAYMENT_APPROVED: 'Payment Approved',
      PAYMENT_COMPLETED: 'Payment Completed',
      PAYMENT_BLOCKED: 'Payment Blocked',
      PAYMENT_REJECTED: 'Payment Cancelled',
      LIMIT_CHANGED: 'Transaction Limits Updated',
    },

    eventMessages: {
      paymentInitiated: (amount, merchant) => `Payment of ₹${amount} to ${merchant} has been initiated.`,
      approvalRequired: (amount, merchant, caution) =>
        `Payment of ₹${amount} to ${merchant} exceeds your caution limit of ₹${caution}. Explicit approval required.`,
      paymentApproved: (amount, merchant) => `Payment of ₹${amount} to ${merchant} was verified successfully.`,
      paymentCompleted: (amount, merchant) => `Payment of ₹${amount} to ${merchant} completed successfully.`,
      paymentBlocked: (amount, max) =>
        `Payment of ₹${amount} was blocked because it exceeds your maximum transaction limit of ₹${max}.`,
      paymentRejected: (amount) => `Payment request of ₹${amount} was cancelled and was not debited.`,
      limitChanged: (caution, max) =>
        `Transaction limits updated. Caution: ₹${caution} • Maximum: ₹${max}.`,
    },

    smsMessages: {
      paymentInitiated: (amount, merchant) =>
        `FinGuard Bank: Initiated payment of ₹${amount} to ${merchant}. Ref: TXN-AUTO`,
      approvalRequired: (amount, merchant) =>
        `FinGuard Bank: Payment of ₹${amount} to ${merchant} requires verification. Open FinGuard Pay to approve.`,
      paymentApproved: (amount, merchant) =>
        `FinGuard Bank: Verification received for ₹${amount} to ${merchant}. Processing transaction.`,
      paymentCompleted: (amount, merchant) =>
        `FinGuard Bank: Payment of ₹${amount} to ${merchant} completed successfully. Account debited.`,
      paymentBlocked: (amount, max) =>
        `FinGuard Bank: Payment of ₹${amount} was blocked because it exceeds your maximum transaction limit of ₹${max}.`,
      paymentRejected: (amount) =>
        `FinGuard Bank: Payment of ₹${amount} was cancelled by user. No amount debited.`,
      limitChanged: (caution, max) =>
        `FinGuard Bank: Your transaction limits have been updated. Caution: ₹${caution}, Max: ₹${max}.`,
    },

    realtimeApprovalAlertTitle: 'PAYMENT VERIFICATION REQUIRED',
    realtimeApprovalAlertDesc: (amount, merchant, caution) =>
      `₹${amount} payment to ${merchant}. Your transaction exceeds your caution limit of ₹${caution}.`,
    verifyPayment: 'VERIFY PAYMENT',
    verifyPaymentSubtitle: 'High-Value Approval Required',
    cancelPayment: 'Cancel Payment',
    cautionLimitLabel: 'Caution Limit:',
    maximumLimitLabel: 'Maximum Limit:',
    enterPinLabel: 'Enter your 4-digit banking PIN:',
    verifyWithPin: 'Verify with PIN',
    useBiometric: 'Use Biometric / Fingerprint',
    demoPinHint: '(Demo PIN: 1234)',
    approving: 'Verifying…',

    transactionSafetyLimits: 'Transaction Safety Limits',
    limitsSubtitle: 'Authoritative spending boundaries evaluated before transactions route to payment rails.',
    cautionThresholdLabel: 'Caution Threshold (Approval Required)',
    cautionThresholdDesc: 'Transactions ABOVE this threshold require explicit verification before completion.',
    maxLimitLabel: 'Maximum Transaction Limit (Hard Ceiling)',
    maxLimitDesc: 'Absolute ceiling. Amounts exceeding this value are blocked without override.',
    saveLimitsBtn: 'Save & Enforce Limits',
    savingLimits: 'Committing Limits…',
    limitsSavedSuccess: 'Transaction limits saved successfully in Firestore.',

    sendMoneyHeader: 'Instant Payment Transfer',
    presetNormal: 'Normal',
    presetCaution: 'Caution',
    presetHigh: 'High',
    presetCritical: 'Critical Demo',
    sendPaymentAction: (amount) => `SEND PAYMENT (₹${amount})`,
  },

  kn: {
    appTitle: 'ಫಿನ್‌ಗಾರ್ಡ್ ಪೇ',
    account: 'ಖಾತೆ',
    availableBalance: 'ಲಭ್ಯವಿರುವ ಬ್ಯಾಲೆನ್ಸ್',
    online: 'ಆನ್‌ಲೈನ್',
    offline: 'ಆಫ್‌ಲೈನ್',
    connecting: 'ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ',
    logout: 'ನಿರ್ಗಮಿಸಿ',
    logoutButton: 'ಈ ಫೋನ್‌ನಿಂದ ಲಾಗ್ ಔಟ್ ಮಾಡಿ',
    languageLabel: 'ಭಾಷೆ',

    tabSendMoney: 'ಹಣ ಕಳುಹಿಸಿ',
    tabActivity: 'ಚಟುವಟಿಕೆ',
    tabSmsInbox: 'SMS ಇನ್‌ಬಾಕ್ಸ್',
    tabSecurity: 'ಮಿತಿಗಳು ಮತ್ತು ಭದ್ರತೆ',

    notificationCenter: 'ಅಧಿಸೂಚನೆ ಕೇಂದ್ರ',
    notificationsTitle: 'ಅಧಿಸೂಚನೆಗಳು',
    unreadCountSuffix: 'ಓದದಿರುವ',
    markAllAsRead: 'ಎಲ್ಲವನ್ನೂ ಓದಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    noNotifications: 'ಯಾವುದೇ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ',
    actionRequired: 'ಕ್ರಮ ಅಗತ್ಯವಿದೆ',
    reviewPayment: 'ಪಾವತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ',
    dismiss: 'ವಜಾಗೊಳಿಸಿ',
    justNow: 'ಈಗಷ್ಟೇ',

    syntheticSmsTitle: 'ಬ್ಯಾಂಕ್ SMS ಇನ್‌ಬಾಕ್ಸ್',
    syntheticSmsBadge: 'ಸಿಂಥೆಟಿಕ್ SMS • ಡೆಮೊ',
    syntheticSmsSubtitle: 'ಫೈರ್‌ಸ್ಟೋರ್ ಸ್ಟ್ರೀಮ್ ಮೂಲಕ ಸಿಮ್ಯುಲೇಟ್ ಮಾಡಲಾದ ನೈಜ ಸಮಯದ SMS',
    noSmsMessages: 'ಯಾವುದೇ SMS ಸಂದೇಶಗಳು ಬಂದಿಲ್ಲ',
    smsSender: 'ಫಿನ್‌ಗಾರ್ಡ್ ಬ್ಯಾಂಕ್',
    smsDelivered: 'ತಲುಪಿಸಲಾಗಿದೆ',

    eventTitles: {
      PAYMENT_INITIATED: 'ಪಾವತಿ ಪ್ರಾರಂಭಿಸಲಾಗಿದೆ',
      APPROVAL_REQUIRED: 'ಪಾವತಿ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ',
      PAYMENT_APPROVED: 'ಪಾವತಿ ಅನುಮೋದಿಸಲಾಗಿದೆ',
      PAYMENT_COMPLETED: 'ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ',
      PAYMENT_BLOCKED: 'ಪಾವತಿಯನ್ನು ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ',
      PAYMENT_REJECTED: 'ಪಾವತಿ ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ',
      LIMIT_CHANGED: 'ವಹಿವಾಟು ಮಿತಿ ಬದಲಾಯಿಸಲಾಗಿದೆ',
    },

    eventMessages: {
      paymentInitiated: (amount, merchant) => `${merchant} ಗೆ ₹${amount} ಪಾವತಿ ಪ್ರಾರಂಭಿಸಲಾಗಿದೆ.`,
      approvalRequired: (amount, merchant, caution) =>
        `${merchant} ಗೆ ₹${amount} ಪಾವತಿಯು ನಿಮ್ಮ ಎಚ್ಚರಿಕೆ ಮಿತಿ ₹${caution} ಮೀರಿದೆ. ದೃಢೀಕರಣ ಅಗತ್ಯವಿದೆ.`,
      paymentApproved: (amount, merchant) => `${merchant} ಗೆ ₹${amount} ಪಾವತಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.`,
      paymentCompleted: (amount, merchant) => `${merchant} ಗೆ ₹${amount} ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ.`,
      paymentBlocked: (amount, max) =>
        `₹${amount} ಪಾವತಿಯನ್ನು ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ, ಏಕೆಂದರೆ ಇದು ನಿಮ್ಮ ಗರಿಷ್ಠ ಮಿತಿ ₹${max} ಅನ್ನು ಮೀರಿದೆ.`,
      paymentRejected: (amount) => `₹${amount} ಮೊತ್ತದ ಪಾವತಿ ವಿನಂತಿಯನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.`,
      limitChanged: (caution, max) =>
        `ವಹಿವಾಟು ಮಿತಿಗಳನ್ನು ನವೀಕರಿಸಲಾಗಿದೆ. ಎಚ್ಚರಿಕೆ ಮಿತಿ: ₹${caution} • ಗರಿಷ್ಠ ಮಿತಿ: ₹${max}.`,
    },

    smsMessages: {
      paymentInitiated: (amount, merchant) =>
        `ಫಿನ್‌ಗಾರ್ಡ್ ಬ್ಯಾಂಕ್: ${merchant} ಗೆ ₹${amount} ಪಾವತಿ ಪ್ರಾರಂಭಿಸಲಾಗಿದೆ. ಉಲ್ಲೇಖ: TXN-AUTO`,
      approvalRequired: (amount, merchant) =>
        `ಫಿನ್‌ಗಾರ್ಡ್ ಬ್ಯಾಂಕ್: ${merchant} ಗೆ ₹${amount} ಪಾವತಿಗೆ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ. ಅನುಮೋದಿಸಲು ಫಿನ್‌ಗಾರ್ಡ್ ಪೇ ತೆರೆಯಿರಿ.`,
      paymentApproved: (amount, merchant) =>
        `ಫಿನ್‌ಗಾರ್ಡ್ ಬ್ಯಾಂಕ್: ${merchant} ಗೆ ₹${amount} ಪಾವತಿಗೆ ಪರಿಶೀಲನೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ. ಪ್ರಕ್ರಿಯೆ ನಡೆಯುತ್ತಿದೆ.`,
      paymentCompleted: (amount, merchant) =>
        `ಫಿನ್‌ಗಾರ್ಡ್ ಬ್ಯಾಂಕ್: ${merchant} ಗೆ ₹${amount} ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ಖಾತೆಯಿಂದ ಕಡಿತಗೊಳಿಸಲಾಗಿದೆ.`,
      paymentBlocked: (amount, max) =>
        `ಫಿನ್‌ಗಾರ್ಡ್ ಬ್ಯಾಂಕ್: ₹${amount} ಪಾವತಿಯನ್ನು ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ, ಏಕೆಂದರೆ ಇದು ಗರಿಷ್ಠ ಮಿತಿ ₹${max} ಮೀರಿದೆ.`,
      paymentRejected: (amount) =>
        `ಫಿನ್‌ಗಾರ್ಡ್ ಬ್ಯಾಂಕ್: ₹${amount} ಪಾವತಿಯನ್ನು ಬಳಕೆದಾರರು ರದ್ದುಗೊಳಿಸಿದ್ದಾರೆ. ಯಾವುದೇ ಹಣ ಕಡಿತಗೊಂಡಿಲ್ಲ.`,
      limitChanged: (caution, max) =>
        `ಫಿನ್‌ಗಾರ್ಡ್ ಬ್ಯಾಂಕ್: ನಿಮ್ಮ ವಹಿವಾಟು ಮಿತಿಗಳನ್ನು ನವೀಕರಿಸಲಾಗಿದೆ. ಎಚ್ಚರಿಕೆ: ₹${caution}, ಗರಿಷ್ಠ: ₹${max}.`,
    },

    realtimeApprovalAlertTitle: 'ಪಾವತಿ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ',
    realtimeApprovalAlertDesc: (amount, merchant, caution) =>
      `${merchant} ಗೆ ₹${amount} ಪಾವತಿ. ನಿಮ್ಮ ವಹಿವಾಟು ಎಚ್ಚರಿಕೆ ಮಿತಿ ₹${caution} ಅನ್ನು ಮೀರಿದೆ.`,
    verifyPayment: 'ಪಾವತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ',
    verifyPaymentSubtitle: 'ಹೆಚ್ಚಿನ ಮೌಲ್ಯದ ಅನುಮೋದನೆ ಅಗತ್ಯವಿದೆ',
    cancelPayment: 'ಪಾವತಿಯನ್ನು ರದ್ದುಮಾಡಿ',
    cautionLimitLabel: 'ಎಚ್ಚರಿಕೆ ಮಿತಿ:',
    maximumLimitLabel: 'ಗರಿಷ್ಠ ಮಿತಿ:',
    enterPinLabel: 'ನಿಮ್ಮ 4-ಅಂಕಿಯ ಬ್ಯಾಂಕಿಂಗ್ ಪಿನ್ ನಮೂದಿಸಿ:',
    verifyWithPin: 'ಪಿನ್ ಮೂಲಕ ಪರಿಶೀಲಿಸಿ',
    useBiometric: 'ಬಯೋಮೆಟ್ರಿಕ್ / ಫಿಂಗರ್‌ಪ್ರಿಂಟ್ ಬಳಸಿ',
    demoPinHint: '(ಡೆಮೊ ಪಿನ್: 1234)',
    approving: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',

    transactionSafetyLimits: 'ವಹಿವಾಟು ಸುರಕ್ಷತಾ ಮಿತಿಗಳು',
    limitsSubtitle: 'ವಹಿವಾಟುಗಳು ಪಾವತಿ ಜಾಲಕ್ಕೆ ಹೋಗುವ ಮೊದಲು ಅಧಿಕೃತ ಮಿತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ.',
    cautionThresholdLabel: 'ಎಚ್ಚರಿಕೆ ಮಿತಿ (ಅನುಮೋದನೆ ಅಗತ್ಯವಿದೆ)',
    cautionThresholdDesc: 'ಈ ಮಿತಿಗಿಂತ ಹೆಚ್ಚಿನ ವಹಿವಾಟುಗಳಿಗೆ ಪೂರ್ಣಗೊಳಿಸುವ ಮೊದಲು ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿರುತ್ತದೆ.',
    maxLimitLabel: 'ಗರಿಷ್ಠ ವಹಿವಾಟು ಮಿತಿ (ಕಠಿಣ ಮಿತಿ)',
    maxLimitDesc: 'ಸಂಪೂರ್ಣ ಗರಿಷ್ಠ ಮಿತಿ. ಇದನ್ನು ಮೀರಿದ ಮೊತ್ತಗಳನ್ನು ತಕ್ಷಣ ನಿರ್ಬಂಧಿಸಲಾಗುತ್ತದೆ.',
    saveLimitsBtn: 'ಮಿತಿಗಳನ್ನು ಉಳಿಸಿ ಮತ್ತು ಜಾರಿಗೊಳಿಸಿ',
    savingLimits: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ…',
    limitsSavedSuccess: 'ಫೈರ್‌ಸ್ಟೋರ್‌ನಲ್ಲಿ ವಹಿವಾಟು ಮಿತಿಗಳನ್ನು ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ.',

    sendMoneyHeader: 'ತ್ವರಿತ ಪಾವತಿ ವರ್ಗಾವಣೆ',
    presetNormal: 'ಸಾಮಾನ್ಯ',
    presetCaution: 'ಎಚ್ಚರಿಕೆ',
    presetHigh: 'ಹೆಚ್ಚಿನ ಮೌಲ್ಯ',
    presetCritical: 'ಕ್ರಿಟಿಕಲ್ ಡೆಮೊ',
    sendPaymentAction: (amount) => `ಪಾವತಿ ಕಳುಹಿಸಿ (₹${amount})`,
  },
};
