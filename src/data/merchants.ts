import { Merchant } from '../types';

/**
 * Synthetic Merchants Registry
 * Realistic Indian & International merchant ecosystem across multiple risk categories.
 */
export const SYNTHETIC_MERCHANTS: Record<string, Merchant> = {
  MERCH_01: {
    merchant_id: 'MERCH_01',
    name: 'FreshMart Supermarket',
    category: 'STANDARD',
    mcc_code: '5411', // Grocery
    city: 'Bengaluru',
    risk_score: 5,
    dispute_rate: 0.1,
    flagged_fraud_count: 0,
  },
  MERCH_02: {
    merchant_id: 'MERCH_02',
    name: 'Apex Electronics Hub',
    category: 'ELECTRONICS',
    mcc_code: '5732', // Consumer Electronics
    city: 'Delhi',
    risk_score: 35,
    dispute_rate: 1.2,
    flagged_fraud_count: 3,
  },
  MERCH_03: {
    merchant_id: 'MERCH_03',
    name: 'Luxury Jewels & Bullion',
    category: 'JEWELLERY',
    mcc_code: '5094', // Precious stones/metals
    city: 'Mumbai',
    risk_score: 85,
    dispute_rate: 4.8,
    flagged_fraud_count: 14,
  },
  MERCH_04: {
    merchant_id: 'MERCH_04',
    name: 'QuickBite Food Delivery',
    category: 'STANDARD',
    mcc_code: '5814', // Fast food
    city: 'Bengaluru',
    risk_score: 8,
    dispute_rate: 0.2,
    flagged_fraud_count: 0,
  },
  MERCH_05: {
    merchant_id: 'MERCH_05',
    name: 'IndiGo Airlines Bookings',
    category: 'STANDARD',
    mcc_code: '3000', // Airlines
    city: 'Gurugram',
    risk_score: 15,
    dispute_rate: 0.4,
    flagged_fraud_count: 1,
  },
  MERCH_06: {
    merchant_id: 'MERCH_06',
    name: 'PeerTrade P2P Crypto Exchange',
    category: 'CRYPTO',
    mcc_code: '6051', // Quasi-cash / Crypto
    city: 'Offshore',
    risk_score: 92,
    dispute_rate: 8.5,
    flagged_fraud_count: 38,
  },
  MERCH_07: {
    merchant_id: 'MERCH_07',
    name: 'Taj Palace Hotels & Resorts',
    category: 'STANDARD',
    mcc_code: '3501', // Hotels
    city: 'Mumbai',
    risk_score: 12,
    dispute_rate: 0.3,
    flagged_fraud_count: 0,
  },
  MERCH_08: {
    merchant_id: 'MERCH_08',
    name: 'ChaloRide Cabs',
    category: 'STANDARD',
    mcc_code: '4121', // Taxicabs
    city: 'Bengaluru',
    risk_score: 6,
    dispute_rate: 0.15,
    flagged_fraud_count: 0,
  },
  MERCH_09: {
    merchant_id: 'MERCH_09',
    name: 'Global Play Gaming Lounge',
    category: 'GAMING',
    mcc_code: '7995', // Betting / Gaming
    city: 'Goa',
    risk_score: 78,
    dispute_rate: 5.2,
    flagged_fraud_count: 19,
  },
  MERCH_10: {
    merchant_id: 'MERCH_10',
    name: 'MedPlus Pharmacy',
    category: 'STANDARD',
    mcc_code: '5912', // Drug stores
    city: 'Hyderabad',
    risk_score: 7,
    dispute_rate: 0.05,
    flagged_fraud_count: 0,
  },
  MERCH_11: {
    merchant_id: 'MERCH_11',
    name: 'Apollo Diagnostics',
    category: 'STANDARD',
    mcc_code: '8099', // Medical services
    city: 'Chennai',
    risk_score: 4,
    dispute_rate: 0.02,
    flagged_fraud_count: 0,
  },
  MERCH_12: {
    merchant_id: 'MERCH_12',
    name: 'Zomato Dining & Gold',
    category: 'STANDARD',
    mcc_code: '5812', // Restaurants
    city: 'Delhi',
    risk_score: 9,
    dispute_rate: 0.2,
    flagged_fraud_count: 0,
  },
};
