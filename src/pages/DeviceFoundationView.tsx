import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../hooks/useAuth';
import {
  DEMO_IDENTITIES,
  DemoIdentity,
  QUICK_PRESETS,
  DEMO_MERCHANTS,
  QuickPreset,
} from '../data/phoneFixtures';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  Account,
  PhoneNotification,
  NotificationEventType,
  AppLanguage,
  Customer,
  Case,
} from '../types';
import {
  transactionsCol,
  accountsCol,
  auditLogsCol,
  notificationsCol,
  casesCol,
} from '../firebase/collections';
import { evaluateTransactionContext } from '../risk/riskService';
import {
  evaluateTransactionRisk,
  RiskEvaluationInput,
  RiskAssessmentResult,
} from '../risk/riskEngine';
import { SYNTHETIC_NETWORK_SIGNALS } from '../data/scenarios';
import { TRANSLATIONS } from '../data/translations';
import { doc, setDoc, updateDoc, onSnapshot, query, where, getDoc, getDocs } from 'firebase/firestore';
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
  CreditCard,
  Zap,
  ExternalLink,
  LogOut,
  User,
  ArrowRight,
  Send,
  History,
  Lock,
  Smartphone,
  Globe,
  Sliders,
  Fingerprint,
  KeyRound,
  X,
  Ban,
  Bell,
  MessageSquare,
  CheckCheck,
} from 'lucide-react';

export const DeviceFoundationView: React.FC = () => {
  const {
    deviceId,
    status,
    activeCustomerId,
    loginDemoUser,
    logoutDemoUser,
  } = useDevice();
  const { user } = useAuth();

  // 1. Language State (Persisted in localStorage)
  const [language, setLanguage] = useState<AppLanguage>(() => {
    return (localStorage.getItem('finguard_app_lang') as AppLanguage) || 'en';
  });

  const t = useMemo(() => TRANSLATIONS[language], [language]);

  const handleToggleLanguage = (newLang: AppLanguage) => {
    setLanguage(newLang);
    localStorage.setItem('finguard_app_lang', newLang);
  };

  // 2. Authenticated Identity (null if logged out)
  const activeIdentity: DemoIdentity | null = useMemo(() => {
    if (!activeCustomerId) return null;
    return DEMO_IDENTITIES[activeCustomerId] || null;
  }, [activeCustomerId]);

  // 3. Active Tab in Authenticated Banking Dashboard
  const [bankingTab, setBankingTab] = useState<'send' | 'activity' | 'sms' | 'security'>('send');

  // 4. Notifications State & Listener
  const [notifications, setNotifications] = useState<PhoneNotification[]>([]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState<boolean>(false);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const activeApprovalNotif = useMemo(
    () => notifications.find((n) => n.event_type === 'APPROVAL_REQUIRED' && n.action_required),
    [notifications]
  );

  // 5. User-Configurable Transaction Limits (Persisted in Firestore accounts/{accountId})
  const [cautionThreshold, setCautionThreshold] = useState<number>(10000);
  const [maxLimit, setMaxLimit] = useState<number>(50000);
  const [editCautionStr, setEditCautionStr] = useState<string>('10000');
  const [editMaxStr, setEditMaxStr] = useState<string>('50000');
  const [isSavingLimits, setIsSavingLimits] = useState<boolean>(false);
  const [limitSaveSuccess, setLimitSaveSuccess] = useState<string | null>(null);
  const [limitValidationError, setLimitValidationError] = useState<string | null>(null);

  // 6. Form state for Payment Composer
  const [merchantKey, setMerchantKey] = useState<string>(DEMO_MERCHANTS[0].merchant_id);
  const [amountStr, setAmountStr] = useState<string>('1500');
  const [txType, setTxType] = useState<TransactionType>('UPI');
  const [customCity, setCustomCity] = useState<string>('Bengaluru');

  // 7. Submission & Feedback state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoggingInId, setIsLoggingInId] = useState<string | null>(null);
  const [lastSubmittedTxn, setLastSubmittedTxn] = useState<{
    id: string;
    amount: number;
    merchant: string;
    timestamp: string;
    status: TransactionStatus;
    blockedReason?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 8. Approval Modal State for APPROVAL_REQUIRED Transactions
  const [pendingApproval, setPendingApproval] = useState<{
    txnId: string;
    amount: number;
    merchantName: string;
    snapCaution: number;
    snapMax: number;
    txnData: Transaction;
  } | null>(null);
  const [approvalPin, setApprovalPin] = useState<string>('1234');
  const [isProcessingApproval, setIsProcessingApproval] = useState<boolean>(false);
  const [biometricNotice, setBiometricNotice] = useState<string | null>(null);

  // 9. Customer-Isolated Transaction History
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);

  // 8. Listen to Firestore Account Limits for active identity
  useEffect(() => {
    if (!activeIdentity) return;

    // Reset default limits based on identity fixture
    const defaultC = activeIdentity.defaultCautionLimit || 10000;
    const defaultM = activeIdentity.defaultMaxLimit || 50000;
    setCautionThreshold(defaultC);
    setMaxLimit(defaultM);
    setEditCautionStr(String(defaultC));
    setEditMaxStr(String(defaultM));
    setLimitSaveSuccess(null);
    setLimitValidationError(null);

    // Subscribe to Firestore account document
    const accRef = doc(accountsCol(), activeIdentity.accountId);
    const unsub = onSnapshot(
      accRef,
      (snap) => {
        if (snap.exists()) {
          const accData = snap.data() as Account;
          if (accData.caution_threshold && accData.caution_threshold > 0) {
            setCautionThreshold(accData.caution_threshold);
            setEditCautionStr(String(accData.caution_threshold));
          }
          if (accData.max_transaction_limit && accData.max_transaction_limit > 0) {
            setMaxLimit(accData.max_transaction_limit);
            setEditMaxStr(String(accData.max_transaction_limit));
          }
        }
      },
      (err) => {
        console.warn('[FinGuard Limits] Account listener warning:', err);
      }
    );

    return () => unsub();
  }, [activeIdentity]);

  // Sync city when identity changes
  useEffect(() => {
    if (activeIdentity) {
      setCustomCity(activeIdentity.defaultCity);
      setErrorMessage(null);
      setLastSubmittedTxn(null);
      setPendingApproval(null);
    }
  }, [activeIdentity]);

  // Real-time Firestore transaction listener scoped strictly to the authenticated customer
  useEffect(() => {
    if (!activeCustomerId) {
      setCustomerTransactions([]);
      return;
    }

    try {
      // Data Isolation: Query strictly filtered by authenticated customer_id
      const q = query(transactionsCol(), where('customer_id', '==', activeCustomerId));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const txs: Transaction[] = [];
          snap.forEach((d) => {
            txs.push({ ...d.data(), id: d.id } as Transaction);
          });
          // In-memory sort by timestamp descending
          txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setCustomerTransactions(txs.slice(0, 15));
        },
        (err) => {
          console.warn('[FinGuard Phone] Customer transaction listener warning:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('[FinGuard Phone] Query error:', e);
    }
  }, [activeCustomerId]);

  // Real-time Firestore notification listener strictly targeted to activeCustomerId
  useEffect(() => {
    if (!activeCustomerId) {
      setNotifications([]);
      return;
    }

    try {
      const q = query(notificationsCol(), where('customer_id', '==', activeCustomerId));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const notifs: PhoneNotification[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (data.event_type && data.customer_id) {
              notifs.push({ ...data, notification_id: d.id, id: d.id } as PhoneNotification);
            }
          });
          notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setNotifications(notifs);
        },
        (err) => {
          console.warn('[FinGuard Notifications] Listener warning:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('[FinGuard Notifications] Query error:', e);
    }
  }, [activeCustomerId]);

  // Security Verification Helper: Tests unauthorized cross-customer read/write on /notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__finguard_test_unauthorized_access = async (
        targetNotifId: string,
        targetCustomerId?: string
      ) => {
        const notifRef = doc(notificationsCol(), targetNotifId);
        let getDocDenied = false;
        let getDocError: string | null = null;
        let getDocData: any = null;

        try {
          const snap = await getDoc(notifRef);
          if (snap.exists()) {
            getDocData = snap.data();
          }
        } catch (err: any) {
          getDocDenied = true;
          getDocError = err?.code || err?.message || String(err);
        }

        let updateDenied = false;
        let updateError: string | null = null;
        try {
          await updateDoc(notifRef, { read: true });
        } catch (err: any) {
          updateDenied = true;
          updateError = err?.code || err?.message || String(err);
        }

        let queryDenied = false;
        let queryError: string | null = null;
        let queryCount = 0;
        if (targetCustomerId) {
          try {
            const q = query(notificationsCol(), where('customer_id', '==', targetCustomerId));
            const snap = await getDocs(q);
            queryCount = snap.size;
          } catch (err: any) {
            queryDenied = true;
            queryError = err?.code || err?.message || String(err);
          }
        }

        return {
          targetNotifId,
          targetCustomerId,
          callerCustomerId: activeCustomerId,
          getDocDenied,
          getDocError,
          getDocData,
          updateDenied,
          updateError,
          queryDenied,
          queryError,
          queryCount,
        };
      };
    }
  }, [activeCustomerId]);

  // Helper to create typed notification in Firestore
  const createNotification = useCallback(
    async (
      eventType: NotificationEventType,
      params: {
        transactionId?: string;
        amount?: number;
        merchant?: string;
        cautionThreshold?: number;
        maxLimit?: number;
        actionRequired?: boolean;
      }
    ) => {
      if (!activeIdentity) return;
      try {
        const notifId = `NOTIF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const notifRef = doc(notificationsCol(), notifId);
        const nowIso = new Date().toISOString();
        const amtStr = params.amount ? params.amount.toLocaleString('en-IN') : '0';
        const cautionStr = (params.cautionThreshold ?? cautionThreshold).toLocaleString('en-IN');
        const maxStr = (params.maxLimit ?? maxLimit).toLocaleString('en-IN');
        const merch = params.merchant || 'Merchant';

        const enT = TRANSLATIONS.en;
        let title = enT.eventTitles[eventType];
        let message = '';
        let smsText = '';

        switch (eventType) {
          case 'PAYMENT_INITIATED':
            message = enT.eventMessages.paymentInitiated(amtStr, merch);
            smsText = enT.smsMessages.paymentInitiated(amtStr, merch);
            break;
          case 'APPROVAL_REQUIRED':
            message = enT.eventMessages.approvalRequired(amtStr, merch, cautionStr);
            smsText = enT.smsMessages.approvalRequired(amtStr, merch);
            break;
          case 'PAYMENT_APPROVED':
            message = enT.eventMessages.paymentApproved(amtStr, merch);
            smsText = enT.smsMessages.paymentApproved(amtStr, merch);
            break;
          case 'PAYMENT_COMPLETED':
            message = enT.eventMessages.paymentCompleted(amtStr, merch);
            smsText = enT.smsMessages.paymentCompleted(amtStr, merch);
            break;
          case 'PAYMENT_BLOCKED':
            message = enT.eventMessages.paymentBlocked(amtStr, maxStr);
            smsText = enT.smsMessages.paymentBlocked(amtStr, maxStr);
            break;
          case 'PAYMENT_REJECTED':
            message = enT.eventMessages.paymentRejected(amtStr);
            smsText = enT.smsMessages.paymentRejected(amtStr);
            break;
          case 'LIMIT_CHANGED':
            message = enT.eventMessages.limitChanged(cautionStr, maxStr);
            smsText = enT.smsMessages.limitChanged(cautionStr, maxStr);
            break;
        }

        const newNotif: PhoneNotification = {
          notification_id: notifId,
          id: notifId,
          event_type: eventType,
          customer_id: activeIdentity.customerId,
          account_id: activeIdentity.accountId,
          device_id: deviceId || 'DEV-MOBILE-UNSET',
          transaction_id: params.transactionId,
          auth_uid: user?.uid || undefined,
          title,
          message,
          language,
          read: false,
          action_required: params.actionRequired ?? (eventType === 'APPROVAL_REQUIRED'),
          created_at: nowIso,
          amount: params.amount,
          merchant: params.merchant,
          caution_threshold: params.cautionThreshold ?? cautionThreshold,
          fixed_limit: params.maxLimit ?? maxLimit,
          sms_text: smsText,
        };

        try {
          await setDoc(notifRef, newNotif);
        } catch (err) {
          console.warn('[FinGuard Notification] Firestore write:', err);
        }

        // Resilient in-memory update ensuring UI responsiveness across demo flows
        setNotifications((prev) => {
          if (prev.some((n) => n.notification_id === notifId)) return prev;
          return [newNotif, ...prev];
        });
      } catch (err) {
        console.warn('[FinGuard Notification] Write failed:', err);
      }
    },
    [activeIdentity, deviceId, cautionThreshold, maxLimit, language, user]
  );

  // Helper to resolve approval-required notifications upon completion or cancellation
  const resolveApprovalNotification = useCallback(
    async (txnId: string) => {
      try {
        const pendingNotifs = notifications.filter(
          (n) => n.transaction_id === txnId && n.event_type === 'APPROVAL_REQUIRED' && n.action_required
        );
        await Promise.all(
          pendingNotifs.map((n) =>
            updateDoc(doc(notificationsCol(), n.notification_id), {
              action_required: false,
              read: true,
            })
          )
        );
      } catch (err) {
        console.warn('[FinGuard Notification] Could not resolve approval notification:', err);
      }
    },
    [notifications]
  );

  // Dynamic localization formatter for any notification or SMS based on current active language
  const getNotificationText = useCallback(
    (notif: PhoneNotification) => {
      const amtStr = notif.amount ? notif.amount.toLocaleString('en-IN') : '0';
      const cautionStr = notif.caution_threshold
        ? notif.caution_threshold.toLocaleString('en-IN')
        : cautionThreshold.toLocaleString('en-IN');
      const maxStr = notif.fixed_limit
        ? notif.fixed_limit.toLocaleString('en-IN')
        : maxLimit.toLocaleString('en-IN');
      const merch = notif.merchant || 'Merchant';

      const localizedTitle = t.eventTitles[notif.event_type] || notif.title;
      let localizedMsg = notif.message;
      let localizedSms = notif.sms_text;

      switch (notif.event_type) {
        case 'PAYMENT_INITIATED':
          localizedMsg = t.eventMessages.paymentInitiated(amtStr, merch);
          localizedSms = t.smsMessages.paymentInitiated(amtStr, merch);
          break;
        case 'APPROVAL_REQUIRED':
          localizedMsg = t.eventMessages.approvalRequired(amtStr, merch, cautionStr);
          localizedSms = t.smsMessages.approvalRequired(amtStr, merch);
          break;
        case 'PAYMENT_APPROVED':
          localizedMsg = t.eventMessages.paymentApproved(amtStr, merch);
          localizedSms = t.smsMessages.paymentApproved(amtStr, merch);
          break;
        case 'PAYMENT_COMPLETED':
          localizedMsg = t.eventMessages.paymentCompleted(amtStr, merch);
          localizedSms = t.smsMessages.paymentCompleted(amtStr, merch);
          break;
        case 'PAYMENT_BLOCKED':
          localizedMsg = t.eventMessages.paymentBlocked(amtStr, maxStr);
          localizedSms = t.smsMessages.paymentBlocked(amtStr, maxStr);
          break;
        case 'PAYMENT_REJECTED':
          localizedMsg = t.eventMessages.paymentRejected(amtStr);
          localizedSms = t.smsMessages.paymentRejected(amtStr);
          break;
        case 'LIMIT_CHANGED':
          localizedMsg = t.eventMessages.limitChanged(cautionStr, maxStr);
          localizedSms = t.smsMessages.limitChanged(cautionStr, maxStr);
          break;
      }

      return {
        title: localizedTitle,
        message: localizedMsg,
        smsText: localizedSms || notif.sms_text || localizedMsg,
      };
    },
    [t, cautionThreshold, maxLimit]
  );

  // Mark single notification as read
  const handleMarkAsRead = async (notifId: string) => {
    try {
      const notifRef = doc(notificationsCol(), notifId);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.warn('[FinGuard Notification] Mark read failed:', err);
    }
  };

  // Mark all unread notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const unreadList = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadList.map((n) => updateDoc(doc(notificationsCol(), n.notification_id), { read: true }))
      );
    } catch (err) {
      console.warn('[FinGuard Notification] Mark all read failed:', err);
    }
  };

  // Launch approval sheet from notification or popup
  const handleReviewFromNotification = (notif: PhoneNotification) => {
    setPendingApproval({
      txnId: notif.transaction_id || `TXN-${Date.now()}`,
      amount: notif.amount || 0,
      merchantName: notif.merchant || 'Merchant',
      snapCaution: notif.caution_threshold || cautionThreshold,
      snapMax: notif.fixed_limit || maxLimit,
      txnData: {
        transaction_id: notif.transaction_id || '',
        customer_id: activeIdentity?.customerId || '',
        amount: notif.amount || 0,
        currency: 'INR',
        timestamp: notif.created_at,
        city: activeIdentity?.defaultCity || '',
        device_id: notif.device_id,
        ip_address: '122.167.45.12',
        merchant: notif.merchant || '',
        transaction_type: 'UPI',
        status: 'APPROVAL_REQUIRED',
        caution_threshold: notif.caution_threshold || cautionThreshold,
        fixed_limit: notif.fixed_limit || maxLimit,
      },
    });
    setIsNotificationCenterOpen(false);
  };

  // Helper to append audit logs
  const recordAuditLog = useCallback(
    async (
      action: string,
      objectType: 'ACCOUNT' | 'TRANSACTION' | 'CASE',
      objectId: string,
      details: Record<string, unknown>
    ) => {
      if (!activeIdentity) return;
      try {
        const auditId = `AUDIT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        const auditRef = doc(auditLogsCol(), auditId);
        await setDoc(auditRef, {
          id: auditId,
          actor: 'USER',
          actorId: activeIdentity.customerId,
          action,
          objectType,
          objectId,
          details,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[FinGuard Audit] Could not write audit log:', err);
      }
    },
    [activeIdentity]
  );

  // Handle Login Demo Identity
  const handleLogin = async (customerId: string) => {
    setIsLoggingInId(customerId);
    setErrorMessage(null);
    try {
      await loginDemoUser(customerId);
      setBankingTab('send');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Login failed: ${msg}`);
    } finally {
      setIsLoggingInId(null);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setLastSubmittedTxn(null);
    setCustomerTransactions([]);
    setNotifications([]);
    setIsNotificationCenterOpen(false);
    setPendingApproval(null);
    setErrorMessage(null);
    try {
      await logoutDemoUser();
    } catch (err) {
      console.warn('[FinGuard Phone] Logout error:', err);
    }
  };

  // Handle Quick Presets
  const handleApplyPreset = (preset: QuickPreset) => {
    setAmountStr(String(preset.amount));
    setMerchantKey(preset.merchantKey);
    setTxType(preset.transactionType);
    if (preset.city) {
      setCustomCity(preset.city);
    } else if (activeIdentity) {
      setCustomCity(activeIdentity.defaultCity);
    }
    setErrorMessage(null);
  };

  // Save Configured Limits to Firestore
  const handleSaveLimits = async () => {
    if (!activeIdentity) return;

    setLimitValidationError(null);
    setLimitSaveSuccess(null);

    const parsedCaution = Number(editCautionStr);
    const parsedMax = Number(editMaxStr);

    if (isNaN(parsedCaution) || parsedCaution <= 0) {
      setLimitValidationError('Caution limit must be a positive number greater than ₹0.');
      return;
    }
    if (isNaN(parsedMax) || parsedMax <= 0) {
      setLimitValidationError('Maximum limit must be a positive number greater than ₹0.');
      return;
    }
    if (parsedCaution > parsedMax) {
      setLimitValidationError('Caution threshold must be less than or equal to the Maximum limit.');
      return;
    }

    setIsSavingLimits(true);
    try {
      const accRef = doc(accountsCol(), activeIdentity.accountId);
      await setDoc(
        accRef,
        {
          account_id: activeIdentity.accountId,
          customer_id: activeIdentity.customerId,
          caution_threshold: parsedCaution,
          max_transaction_limit: parsedMax,
          daily_limit: parsedMax,
          last_activity_at: new Date().toISOString(),
        },
        { merge: true }
      );

      // Record Audit Event
      await recordAuditLog('LIMIT_CHANGED', 'ACCOUNT', activeIdentity.accountId, {
        previousCaution: cautionThreshold,
        previousMax: maxLimit,
        newCaution: parsedCaution,
        newMax: parsedMax,
        accountId: activeIdentity.accountId,
      });

      // Dispatch LIMIT_CHANGED notification
      await createNotification('LIMIT_CHANGED', {
        cautionThreshold: parsedCaution,
        maxLimit: parsedMax,
      });

      setCautionThreshold(parsedCaution);
      setMaxLimit(parsedMax);
      setLimitSaveSuccess(t.limitsSavedSuccess);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLimitValidationError(`Failed to save limits: ${msg}`);
    } finally {
      setIsSavingLimits(false);
    }
  };

  // Submit Payment Action (Initiates State Machine)
  const handleSubmitPayment = useCallback(async () => {
    if (isSubmitting || !activeIdentity) return;

    const parsedAmount = Number(amountStr);
    if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than ₹0.');
      return;
    }

    const selectedMerchant = DEMO_MERCHANTS.find((m) => m.merchant_id === merchantKey) || DEMO_MERCHANTS[0];
    if (!selectedMerchant) {
      setErrorMessage('Please select a valid merchant.');
      return;
    }

    if (!user) {
      setErrorMessage('Authentication session initializing. Please wait a moment and try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setLastSubmittedTxn(null);

    // Limit Snapshot taken at transaction initiation
    const snapCaution = cautionThreshold;
    const snapMax = maxLimit;

    const uniqueTxnId = `TXN-DEV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const baseTxn: Transaction = {
      transaction_id: uniqueTxnId,
      id: uniqueTxnId,
      customer_id: activeIdentity.customerId,
      account_id: activeIdentity.accountId,
      amount: parsedAmount,
      currency: 'INR',
      timestamp: nowIso,
      city: customCity || activeIdentity.defaultCity,
      device_id: deviceId || 'DEV-MOBILE-UNSET',
      ip_address: activeIdentity.role === 'ATTACKER' ? '103.21.144.92' : '122.167.45.12',
      merchant: selectedMerchant.name,
      merchant_id: selectedMerchant.merchant_id,
      transaction_type: txType,
      status: 'INITIATED',
      channel: 'MOBILE_APP',
      caution_threshold: snapCaution,
      fixed_limit: snapMax,
      notes: `Synthetic payment via ${activeIdentity.bankName} [User: ${activeIdentity.name}]`,
    };

    const txnRef = doc(transactionsCol(), uniqueTxnId);

    // Dispatch PAYMENT_INITIATED notification
    await createNotification('PAYMENT_INITIATED', {
      transactionId: uniqueTxnId,
      amount: parsedAmount,
      merchant: selectedMerchant.name,
      cautionThreshold: snapCaution,
      maxLimit: snapMax,
    });

    try {
      // ════════════════════════════════════════════════════════════════════════
      // EVALUATE FRAUD RISK WITH CANONICAL RISK ENGINE
      // ════════════════════════════════════════════════════════════════════════
      let riskResult: RiskAssessmentResult;
      try {
        riskResult = evaluateTransactionContext(baseTxn);
      } catch {
        const fallbackCustomer: Customer = activeIdentity.customer || {
          customer_id: activeIdentity.customerId,
          name: activeIdentity.name,
          home_city: customCity || activeIdentity.defaultCity,
          normal_amount_min: 100,
          normal_amount_max: 20000,
          usual_cities: [customCity || activeIdentity.defaultCity],
          usual_device_ids: [deviceId || 'DEV-MOBILE-UNSET'],
          risk_profile: activeIdentity.role === 'ATTACKER' ? 'HIGH' : 'LOW',
        };
        const input: RiskEvaluationInput = {
          transaction: baseTxn,
          customer: fallbackCustomer,
          device: {
            device_id: deviceId || 'DEV-MOBILE-UNSET',
            customer_id: activeIdentity.customerId,
            first_seen: nowIso,
            last_seen: nowIso,
            known: activeIdentity.customer?.usual_device_ids?.includes(deviceId || '') ?? (activeIdentity.role !== 'ATTACKER'),
            device_type: 'mobile',
          },
          networkSignal:
            activeIdentity.role === 'ATTACKER'
              ? SYNTHETIC_NETWORK_SIGNALS[1]
              : SYNTHETIC_NETWORK_SIGNALS[0],
        };
        riskResult = evaluateTransactionRisk(input);
      }

      const riskReasons =
        riskResult.reasonCodes && riskResult.reasonCodes.length > 0
          ? riskResult.reasonCodes.map((r) => r.title)
          : riskResult.triggeredSignals.map((s) => s.title);

      // ════════════════════════════════════════════════════════════════════════
      // RULE 1: HARD MAXIMUM TRANSACTION LIMIT CHECK
      // If amount > fixed limit → transaction MUST be BLOCKED.
      // Verification cannot override this.
      // ════════════════════════════════════════════════════════════════════════
      if (parsedAmount > snapMax) {
        const blockedReason = `Amount ₹${parsedAmount.toLocaleString('en-IN')} exceeds account maximum transaction limit of ₹${snapMax.toLocaleString('en-IN')}.`;
        const blockedTxn: Transaction = {
          ...baseTxn,
          status: 'BLOCKED',
          blocked_reason: blockedReason,
          approval_status: 'NONE',
          risk_score: riskResult.riskScore,
          risk_level: riskResult.riskLevel,
          decision: riskResult.decision,
          risk_reasons: riskReasons,
        };

        await setDoc(txnRef, blockedTxn, { merge: true });

        await recordAuditLog('PAYMENT_BLOCKED', 'TRANSACTION', uniqueTxnId, {
          reason: 'EXCEEDS_MAX_LIMIT',
          amount: parsedAmount,
          maxLimit: snapMax,
          riskScore: riskResult.riskScore,
          decision: riskResult.decision,
          merchant: selectedMerchant.name,
        });

        // Dispatch PAYMENT_BLOCKED notification
        await createNotification('PAYMENT_BLOCKED', {
          transactionId: uniqueTxnId,
          amount: parsedAmount,
          merchant: selectedMerchant.name,
          maxLimit: snapMax,
          actionRequired: false,
        });

        setLastSubmittedTxn({
          id: uniqueTxnId,
          amount: parsedAmount,
          merchant: selectedMerchant.name,
          timestamp: nowIso,
          status: 'BLOCKED',
          blockedReason,
        });

        setIsSubmitting(false);
        return;
      }

      // ════════════════════════════════════════════════════════════════════════
      // RULE 2: FRAUD RISK POLICY ENFORCEMENT
      // If Risk Engine returns a BLOCK decision (BLOCK_AND_REVIEW or BLOCK_AND_CREATE_CASE)
      // Transaction MUST be BLOCKED. Verification cannot override this.
      // ════════════════════════════════════════════════════════════════════════
      if (riskResult.decision.includes('BLOCK')) {
        const blockedReason = `Fraud Prevention Block (${riskResult.riskLevel} Risk, Score ${riskResult.riskScore}/100): ${riskResult.summary}`;
        const blockedTxn: Transaction = {
          ...baseTxn,
          status: 'BLOCKED',
          blocked_reason: blockedReason,
          approval_status: 'NONE',
          risk_score: riskResult.riskScore,
          risk_level: riskResult.riskLevel,
          decision: riskResult.decision,
          risk_reasons: riskReasons,
        };

        await setDoc(txnRef, blockedTxn, { merge: true });

        await recordAuditLog('PAYMENT_BLOCKED', 'TRANSACTION', uniqueTxnId, {
          reason: 'FRAUD_RISK_BLOCK',
          amount: parsedAmount,
          riskScore: riskResult.riskScore,
          riskLevel: riskResult.riskLevel,
          decision: riskResult.decision,
          merchant: selectedMerchant.name,
        });

        // Dispatch PAYMENT_BLOCKED notification
        await createNotification('PAYMENT_BLOCKED', {
          transactionId: uniqueTxnId,
          amount: parsedAmount,
          merchant: selectedMerchant.name,
          maxLimit: snapMax,
          actionRequired: false,
        });

        // Automated Case Creation if policy requires case (BLOCK or score >= 70)
        const caseId = `CASE-AUTO-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const caseCreated: Case = {
          id: caseId,
          caseNumber: `CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          transactionId: uniqueTxnId,
          customerId: activeIdentity.customerId,
          status: 'INVESTIGATING',
          riskScore: riskResult.riskScore,
          riskLevel: riskResult.riskLevel,
          confidence: 0.95,
          verdict: riskResult.summary,
          recommendation: riskResult.decision,
          reasonCodes: riskResult.reasonCodes,
          investigationSummary: riskResult.summary,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await setDoc(doc(casesCol(), caseId), caseCreated);

        await recordAuditLog('CASE_CREATED', 'CASE', caseId, {
          transactionId: uniqueTxnId,
          customerId: activeIdentity.customerId,
          riskScore: riskResult.riskScore,
          decision: riskResult.decision,
        });

        setLastSubmittedTxn({
          id: uniqueTxnId,
          amount: parsedAmount,
          merchant: selectedMerchant.name,
          timestamp: nowIso,
          status: 'BLOCKED',
          blockedReason,
        });

        setIsSubmitting(false);
        return;
      }

      // ════════════════════════════════════════════════════════════════════════
      // RULE 3: CAUTION / APPROVAL THRESHOLD & STEP-UP VERIFICATION CHECK
      // If amount > caution threshold OR risk decision requires STEP_UP_VERIFICATION → APPROVAL_REQUIRED
      // ════════════════════════════════════════════════════════════════════════
      if (parsedAmount > snapCaution || riskResult.decision === 'STEP_UP_VERIFICATION') {
        const approvalTxn: Transaction = {
          ...baseTxn,
          status: 'APPROVAL_REQUIRED',
          approval_status: 'PENDING',
          risk_score: riskResult.riskScore,
          risk_level: riskResult.riskLevel,
          decision: riskResult.decision,
          risk_reasons: riskReasons,
        };

        await setDoc(txnRef, approvalTxn, { merge: true });

        await recordAuditLog('PAYMENT_APPROVAL_REQUESTED', 'TRANSACTION', uniqueTxnId, {
          amount: parsedAmount,
          cautionThreshold: snapCaution,
          maxLimit: snapMax,
          riskScore: riskResult.riskScore,
          decision: riskResult.decision,
          merchant: selectedMerchant.name,
        });

        // Dispatch APPROVAL_REQUIRED notification
        await createNotification('APPROVAL_REQUIRED', {
          transactionId: uniqueTxnId,
          amount: parsedAmount,
          merchant: selectedMerchant.name,
          cautionThreshold: snapCaution,
          maxLimit: snapMax,
          actionRequired: true,
        });

        // Trigger Approval Bottom Sheet / Modal
        setPendingApproval({
          txnId: uniqueTxnId,
          amount: parsedAmount,
          merchantName: selectedMerchant.name,
          snapCaution,
          snapMax,
          txnData: approvalTxn,
        });

        setBiometricNotice(null);
        setIsSubmitting(false);
        return;
      }

      // ════════════════════════════════════════════════════════════════════════
      // RULE 4: NORMAL TRANSACTION (Within Caution Limit & ALLOW Decision) → COMPLETED
      // ════════════════════════════════════════════════════════════════════════
      const completedTxn: Transaction = {
        ...baseTxn,
        status: 'COMPLETED',
        approval_status: 'NONE',
        risk_score: riskResult.riskScore,
        risk_level: riskResult.riskLevel,
        decision: riskResult.decision,
        risk_reasons: riskReasons,
      };

      await setDoc(txnRef, completedTxn, { merge: true });

      // Dispatch PAYMENT_COMPLETED notification
      await createNotification('PAYMENT_COMPLETED', {
        transactionId: uniqueTxnId,
        amount: parsedAmount,
        merchant: selectedMerchant.name,
        actionRequired: false,
      });

      setLastSubmittedTxn({
        id: uniqueTxnId,
        amount: parsedAmount,
        merchant: selectedMerchant.name,
        timestamp: nowIso,
        status: 'COMPLETED',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[FinGuard Payment] Submission error:', err);
      setErrorMessage(`Payment error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    activeIdentity,
    amountStr,
    merchantKey,
    user,
    customCity,
    deviceId,
    txType,
    cautionThreshold,
    maxLimit,
    recordAuditLog,
    createNotification,
  ]);

  // Complete Approval (Transitions: APPROVAL_REQUIRED → APPROVED → COMPLETED)
  const handleApprovePayment = async (method: 'BIOMETRIC' | 'PIN') => {
    if (!pendingApproval || isProcessingApproval) return;

    // Defense-in-depth: Never allow approved completion of a fraud-blocked transaction
    if (
      pendingApproval.txnData.status === 'BLOCKED' ||
      pendingApproval.txnData.decision?.includes('BLOCK')
    ) {
      setErrorMessage('Security Alert: This transaction was blocked by fraud risk policy and cannot be approved.');
      setPendingApproval(null);
      return;
    }

    setIsProcessingApproval(true);
    const txnRef = doc(transactionsCol(), pendingApproval.txnId);
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(txnRef, {
        status: 'COMPLETED',
        approval_status: 'APPROVED',
        approval_method: method,
        approved_at: nowIso,
      });

      await recordAuditLog('PAYMENT_APPROVED', 'TRANSACTION', pendingApproval.txnId, {
        approvalMethod: method,
        amount: pendingApproval.amount,
        merchant: pendingApproval.merchantName,
      });

      // Dispatch PAYMENT_APPROVED & PAYMENT_COMPLETED notifications
      await createNotification('PAYMENT_APPROVED', {
        transactionId: pendingApproval.txnId,
        amount: pendingApproval.amount,
        merchant: pendingApproval.merchantName,
      });
      await createNotification('PAYMENT_COMPLETED', {
        transactionId: pendingApproval.txnId,
        amount: pendingApproval.amount,
        merchant: pendingApproval.merchantName,
        actionRequired: false,
      });

      // Resolve APPROVAL_REQUIRED notification
      await resolveApprovalNotification(pendingApproval.txnId);

      setLastSubmittedTxn({
        id: pendingApproval.txnId,
        amount: pendingApproval.amount,
        merchant: pendingApproval.merchantName,
        timestamp: nowIso,
        status: 'COMPLETED',
      });

      setPendingApproval(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Approval failure: ${msg}`);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Cancel / Reject Payment
  const handleCancelPayment = async () => {
    if (!pendingApproval || isProcessingApproval) return;

    setIsProcessingApproval(true);
    const txnRef = doc(transactionsCol(), pendingApproval.txnId);

    try {
      await updateDoc(txnRef, {
        status: 'CANCELLED',
        approval_status: 'CANCELLED',
      });

      await recordAuditLog('PAYMENT_REJECTED', 'TRANSACTION', pendingApproval.txnId, {
        reason: 'USER_CANCELLED',
        amount: pendingApproval.amount,
      });

      // Dispatch PAYMENT_REJECTED notification
      await createNotification('PAYMENT_REJECTED', {
        transactionId: pendingApproval.txnId,
        amount: pendingApproval.amount,
        merchant: pendingApproval.merchantName,
        actionRequired: false,
      });

      // Resolve APPROVAL_REQUIRED notification
      await resolveApprovalNotification(pendingApproval.txnId);

      setLastSubmittedTxn({
        id: pendingApproval.txnId,
        amount: pendingApproval.amount,
        merchant: pendingApproval.merchantName,
        timestamp: new Date().toISOString(),
        status: 'CANCELLED',
      });

      setPendingApproval(null);
    } catch (err: unknown) {
      console.warn('[FinGuard Phone] Cancellation error:', err);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Genuine WebAuthn Biometric verification attempt
  const handleBiometricVerification = async () => {
    setBiometricNotice(null);

    // Verify browser platform authenticator support
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof navigator !== 'undefined' &&
      navigator.credentials &&
      typeof navigator.credentials.get === 'function' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(() => false))
    ) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'required',
          },
        });
        // Genuine biometric assertion completed
        await handleApprovePayment('BIOMETRIC');
        return;
      } catch (err) {
        setBiometricNotice('Biometric sensor check was cancelled or unverified. Please verify using PIN below.');
      }
    } else {
      setBiometricNotice('Biometric hardware is not available on this browser. Please verify using PIN below.');
    }
  };

  // Greeting helper
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // ══════════════════════════════════════════════════════════════════════════════
  // VIEW A: CLEAN MOBILE LOGIN SCREEN (Shown when user is NOT authenticated)
  // ══════════════════════════════════════════════════════════════════════════════
  if (!activeIdentity) {
    return (
      <div className="mx-auto max-w-md w-full px-2 py-4 animate-in fade-in duration-200">
        {/* App Branding */}
        <div className="text-center mb-6 pt-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-md mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
            FinGuard <span className="text-[var(--accent)]">Pay</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            Secure Synthetic Banking Experience
          </p>
        </div>

        {/* Demo Disclaimer Pill */}
        <div className="mb-6 p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-[var(--text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>DEMO ENVIRONMENT • SYNTHETIC ACCOUNTS</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Choose an identity to log in to this physical phone.
          </p>
        </div>

        {/* Login Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Choose Demo User List */}
        <div className="space-y-3">
          <div className="text-[11px] font-mono uppercase font-bold text-[var(--text-muted)] px-1">
            Choose Demo User
          </div>

          {(['C1001', 'C1002', 'C1008', 'C1003'] as const).map((idKey) => {
            const userItem = DEMO_IDENTITIES[idKey];
            const isLoggingIn = isLoggingInId === idKey;

            return (
              <div
                key={idKey}
                onClick={() => !isLoggingIn && handleLogin(idKey)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-xs ${
                  userItem.role === 'ATTACKER'
                    ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/25 hover:border-rose-500/40'
                    : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                      style={{ backgroundColor: userItem.themeColor }}
                    >
                      {userItem.role === 'ATTACKER' ? '⚡' : userItem.name.split(' ').map((n) => n[0]).join('')}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">
                          {userItem.name}
                        </span>
                        <span
                          className="badge text-[9px] font-mono px-1.5 py-0.2 rounded font-bold"
                          style={{
                            color: userItem.themeColor,
                            backgroundColor: `${userItem.themeColor}15`,
                          }}
                        >
                          {userItem.bankName}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-[var(--text-secondary)] mt-0.5">
                        {userItem.maskedAccount}
                      </div>

                      <div className="text-[10px] text-[var(--text-muted)] mt-1">
                        {userItem.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                      ₹{userItem.balance.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
                      Available
                    </div>
                  </div>
                </div>

                {/* Log In Tap Trigger Strip */}
                <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-medium">
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    ID: {userItem.customerId}
                  </span>
                  <div
                    className="flex items-center gap-1 font-bold text-xs"
                    style={{ color: userItem.themeColor }}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Logging in…</span>
                      </>
                    ) : (
                      <>
                        <span>Log In</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hardware Status Strip */}
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] px-1">
          <div className="flex items-center gap-1.5">
            <Smartphone className="h-3 w-3" />
            <span>Hardware: {deviceId ? `DEV-${deviceId.slice(0, 6).toUpperCase()}` : 'Initializing'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{status}</span>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VIEW B: AUTHENTICATED BANKING DASHBOARD (Single User Scoped)
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="mx-auto max-w-md w-full pb-10 selection:bg-[var(--accent)] selection:text-white animate-in fade-in duration-200 relative">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. BANKING APP HEADER BAR (No Profile Switcher)                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-2 px-1 mb-3">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white shadow-xs font-bold text-xs"
            style={{ backgroundColor: activeIdentity.themeColor }}
          >
            {activeIdentity.role === 'ATTACKER' ? '⚡' : activeIdentity.name[0]}
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">
              {greeting}, {activeIdentity.name.split(' ')[0]}
            </div>
            <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1">
              <span>{activeIdentity.bankName}</span>
              <span>•</span>
              <span className="text-emerald-500 font-bold">ONLINE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language Selector (EN / ಕನ್ನಡ) */}
          <div className="flex items-center rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleToggleLanguage('en')}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleToggleLanguage('kn')}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                language === 'kn'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              ಕನ್ನಡ
            </button>
          </div>

          {/* Notification Bell Button */}
          <button
            type="button"
            onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
            className="relative p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
            title={t.notificationCenter}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-600 text-white font-mono font-bold text-[9px] flex items-center justify-center shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 bg-rose-500/10 hover:bg-rose-500/15 transition-colors cursor-pointer"
            title={t.logout}
          >
            <LogOut className="h-3 w-3" />
            <span className="text-[10px] font-bold">{t.logout}</span>
          </button>

          {/* Jump to SOC for demo operator */}
          <button
            type="button"
            onClick={() => {
              window.location.hash = 'command-center';
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            title="Open SOC Command Center"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. AUTHENTICATED ACCOUNT BALANCE CARD                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 border transition-all mb-4 relative overflow-hidden shadow-xs"
        style={{
          backgroundColor: activeIdentity.accentBg,
          borderColor: activeIdentity.borderColor,
        }}
      >
        {activeIdentity.role === 'ATTACKER' && (
          <div className="mb-2 py-1 px-2 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-mono flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
            <span>Adversarial Testing Account • Infiltrating C1003 Target</span>
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              <Building2 className="h-3.5 w-3.5" style={{ color: activeIdentity.themeColor }} />
              <span>{activeIdentity.bankName}</span>
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)] mt-0.5">
              {activeIdentity.name}
            </div>
            <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
              {activeIdentity.maskedAccount} • {activeIdentity.defaultCity}
            </div>
          </div>

          <span
            className="badge text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full"
            style={{
              color: activeIdentity.themeColor,
              backgroundColor: `${activeIdentity.themeColor}15`,
              borderColor: `${activeIdentity.themeColor}30`,
            }}
          >
            {activeIdentity.role}
          </span>
        </div>

        {/* Balance & Limits Strip */}
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-[var(--text-muted)]">
              {t.availableBalance}
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-[var(--text-primary)] mt-0.5">
              ₹{activeIdentity.balance.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-right text-[9px] font-mono space-y-0.5">
            <div className="text-amber-600 font-semibold">
              Caution: &gt;₹{cautionThreshold.toLocaleString('en-IN')}
            </div>
            <div className="text-rose-600 font-semibold">
              Max: ₹{maxLimit.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. MOBILE BANKING TABS ([Send Money] [Activity] [SMS Inbox] [Security])    */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] mb-4 shadow-xs">
        <button
          type="button"
          onClick={() => setBankingTab('send')}
          className={`py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            bankingTab === 'send'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Send className="h-3 w-3 shrink-0" />
          <span className="truncate text-[11px]">{t.tabSendMoney}</span>
        </button>

        <button
          type="button"
          onClick={() => setBankingTab('activity')}
          className={`py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            bankingTab === 'activity'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <History className="h-3 w-3 shrink-0" />
          <span className="truncate text-[11px]">{t.tabActivity}</span>
        </button>

        <button
          type="button"
          onClick={() => setBankingTab('sms')}
          className={`py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer relative ${
            bankingTab === 'sms'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MessageSquare className="h-3 w-3 shrink-0" />
          <span className="truncate text-[11px]">{t.tabSmsInbox}</span>
          {notifications.length > 0 && (
            <span className="ml-0.5 text-[8px] font-mono px-1 rounded-full bg-slate-500/20 text-current">
              {notifications.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setBankingTab('security')}
          className={`py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            bankingTab === 'security'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sliders className="h-3 w-3 shrink-0" />
          <span className="truncate text-[11px]">{t.tabSecurity}</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: SEND MONEY (PAYMENT COMPOSER)                                       */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {bankingTab === 'send' && (
        <div className="space-y-4">
          {/* Quick Demo Presets */}
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)] mb-1.5 px-1">
              Quick Payment Presets
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {QUICK_PRESETS.map((p) => {
                const isMatch = amountStr === String(p.amount);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      isMatch
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-xs font-bold'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
                    }`}
                  >
                    <div className="text-[9px] font-bold uppercase truncate">{p.name}</div>
                    <div className="text-[11px] font-mono font-extrabold mt-0.5 truncate">{p.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Composer Form */}
          <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Payment Details</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">INR Synthetic</span>
            </div>

            {/* Merchant Selector */}
            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)] block mb-1">
                Destination Merchant
              </label>
              <select
                value={merchantKey}
                onChange={(e) => setMerchantKey(e.target.value)}
                className="w-full py-2 px-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
              >
                {DEMO_MERCHANTS.map((m) => (
                  <option key={m.merchant_id} value={m.merchant_id}>
                    {m.name} ({m.category}) • {m.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)]">
                  Amount (INR)
                </label>
                <div className="text-[9px] font-mono text-[var(--text-muted)]">
                  Max: ₹{maxLimit.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)] font-mono">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  step="100"
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="1,500"
                  className="w-full pl-8 pr-3 py-2.5 bg-[var(--bg-surface-subtle)] border border-[var(--border-default)] rounded-xl text-base font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                />
              </div>

              {/* Quick Increment Helpers */}
              <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none">
                {[1000, 5000, 10000, 25000, 50000].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => {
                      const current = Number(amountStr) || 0;
                      setAmountStr(String(current + inc));
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    +₹{inc.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmountStr('1500')}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Payment Channel Selector */}
            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)] block mb-1">
                Payment Channel
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['UPI', 'CARD', 'NET_BANKING', 'IMPS'] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxType(t)}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      txType === t
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmitPayment}
              disabled={isSubmitting || status === 'OFFLINE'}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#3157D5] via-[#4F46E5] to-[#7C5CFC] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Evaluating Limits &amp; Routing…</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>SEND PAYMENT (₹{Number(amountStr || 0).toLocaleString('en-IN')})</span>
                </>
              )}
            </button>
          </div>

          {/* Submission Feedback Banners */}
          {lastSubmittedTxn && (
            <div
              className={`p-3.5 rounded-2xl border animate-in fade-in duration-200 ${
                lastSubmittedTxn.status === 'BLOCKED'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  : lastSubmittedTxn.status === 'CANCELLED'
                  ? 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-300'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {lastSubmittedTxn.status === 'BLOCKED' ? (
                    <Ban className="h-4 w-4 text-rose-600 shrink-0" />
                  ) : lastSubmittedTxn.status === 'CANCELLED' ? (
                    <X className="h-4 w-4 text-slate-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  <span className="text-xs font-bold uppercase font-mono">
                    {lastSubmittedTxn.status === 'BLOCKED'
                      ? 'TRANSACTION BLOCKED'
                      : lastSubmittedTxn.status === 'CANCELLED'
                      ? 'TRANSACTION CANCELLED'
                      : 'TRANSACTION COMPLETED'}
                  </span>
                </div>
                <span className="text-[10px] font-mono opacity-80">
                  {new Date(lastSubmittedTxn.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="mt-1.5 text-xs">
                <span className="font-semibold">{lastSubmittedTxn.merchant}</span> •{' '}
                <span className="font-mono font-bold">₹{lastSubmittedTxn.amount.toLocaleString('en-IN')}</span>
              </div>

              {lastSubmittedTxn.blockedReason ? (
                <div className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  {lastSubmittedTxn.blockedReason}
                </div>
              ) : (
                <div className="mt-1 text-[9px] font-mono opacity-80 break-all">
                  ID: {lastSubmittedTxn.id} • Status: {lastSubmittedTxn.status}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: TRANSACTIONS (DATA-ISOLATED FOR THIS USER ONLY)                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {bankingTab === 'activity' && (
        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>{activeIdentity.name}’s Transactions</span>
            </span>
            <span className="text-[9px] font-mono text-[var(--text-muted)]">
              Isolated account activity
            </span>
          </div>

          {customerTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] font-mono">
              No transactions recorded for {activeIdentity.name} yet.
            </div>
          ) : (
            <div className="space-y-2">
              {customerTransactions.map((tx) => (
                <div
                  key={tx.transaction_id || tx.id}
                  className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{tx.merchant}</div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                      <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>{tx.transaction_type}</span>
                      <span>•</span>
                      <span>{tx.city}</span>
                    </div>
                    {tx.blocked_reason && (
                      <div className="text-[9px] text-rose-600 mt-0.5 truncate max-w-[200px]">
                        {tx.blocked_reason}
                      </div>
                    )}
                    {tx.caution_threshold && tx.fixed_limit && (
                      <div className="text-[8px] font-mono text-[var(--text-muted)] mt-0.5">
                        Limits Snapshot: Caution ₹{tx.caution_threshold.toLocaleString()} • Max ₹{tx.fixed_limit.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-bold font-mono text-[var(--text-primary)]">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </div>
                    <span
                      className={`badge text-[8px] font-mono px-1.5 py-0.2 mt-0.5 inline-block ${
                        tx.status === 'COMPLETED' || tx.status === 'ALLOWED'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : tx.status === 'BLOCKED'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold'
                          : tx.status === 'APPROVAL_REQUIRED'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse font-bold'
                          : tx.status === 'CANCELLED' || tx.status === 'REJECTED'
                          ? 'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                          : 'bg-indigo-500/10 text-indigo-600'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: SYNTHETIC SMS INBOX (REALTIME FIRESTORE STREAM)                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {bankingTab === 'sms' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">{t.syntheticSmsTitle}</h3>
                  <span className="badge text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    {t.syntheticSmsBadge}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.syntheticSmsSubtitle}</p>
              </div>
            </div>
            <div className="text-[10px] font-mono text-[var(--text-muted)]">
              {notifications.length} {language === 'kn' ? 'ಸಂದೇಶಗಳು' : 'messages'}
            </div>
          </div>

          {/* SMS Message Thread */}
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)] font-mono rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
              {t.noSmsMessages}
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((notif) => {
                const notifText = getNotificationText(notif);
                return (
                  <div
                    key={`sms-${notif.notification_id || notif.id}`}
                    className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-bold font-mono text-[var(--text-primary)]">
                          {t.smsSender}
                        </span>
                        <span className="text-[9px] font-mono px-1 rounded bg-blue-500/10 text-blue-600 font-bold">
                          VERIFIED
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                        <span>{new Date(notif.created_at).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <CheckCheck className="h-3 w-3" />
                          {t.smsDelivered}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] leading-relaxed font-mono">
                      {notifText.smsText}
                    </div>

                    {notif.action_required && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleReviewFromNotification(notif)}
                          className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                        >
                          <Lock className="h-3 w-3" />
                          <span>{t.reviewPayment}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: LIMITS & SECURITY CONFIGURATION                                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {bankingTab === 'security' && (
        <div className="space-y-4">
          {/* Transaction Limits Configuration Card */}
          <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Transaction Safety Limits</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">FIRESTORE ENFORCED</span>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Configure spending boundaries for account <span className="font-mono font-bold text-[var(--text-primary)]">{activeIdentity.maskedAccount}</span>.
              Limits are authoritative and evaluated before transactions route to payment rails.
            </p>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-amber-600 dark:text-amber-400 block mb-1">
                  Caution / Approval Threshold (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)] font-mono">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="500"
                    value={editCautionStr}
                    onChange={(e) => setEditCautionStr(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[var(--bg-surface-subtle)] border border-[var(--border-default)] rounded-xl text-xs font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">
                  Transactions ABOVE this threshold require explicit verification before completion.
                </span>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-rose-600 dark:text-rose-400 block mb-1">
                  Maximum Transaction Limit (Hard Ceiling)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)] font-mono">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1000"
                    value={editMaxStr}
                    onChange={(e) => setEditMaxStr(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[var(--bg-surface-subtle)] border border-[var(--border-default)] rounded-xl text-xs font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">
                  Absolute ceiling. Amounts exceeding this value are blocked without override.
                </span>
              </div>
            </div>

            {/* Validation / Success Messages */}
            {limitValidationError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{limitValidationError}</span>
              </div>
            )}

            {limitSaveSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{limitSaveSuccess}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveLimits}
              disabled={isSavingLimits}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white font-bold text-xs shadow-xs hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingLimits ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Committing Limits…</span>
                </>
              ) : (
                <span>Save &amp; Enforce Limits</span>
              )}
            </button>
          </div>

          {/* Profile Dossier Card */}
          <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>User Profile &amp; Hardware</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">ONLINE</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Account Holder</span>
                <span className="font-bold text-[var(--text-primary)]">{activeIdentity.name}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Bank Institution</span>
                <span className="font-medium text-[var(--text-primary)]">{activeIdentity.bankName}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Masked Account</span>
                <span className="font-mono text-[var(--text-primary)]">{activeIdentity.maskedAccount}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Customer Identifier</span>
                <span className="font-mono text-[var(--accent)] font-bold">{activeIdentity.customerId}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Hardware Device ID</span>
                <span className="font-mono text-[var(--text-secondary)] text-[10px]">
                  {deviceId ? `DEV-${deviceId.slice(0, 8).toUpperCase()}` : '—'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)] flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Language
                </span>
                <span className="text-[var(--text-primary)]">English (Default)</span>
              </div>
            </div>

            {/* Logout Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>LOG OUT OF THIS PHONE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 5. NOTIFICATION CENTER MODAL / DRAWER                                      */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isNotificationCenterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-6 duration-200 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    {t.notificationCenter}
                  </h3>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    {unreadCount} {t.unreadCountSuffix}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-mono font-bold text-[var(--accent)] hover:underline px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    {t.markAllAsRead}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsNotificationCenterOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)] font-mono">
                  {t.noNotifications}
                </div>
              ) : (
                notifications.map((notif) => {
                  const notifText = getNotificationText(notif);
                  return (
                    <div
                      key={notif.notification_id || notif.id}
                      onClick={() => handleMarkAsRead(notif.notification_id || notif.id || '')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        notif.action_required
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : notif.read
                          ? 'border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] opacity-80'
                          : 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {notif.event_type === 'APPROVAL_REQUIRED' ? (
                            <span className="p-1 rounded-md bg-amber-500/20 text-amber-600">
                              <Lock className="h-3 w-3" />
                            </span>
                          ) : notif.event_type === 'PAYMENT_BLOCKED' ? (
                            <span className="p-1 rounded-md bg-rose-500/20 text-rose-600">
                              <Ban className="h-3 w-3" />
                            </span>
                          ) : notif.event_type === 'PAYMENT_COMPLETED' ? (
                            <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                            </span>
                          ) : notif.event_type === 'LIMIT_CHANGED' ? (
                            <span className="p-1 rounded-md bg-blue-500/20 text-blue-600">
                              <Sliders className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-slate-500/20 text-slate-600">
                              <Zap className="h-3 w-3" />
                            </span>
                          )}

                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {notifText.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono text-[var(--text-muted)]">
                            {new Date(notif.created_at).toLocaleTimeString()}
                          </span>
                          {!notif.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                        {notifText.message}
                      </p>

                      {notif.action_required && (
                        <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-amber-600 font-bold uppercase">
                            {t.actionRequired}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReviewFromNotification(notif);
                            }}
                            className="py-1 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                          >
                            <Lock className="h-3 w-3" />
                            <span>{t.reviewPayment}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 6. REAL-TIME APPROVAL POPUP ALERT (Bottom Floating Card)                   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeApprovalNotif && !pendingApproval && (
        <div className="fixed bottom-3 left-3 right-3 z-40 max-w-sm mx-auto p-4 rounded-3xl bg-[var(--bg-surface)] border-2 border-amber-500 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-600">
                  {t.realtimeApprovalAlertTitle}
                </span>
                <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                  {t.actionRequired}
                </span>
              </div>

              <div className="text-xs font-bold text-[var(--text-primary)] mt-1">
                ₹{activeApprovalNotif.amount?.toLocaleString('en-IN')} payment to {activeApprovalNotif.merchant}
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-tight">
                {t.realtimeApprovalAlertDesc(
                  activeApprovalNotif.amount?.toLocaleString('en-IN') || '0',
                  activeApprovalNotif.merchant || 'Merchant',
                  (activeApprovalNotif.caution_threshold || cautionThreshold).toLocaleString('en-IN')
                )}
              </p>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => handleReviewFromNotification(activeApprovalNotif)}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{t.reviewPayment}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 7. BANKING VERIFICATION BOTTOM SHEET / MODAL (APPROVAL REQUIRED)           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {pendingApproval && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-6 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.verifyPayment}</h3>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">{t.verifyPaymentSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelPayment}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Details Summary */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Payment Amount:</span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">
                  ₹{pendingApproval.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--text-muted)]">Merchant:</span>
                <span className="text-[var(--text-primary)] font-semibold truncate max-w-[160px]">
                  {pendingApproval.merchantName}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] pt-1 border-t border-[var(--border-subtle)]">
                <span className="text-amber-600 font-semibold">{t.cautionLimitLabel}</span>
                <span>₹{pendingApproval.snapCaution.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-rose-600 font-semibold">{t.maximumLimitLabel}</span>
                <span>₹{pendingApproval.snapMax.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              This payment exceeds your configured caution threshold of{' '}
              <span className="font-bold font-mono text-[var(--text-primary)]">
                ₹{pendingApproval.snapCaution.toLocaleString('en-IN')}
              </span>
              . Explicit verification is required to complete transaction.
            </p>

            {/* Biometric Notice if triggered */}
            {biometricNotice && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-tight">
                {biometricNotice}
              </div>
            )}

            {/* Verification Actions */}
            <div className="space-y-2 pt-1">
              {/* Genuine Biometric Button */}
              <button
                type="button"
                onClick={handleBiometricVerification}
                disabled={isProcessingApproval}
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Fingerprint className="h-4 w-4 text-[var(--accent)]" />
                <span>{t.useBiometric}</span>
              </button>

              {/* PIN Verification Input and Action */}
              <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="font-bold text-[var(--text-secondary)] flex items-center gap-1">
                    <KeyRound className="h-3 w-3" />
                    {t.enterPinLabel}
                  </span>
                  <span className="text-[var(--text-muted)]">{t.demoPinHint}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    value={approvalPin}
                    onChange={(e) => setApprovalPin(e.target.value)}
                    className="flex-1 py-1.5 px-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-sm text-center font-mono tracking-widest text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    placeholder="••••"
                  />
                  <button
                    type="button"
                    onClick={() => handleApprovePayment('PIN')}
                    disabled={isProcessingApproval || !approvalPin.trim()}
                    className="py-1.5 px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingApproval ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    <span>{t.verifyWithPin}</span>
                  </button>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleCancelPayment}
                disabled={isProcessingApproval}
                className="w-full py-2 px-3 rounded-xl text-[var(--text-muted)] hover:text-rose-600 text-xs font-semibold text-center transition-colors cursor-pointer"
              >
                {t.cancelPayment}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 5. DEMO DISCLAIMER FOOTER                                                  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="mt-5 text-center text-[10px] font-mono text-[var(--text-muted)] space-y-1">
        <div className="flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>DEMO MODE — SYNTHETIC PAYMENTS ONLY</span>
        </div>
        <div>Configurable limits enforced before downstream FinGuard SOC routing.</div>
      </div>
    </div>
  );
};
export default DeviceFoundationView;
