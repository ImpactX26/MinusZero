import { collection, CollectionReference, DocumentData } from 'firebase/firestore';
import { db } from './config';
import { PermittedCollection, PERMITTED_COLLECTIONS } from '../types';

/**
 * Returns a typed collection reference for any permitted V3 collection.
 * Enforces the collection boundary specified in V3 Master Specifications.
 */
export function getPermittedCollection(
  collectionName: PermittedCollection
): CollectionReference<DocumentData> {
  if (!PERMITTED_COLLECTIONS.includes(collectionName)) {
    throw new Error(
      `[FinGuard Security] Collection '${collectionName}' is not defined in the permitted collection schema.`
    );
  }
  return collection(db, collectionName);
}

// Named reference accessors for all V3 domain collections
export const customersCol = () => getPermittedCollection('customers');
export const accountsCol = () => getPermittedCollection('accounts');
export const transactionsCol = () => getPermittedCollection('transactions');
export const devicesCol = () => getPermittedCollection('devices');
export const loginEventsCol = () => getPermittedCollection('login_events');
export const merchantsCol = () => getPermittedCollection('merchants');
export const networkSignalsCol = () => getPermittedCollection('network_signals');
export const investigationsCol = () => getPermittedCollection('investigations');
export const agentLogsCol = () => getPermittedCollection('agent_logs');
export const evidenceCol = () => getPermittedCollection('evidence');
export const correlationsCol = () => getPermittedCollection('correlations');
export const casesCol = () => getPermittedCollection('cases');
export const caseNotesCol = () => getPermittedCollection('case_notes');
export const feedbackCol = () => getPermittedCollection('feedback');
export const auditLogsCol = () => getPermittedCollection('audit_logs');
export const scenarioRunsCol = () => getPermittedCollection('scenario_runs');

// Phase 2.6 Patch: Mobile notifications accessor backed by /notifications/{notificationId}
export const notificationsCol = () => getPermittedCollection('notifications');

