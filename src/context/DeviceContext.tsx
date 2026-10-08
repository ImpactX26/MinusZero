import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { devicesCol } from '../firebase/collections';
import { Device, DeviceType, DeviceRole, BankId, ConnectionStatus } from '../types';
import { DEMO_IDENTITIES } from '../data/phoneFixtures';

function inferDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|tablet/.test(ua)) return 'mobile';
  if (/tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

function getInitialRole(): DeviceRole {
  const params = new URLSearchParams(window.location.search);
  const roleParam = params.get('role')?.toUpperCase();
  if (roleParam === 'SOC' || roleParam === 'CUSTOMER' || roleParam === 'ATTACKER') {
    return roleParam as DeviceRole;
  }
  const hash = window.location.hash.toLowerCase();
  if (hash.includes('soc')) return 'SOC';
  const stored = localStorage.getItem('finguard_device_role') as DeviceRole | null;
  if (stored === 'SOC' || stored === 'CUSTOMER' || stored === 'ATTACKER') {
    return stored;
  }
  return 'CUSTOMER';
}

function getInitialBank(): BankId | null {
  const params = new URLSearchParams(window.location.search);
  const bankParam = params.get('bank')?.toUpperCase();
  if (bankParam === 'ALPHA' || bankParam === 'NOVA' || bankParam === 'HORIZON') {
    return bankParam as BankId;
  }
  const stored = localStorage.getItem('finguard_device_bank') as BankId | null;
  if (stored === 'ALPHA' || stored === 'NOVA' || stored === 'HORIZON') {
    return stored;
  }
  return 'ALPHA';
}

export interface DeviceContextValue {
  deviceId: string;
  sessionId: string;
  role: DeviceRole;
  bank: BankId | null;
  status: ConnectionStatus;
  connectedAt: string;
  lastSeen: string;
  device: Device | null;
  loading: boolean;
  setRole: (role: DeviceRole) => void;
  setBank: (bank: BankId | null) => void;
  // Phase 2.5A: User Isolation & Banking Session
  activeCustomerId: string | null;
  activeAccountId: string | null;
  loginDemoUser: (customerId: string) => Promise<void>;
  logoutDemoUser: () => Promise<void>;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Persistent Device ID (localStorage - persists across logins/logouts)
  const [deviceId] = useState<string>(() => {
    let stored = localStorage.getItem('finguard_device_id');
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem('finguard_device_id', stored);
    }
    return stored;
  });

  // 2. Distinct Session ID (sessionStorage)
  const [sessionId] = useState<string>(() => {
    let stored = sessionStorage.getItem('finguard_session_id');
    if (!stored) {
      stored = crypto.randomUUID();
      sessionStorage.setItem('finguard_session_id', stored);
    }
    return stored;
  });

  // 3. Authenticated Banking Customer Session (sessionStorage)
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(() => {
    return sessionStorage.getItem('finguard_active_customer_id') || null;
  });

  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    const custId = sessionStorage.getItem('finguard_active_customer_id');
    if (custId && DEMO_IDENTITIES[custId]) {
      return DEMO_IDENTITIES[custId].accountId;
    }
    return null;
  });

  // 4. Configurable Device Role & Bank
  const [role, setRoleState] = useState<DeviceRole>(() => {
    const custId = sessionStorage.getItem('finguard_active_customer_id');
    if (custId && DEMO_IDENTITIES[custId]) {
      return DEMO_IDENTITIES[custId].role;
    }
    return getInitialRole();
  });

  const [bank, setBankState] = useState<BankId | null>(() => {
    const custId = sessionStorage.getItem('finguard_active_customer_id');
    if (custId && DEMO_IDENTITIES[custId]) {
      return DEMO_IDENTITIES[custId].bankId;
    }
    return getInitialBank();
  });

  // 5. Connection status and timestamps
  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [connectedAt] = useState<string>(() => {
    const sessionConnectedAt = sessionStorage.getItem('finguard_session_connected_at');
    if (sessionConnectedAt) return sessionConnectedAt;
    const now = new Date().toISOString();
    sessionStorage.setItem('finguard_session_connected_at', now);
    return now;
  });
  const [lastSeen, setLastSeen] = useState<string>(new Date().toISOString());

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Update setters with local persistence
  const setRole = useCallback((newRole: DeviceRole) => {
    setRoleState(newRole);
    localStorage.setItem('finguard_device_role', newRole);
  }, []);

  const setBank = useCallback((newBank: BankId | null) => {
    setBankState(newBank);
    if (newBank) {
      localStorage.setItem('finguard_device_bank', newBank);
    } else {
      localStorage.removeItem('finguard_device_bank');
    }
  }, []);

  // 6. Login Demo User
  const loginDemoUser = useCallback(
    async (customerId: string) => {
      const identity = DEMO_IDENTITIES[customerId];
      if (!identity) {
        throw new Error(`Demo identity '${customerId}' not found.`);
      }

      setLoading(true);

      // Ensure Firebase Auth session is active
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error('[FinGuard Device] Sign in error during login:', e);
        }
      }

      // Establish session state
      setActiveCustomerId(customerId);
      setActiveAccountId(identity.accountId);
      setRoleState(identity.role);
      setBankState(identity.bankId);

      sessionStorage.setItem('finguard_active_customer_id', customerId);
      localStorage.setItem('finguard_device_role', identity.role);
      if (identity.bankId) {
        localStorage.setItem('finguard_device_bank', identity.bankId);
      }

      // Associate authenticated session with Firestore device registry
      if (deviceId) {
        const deviceRef = doc(devicesCol(), deviceId);
        const currentIso = new Date().toISOString();
        try {
          await setDoc(
            deviceRef,
            {
              device_id: deviceId,
              sessionId,
              customerId,
              customer_id: customerId,
              accountId: identity.accountId,
              role: identity.role,
              bank: identity.bankId,
              firebaseUid: auth.currentUser?.uid || null,
              status: 'ONLINE',
              lastSeen: currentIso,
              last_seen: currentIso,
            },
            { merge: true }
          );

          if (auth.currentUser?.uid) {
            const authDeviceRef = doc(devicesCol(), auth.currentUser.uid);
            await setDoc(
              authDeviceRef,
              {
                device_id: deviceId,
                customerId,
                customer_id: customerId,
                accountId: identity.accountId,
                role: identity.role,
                bank: identity.bankId,
                firebaseUid: auth.currentUser.uid,
                status: 'ONLINE',
                lastSeen: currentIso,
                last_seen: currentIso,
              },
              { merge: true }
            );
          }
        } catch (err) {
          console.warn('[FinGuard Device] Error updating device on login:', err);
        }
      }

      setStatus('ONLINE');
      setLoading(false);
    },
    [deviceId, sessionId]
  );

  // 7. Logout Demo User
  const logoutDemoUser = useCallback(async () => {
    setLoading(true);

    // Clear active customer context
    setActiveCustomerId(null);
    setActiveAccountId(null);
    setRoleState('CUSTOMER');

    sessionStorage.removeItem('finguard_active_customer_id');

    // Update Firestore device registry (keep deviceId, clear customerId)
    if (deviceId && auth.currentUser) {
      const deviceRef = doc(devicesCol(), deviceId);
      const currentIso = new Date().toISOString();
      try {
        await updateDoc(deviceRef, {
          customerId: null,
          customer_id: null,
          accountId: null,
          role: 'CUSTOMER',
          lastSeen: currentIso,
          last_seen: currentIso,
        });
      } catch (err) {
        console.warn('[FinGuard Device] Error clearing device on logout:', err);
      }
    }

    // Sign out from Firebase Auth
    try {
      await fbSignOut(auth);
      // Auto-reconnect anonymously so Firestore permissions are ready for the next login
      await signInAnonymously(auth);
    } catch (err) {
      console.warn('[FinGuard Device] Error during sign out:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // 8. Firebase Auth readiness check and auto-anonymous auth for #/device & #/soc
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setStatus('CONNECTING');
        const hash = window.location.hash.toLowerCase();
        if (hash.includes('device') || hash.includes('soc')) {
          try {
            await signInAnonymously(auth);
          } catch (err) {
            console.warn('[FinGuard Device] Auto-anonymous sign in error:', err);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  // 9. Device registration in Firestore ONLY after Firebase authentication is ready
  useEffect(() => {
    if (!isAuthenticated || !deviceId) {
      return;
    }

    let isMounted = true;
    const nowIso = new Date().toISOString();
    const deviceRef = doc(devicesCol(), deviceId);

    const registerDevice = async () => {
      const sessionData: Partial<Device> = {
        device_id: deviceId,
        sessionId,
        role,
        bank,
        status: 'ONLINE',
        connectedAt,
        lastSeen: nowIso,
        first_seen: nowIso,
        last_seen: nowIso,
        known: true,
        device_type: inferDeviceType(),
        model: navigator?.platform || 'Unknown',
        os: navigator?.userAgent || 'Unknown',
        customerId: activeCustomerId,
        customer_id: activeCustomerId || '',
        accountId: activeAccountId,
        firebaseUid: auth.currentUser?.uid || null,
      };

      try {
        await setDoc(deviceRef, sessionData, { merge: true });
        if (isMounted) {
          setStatus('ONLINE');
          setLastSeen(nowIso);
          setLoading(false);
        }
      } catch (err) {
        console.error('[FinGuard Device] Firestore registration error:', err);
        if (isMounted) {
          setStatus('OFFLINE');
          setLoading(false);
        }
      }
    };

    registerDevice();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, deviceId, sessionId, role, bank, connectedAt, activeCustomerId, activeAccountId]);

  // 10. Realtime Heartbeat (15s interval, strictly cleaned up on unmount)
  useEffect(() => {
    if (!isAuthenticated || !deviceId || status !== 'ONLINE') {
      return;
    }

    const deviceRef = doc(devicesCol(), deviceId);

    const interval = setInterval(async () => {
      const currentIso = new Date().toISOString();
      try {
        await updateDoc(deviceRef, {
          lastSeen: currentIso,
          last_seen: currentIso,
          status: 'ONLINE',
        });
        setLastSeen(currentIso);
      } catch (err) {
        console.warn('[FinGuard Device] Heartbeat failed:', err);
      }
    }, 15_000);

    const handleBeforeUnload = () => {
      const offlineIso = new Date().toISOString();
      updateDoc(deviceRef, {
        status: 'OFFLINE',
        lastSeen: offlineIso,
        last_seen: offlineIso,
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, deviceId, status]);

  // 11. Listen to own device document in Firestore
  useEffect(() => {
    if (!isAuthenticated || !deviceId) {
      return;
    }
    const deviceRef = doc(devicesCol(), deviceId);
    const unsub = onSnapshot(
      deviceRef,
      (snap) => {
        if (snap.exists()) {
          setDevice(snap.data() as Device);
        }
      },
      (err) => {
        console.warn('[FinGuard Device] onSnapshot error:', err);
      }
    );
    return () => unsub();
  }, [isAuthenticated, deviceId]);

  return (
    <DeviceContext.Provider
      value={{
        deviceId,
        sessionId,
        role,
        bank,
        status,
        connectedAt,
        lastSeen,
        device,
        loading,
        setRole,
        setBank,
        activeCustomerId,
        activeAccountId,
        loginDemoUser,
        logoutDemoUser,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return ctx;
}
