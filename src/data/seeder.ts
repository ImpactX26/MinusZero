import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  SYNTHETIC_CUSTOMERS,
  SYNTHETIC_ACCOUNTS,
  SYNTHETIC_DEVICES,
  SYNTHETIC_LOGIN_EVENTS,
  SYNTHETIC_MERCHANTS,
  SYNTHETIC_NETWORK_SIGNALS,
  SYNTHETIC_TRANSACTIONS,
} from './scenarios';

export interface SeedResult {
  customersCount: number;
  accountsCount: number;
  devicesCount: number;
  loginEventsCount: number;
  merchantsCount: number;
  networkSignalsCount: number;
  transactionsCount: number;
  success: boolean;
  message: string;
}

/**
 * Strips raw Firebase / network error strings of internal URLs or project details
 */
function sanitizeErrorMessage(collectionName: string, err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.toLowerCase().includes('permission') || raw.toLowerCase().includes('insufficient')) {
    return `Seed failed while writing ${collectionName}: Missing or insufficient permissions. Ensure you are signed in with an authorized investigator account.`;
  }
  if (raw.toLowerCase().includes('network') || raw.toLowerCase().includes('offline')) {
    return `Seed failed while writing ${collectionName}: Network connectivity issue.`;
  }
  return `Seed failed while writing ${collectionName}: ${raw.replace(/https?:\/\/[^\s]+/g, '')}`;
}

/**
 * Idempotently seeds the expanded V3 synthetic dataset into Firestore
 * collection-by-collection to provide exact collection-level error isolation.
 * Uses deterministic document IDs to guarantee idempotency across repeated runs.
 */
export async function seedSyntheticData(): Promise<SeedResult> {
  let customersCount = 0;
  let accountsCount = 0;
  let devicesCount = 0;
  let loginEventsCount = 0;
  let merchantsCount = 0;
  let networkSignalsCount = 0;
  let transactionsCount = 0;

  // 1. Seed Customers
  try {
    const batch = writeBatch(db);
    for (const customer of Object.values(SYNTHETIC_CUSTOMERS)) {
      const ref = doc(db, 'customers', customer.customer_id);
      batch.set(ref, customer, { merge: true });
      customersCount++;
    }
    await batch.commit();
  } catch (err: unknown) {
    throw new Error(sanitizeErrorMessage('customers', err));
  }

  // 2. Seed Accounts
  try {
    const batch = writeBatch(db);
    for (const account of Object.values(SYNTHETIC_ACCOUNTS)) {
      const ref = doc(db, 'accounts', account.account_id);
      batch.set(ref, account, { merge: true });
      accountsCount++;
    }
    await batch.commit();
  } catch (err: unknown) {
    throw new Error(sanitizeErrorMessage('accounts', err));
  }

  // 3. Seed Devices
  try {
    const batch = writeBatch(db);
    for (const device of SYNTHETIC_DEVICES) {
      const ref = doc(db, 'devices', device.device_id);
      batch.set(ref, device, { merge: true });
      devicesCount++;
    }
    await batch.commit();
  } catch (err: unknown) {
    throw new Error(sanitizeErrorMessage('devices', err));
  }

  // 4. Seed Login Events
  try {
    const batch = writeBatch(db);
    for (const event of SYNTHETIC_LOGIN_EVENTS) {
      const ref = doc(db, 'login_events', event.event_id);
      batch.set(ref, event, { merge: true });
      loginEventsCount++;
    }
    await batch.commit();
  } catch (err: unknown) {
    throw new Error(sanitizeErrorMessage('login_events', err));
  }

  // 5. Seed Merchants
  try {
    const batch = writeBatch(db);
    for (const merchant of Object.values(SYNTHETIC_MERCHANTS)) {
      const ref = doc(db, 'merchants', merchant.merchant_id);
      batch.set(ref, merchant, { merge: true });
      merchantsCount++;
    }
    await batch.commit();
  } catch (err: unknown) {
    throw new Error(sanitizeErrorMessage('merchants', err));
  }

  // 6. Seed Network Signals
  try {
    const batch = writeBatch(db);
    for (const signal of SYNTHETIC_NETWORK_SIGNALS) {
      const ref = doc(db, 'network_signals', signal.signal_id);
      batch.set(ref, signal, { merge: true });
      networkSignalsCount++;
    }
    await batch.commit();
  } catch (err: unknown) {
    throw new Error(sanitizeErrorMessage('network_signals', err));
  }

  // 7. Seed Transactions
  try {
    const batch = writeBatch(db);
    for (const txn of SYNTHETIC_TRANSACTIONS) {
      const ref = doc(db, 'transactions', txn.transaction_id);
      batch.set(ref, txn, { merge: true });
      transactionsCount++;
    }
    await batch.commit();
  } catch (err: unknown) {
    throw new Error(sanitizeErrorMessage('transactions', err));
  }

  return {
    customersCount,
    accountsCount,
    devicesCount,
    loginEventsCount,
    merchantsCount,
    networkSignalsCount,
    transactionsCount,
    success: true,
    message: 'V3 synthetic dataset seeded successfully.',
  };
}
