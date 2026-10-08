import { LoginEvent, NetworkSignal } from '../types';

/**
 * Synthetic Login Events Registry
 * Preserves all canonical events for C1001, C1002, C1003.
 * Supports impossible travel, login failure bursts, and shared IP telemetry.
 */
export const SYNTHETIC_LOGIN_EVENTS: LoginEvent[] = [
  // ─── CANONICAL LOGIN EVENTS (PRESERVED) ─────────────────────────────────────
  // C1001: Consistent legitimate logins
  {
    event_id: 'LOG-1001-01',
    customer_id: 'C1001',
    timestamp: '2026-10-07T08:15:00Z',
    ip_address: '122.167.45.12',
    city: 'Bengaluru',
    device_id: 'DEV-1001-A',
    success: true,
  },
  {
    event_id: 'LOG-1001-02',
    customer_id: 'C1001',
    timestamp: '2026-10-07T19:28:00Z',
    ip_address: '122.167.45.12',
    city: 'Bengaluru',
    device_id: 'DEV-1001-A',
    success: true,
  },
  {
    event_id: 'LOG-1001-TRAVEL',
    customer_id: 'C1001',
    timestamp: '2026-09-25T14:00:00Z',
    ip_address: '106.51.78.20',
    city: 'Chennai',
    device_id: 'DEV-1001-A',
    success: true,
  },

  // C1002: Login with new device
  {
    event_id: 'LOG-1002-01',
    customer_id: 'C1002',
    timestamp: '2026-10-07T14:15:00Z',
    ip_address: '49.36.128.55',
    city: 'Delhi',
    device_id: 'DEV-1002-A',
    success: true,
  },
  {
    event_id: 'LOG-1002-02',
    customer_id: 'C1002',
    timestamp: '2026-10-07T23:12:00Z',
    ip_address: '49.36.128.55',
    city: 'Delhi',
    device_id: 'DEV-1002-NEW',
    success: true,
  },

  // C1003: Known device baseline in Bengaluru
  {
    event_id: 'LOG-1003-01',
    customer_id: 'C1003',
    timestamp: '2026-10-06T20:40:00Z',
    ip_address: '106.51.22.10',
    city: 'Bengaluru',
    device_id: 'DEV-1003-A',
    success: true,
  },
  // C1003: Multiple failed login attempts from rogue device/IP in Mumbai
  {
    event_id: 'LOG-1003-FAIL-01',
    customer_id: 'C1003',
    timestamp: '2026-10-07T01:58:00Z',
    ip_address: '103.21.144.92',
    city: 'Mumbai',
    device_id: 'DEV-1003-ROGUE',
    success: false,
    failure_reason: 'BAD_PASSWORD',
  },
  {
    event_id: 'LOG-1003-FAIL-02',
    customer_id: 'C1003',
    timestamp: '2026-10-07T02:04:00Z',
    ip_address: '103.21.144.92',
    city: 'Mumbai',
    device_id: 'DEV-1003-ROGUE',
    success: false,
    failure_reason: 'BAD_PASSWORD',
  },
  {
    event_id: 'LOG-1003-FAIL-03',
    customer_id: 'C1003',
    timestamp: '2026-10-07T02:09:00Z',
    ip_address: '103.21.144.92',
    city: 'Mumbai',
    device_id: 'DEV-1003-ROGUE',
    success: false,
    failure_reason: 'BAD_PASSWORD',
  },
  {
    event_id: 'LOG-1003-SUCCESS',
    customer_id: 'C1003',
    timestamp: '2026-10-07T02:11:00Z',
    ip_address: '103.21.144.92',
    city: 'Mumbai',
    device_id: 'DEV-1003-ROGUE',
    success: true,
  },

  // ─── EXPANDED LOGIN EVENTS ──────────────────────────────────────────────────
  // C1004 (Frequent Traveler - Scenario D: Mumbai airport lounge, legitimate)
  {
    event_id: 'LOG-1004-BLR',
    customer_id: 'C1004',
    timestamp: '2026-10-06T09:00:00Z',
    ip_address: '122.167.10.4',
    city: 'Bengaluru',
    device_id: 'DEV-1004-TRAVEL-A',
    success: true,
  },
  {
    event_id: 'LOG-1004-MUM-AIRPORT',
    customer_id: 'C1004',
    timestamp: '2026-10-07T13:45:00Z',
    ip_address: '14.143.44.88', // Mumbai Airport Wi-Fi
    city: 'Mumbai',
    device_id: 'DEV-1004-TRAVEL-A',
    success: true,
  },

  // C1005 (HNW Mumbai)
  {
    event_id: 'LOG-1005-01',
    customer_id: 'C1005',
    timestamp: '2026-10-07T11:00:00Z',
    ip_address: '115.112.89.14',
    city: 'Mumbai',
    device_id: 'DEV-1005-A',
    success: true,
  },

  // C1006 (Upgraded iPhone in Kolkata)
  {
    event_id: 'LOG-1006-01',
    customer_id: 'C1006',
    timestamp: '2026-10-07T16:30:00Z',
    ip_address: '182.74.92.11',
    city: 'Kolkata',
    device_id: 'DEV-1006-IPHONE16',
    success: true,
  },

  // C1007 (Weekend Goa trip on known device)
  {
    event_id: 'LOG-1007-01',
    customer_id: 'C1007',
    timestamp: '2026-10-07T17:50:00Z',
    ip_address: '117.211.34.60',
    city: 'Goa',
    device_id: 'DEV-1007-A',
    success: true,
  },

  // C1009 (Doctor night login)
  {
    event_id: 'LOG-1009-NIGHT',
    customer_id: 'C1009',
    timestamp: '2026-10-07T03:15:00Z',
    ip_address: '117.240.18.99',
    city: 'Lucknow',
    device_id: 'DEV-1009-A',
    success: true,
  },

  // C1010 (Forgotten password flow)
  {
    event_id: 'LOG-1010-FAIL-1',
    customer_id: 'C1010',
    timestamp: '2026-10-07T10:05:00Z',
    ip_address: '117.212.80.12',
    city: 'Kochi',
    device_id: 'DEV-1010-A',
    success: false,
    failure_reason: 'BAD_PASSWORD',
  },
  {
    event_id: 'LOG-1010-OK',
    customer_id: 'C1010',
    timestamp: '2026-10-07T10:14:00Z',
    ip_address: '117.212.80.12',
    city: 'Kochi',
    device_id: 'DEV-1010-A',
    success: true,
  },

  // C1011 (Impossible Travel: Delhi 10:00 -> London 10:25)
  {
    event_id: 'LOG-1011-DELHI',
    customer_id: 'C1011',
    timestamp: '2026-10-07T10:00:00Z',
    ip_address: '49.36.10.15',
    city: 'Delhi',
    device_id: 'DEV-1011-A',
    success: true,
  },
  {
    event_id: 'LOG-1011-LONDON-IMPOSSIBLE',
    customer_id: 'C1011',
    timestamp: '2026-10-07T10:25:00Z',
    ip_address: '185.220.101.44', // UK Tor node
    city: 'London',
    device_id: 'DEV-1011-ROGUE-UK',
    success: true,
    vpn_or_proxy_detected: true,
  },

  // C1012 (Commercial Datacenter VPN)
  {
    event_id: 'LOG-1012-VPN',
    customer_id: 'C1012',
    timestamp: '2026-10-07T21:30:00Z',
    ip_address: '198.51.100.22', // DigitalOcean ASN
    city: 'Frankfurt',
    device_id: 'DEV-1012-A',
    success: true,
    vpn_or_proxy_detected: true,
  },

  // C1013 & C1014 (Shared Family Desktop in Chennai)
  {
    event_id: 'LOG-1013-FAMILY',
    customer_id: 'C1013',
    timestamp: '2026-10-07T16:00:00Z',
    ip_address: '106.51.88.20',
    city: 'Chennai',
    device_id: 'DEV-SHARED-FAMILY-DESKTOP',
    success: true,
  },
  {
    event_id: 'LOG-1014-FAMILY',
    customer_id: 'C1014',
    timestamp: '2026-10-07T17:15:00Z',
    ip_address: '106.51.88.20',
    city: 'Chennai',
    device_id: 'DEV-SHARED-FAMILY-DESKTOP',
    success: true,
  },

  // C1015, C1016, C1017, C1018 (Scenario E - Fraud Ring Logins from Single Rogue IP)
  {
    event_id: 'LOG-1015-RING',
    customer_id: 'C1015',
    timestamp: '2026-10-07T03:00:00Z',
    ip_address: '185.220.101.5',
    city: 'Pune',
    device_id: 'DEV-RING-DEVICE-01',
    success: true,
  },
  {
    event_id: 'LOG-1016-RING',
    customer_id: 'C1016',
    timestamp: '2026-10-07T03:05:00Z',
    ip_address: '185.220.101.5',
    city: 'Pune',
    device_id: 'DEV-RING-DEVICE-01',
    success: true,
  },
  {
    event_id: 'LOG-1017-RING',
    customer_id: 'C1017',
    timestamp: '2026-10-07T03:10:00Z',
    ip_address: '185.220.101.5',
    city: 'Pune',
    device_id: 'DEV-RING-DEVICE-01',
    success: true,
  },
  {
    event_id: 'LOG-1018-RING',
    customer_id: 'C1018',
    timestamp: '2026-10-07T03:15:00Z',
    ip_address: '185.220.101.5',
    city: 'Pune',
    device_id: 'DEV-RING-DEVICE-01',
    success: true,
  },

  // C1020 (Prompt Injection Target Persona)
  {
    event_id: 'LOG-1020-NORMAL',
    customer_id: 'C1020',
    timestamp: '2026-10-07T11:45:00Z',
    ip_address: '122.167.33.15',
    city: 'Bengaluru',
    device_id: 'DEV-1020-A',
    success: true,
  },
];

/**
 * Synthetic Network Signals Registry
 * Provides IP intelligence, ASN metadata, proxy flags, and entity correlation graphs.
 */
export const SYNTHETIC_NETWORK_SIGNALS: NetworkSignal[] = [
  {
    signal_id: 'NET-AIRTEL-BLR-01',
    ip_address: '122.167.45.12',
    asn: 'AS24560',
    isp: 'Bharti Airtel Residential Fiber',
    city: 'Bengaluru',
    country: 'IN',
    is_vpn: false,
    is_tor: false,
    is_datacenter_proxy: false,
    associated_customer_ids: ['C1001'],
    associated_device_ids: ['DEV-1001-A'],
    risk_weight: 0,
  },
  {
    signal_id: 'NET-JIO-DEL-01',
    ip_address: '49.36.128.55',
    asn: 'AS55836',
    isp: 'Reliance Jio 5G Mobile',
    city: 'Delhi',
    country: 'IN',
    is_vpn: false,
    is_tor: false,
    is_datacenter_proxy: false,
    associated_customer_ids: ['C1002'],
    associated_device_ids: ['DEV-1002-A', 'DEV-1002-NEW'],
    risk_weight: 5,
  },
  {
    signal_id: 'NET-ROGUE-MUM-01',
    ip_address: '103.21.144.92',
    asn: 'AS13335',
    isp: 'Cloud Hosting Proxy Network',
    city: 'Mumbai',
    country: 'IN',
    is_vpn: true,
    is_tor: false,
    is_datacenter_proxy: true,
    associated_customer_ids: ['C1003'],
    associated_device_ids: ['DEV-1003-ROGUE'],
    risk_weight: 45,
  },
  {
    signal_id: 'NET-MUM-AIRPORT',
    ip_address: '14.143.44.88',
    asn: 'AS4755',
    isp: 'Tata Communications Public Airport Wi-Fi',
    city: 'Mumbai',
    country: 'IN',
    is_vpn: false,
    is_tor: false,
    is_datacenter_proxy: false,
    associated_customer_ids: ['C1004'],
    associated_device_ids: ['DEV-1004-TRAVEL-A'],
    risk_weight: 5, // Airport Wi-Fi alone is low risk with known device
  },
  {
    signal_id: 'NET-TOR-EXIT-UK',
    ip_address: '185.220.101.44',
    asn: 'AS60729',
    isp: 'Tor Anonymous Exit Node',
    city: 'London',
    country: 'GB',
    is_vpn: false,
    is_tor: true,
    is_datacenter_proxy: true,
    associated_customer_ids: ['C1011'],
    associated_device_ids: ['DEV-1011-ROGUE-UK'],
    risk_weight: 75,
  },
  {
    signal_id: 'NET-FRAUD-RING-CLUSTER',
    ip_address: '185.220.101.5',
    asn: 'AS60729',
    isp: 'Suspicious Datacenter Gateway',
    city: 'Pune',
    country: 'IN',
    is_vpn: true,
    is_tor: false,
    is_datacenter_proxy: true,
    associated_customer_ids: ['C1015', 'C1016', 'C1017', 'C1018'],
    associated_device_ids: ['DEV-RING-DEVICE-01'],
    risk_weight: 85,
  },
  {
    signal_id: 'NET-SHARED-HOME-LAN',
    ip_address: '106.51.88.20',
    asn: 'AS24560',
    isp: 'Airtel Broadband Residential',
    city: 'Chennai',
    country: 'IN',
    is_vpn: false,
    is_tor: false,
    is_datacenter_proxy: false,
    associated_customer_ids: ['C1013', 'C1014'],
    associated_device_ids: ['DEV-SHARED-FAMILY-DESKTOP'],
    risk_weight: 0,
  },
];
