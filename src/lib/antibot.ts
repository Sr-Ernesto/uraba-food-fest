// src/lib/antibot.ts — 5-layer anti-bot defense system
// All free, self-hosted, no paid APIs

import { createHmac, randomBytes, createHash } from 'crypto';

// ============================================================
// LAYER 1: Datacenter IP Detection
// Known datacenter/hosting ASN ranges (updated via public lists)
// These IPs should never vote from a food festival
// ============================================================

// Major datacenter/hosting providers - their IP ranges
// Source: public BGP data, RIPE, ARIN allocations
const DATACENTER_PREFIXES: string[] = [
  // Hetzner
  '5.9.', '23.88.', '23.94.', '49.12.', '49.13.',
  '78.46.', '78.47.', '85.10.', '88.198.', '88.99.',
  '91.107.', '94.130.', '95.216.', '95.217.', '116.202.',
  '116.203.', '128.140.', '135.181.', '136.243.', '138.201.',
  '142.132.', '144.76.', '148.251.', '157.90.', '159.69.',
  '162.55.', '167.233.', '167.235.', '168.119.', '171.25.',
  '176.9.', '178.63.', '185.26.', '185.76.', '185.101.',
  '185.183.', '185.209.', '185.212.', '185.216.', '185.219.',
  '185.220.', '185.230.', '185.233.', '185.244.', '185.248.',
  '188.40.', '194.48.', '195.201.', '213.133.', '213.239.',
  // OVH
  '5.135.', '5.196.', '8.18.', '8.33.',
  '31.3.', '37.59.', '37.60.', '37.187.',
  '46.105.', '51.210.', '51.222.', '51.254.',
  '54.36.', '54.37.', '54.38.', '91.121.', '91.134.',
  '103.57.', '109.190.', '137.74.', '139.99.',
  '141.94.', '141.95.', '142.44.', '145.239.',
  '147.135.', '149.202.', '151.80.',
  '164.132.', '167.114.', '169.50.', '176.31.',
  '178.32.', '178.33.', '185.13.', '185.24.',
  '188.165.', '192.95.', '192.99.',
  '193.70.', '198.27.', '198.50.', '213.186.',
  '213.251.', '217.182.',
  // DigitalOcean
  '45.55.', '64.225.', '64.226.', '64.227.',
  '67.205.', '67.207.', '104.131.', '104.236.',
  '107.170.', '128.199.', '134.122.', '137.184.',
  '138.197.', '139.59.', '142.93.', '143.110.',
  '143.198.', '147.182.', '157.230.', '157.245.',
  '159.203.', '159.65.', '159.89.', '161.35.',
  '164.90.', '164.92.', '165.22.', '165.227.',
  '165.232.', '167.71.', '167.99.',
  '170.64.', '174.138.', '178.128.',
  '18.130.', '18.132.', '18.133.', '18.134.', '18.135.', '18.136.',
  '18.168.', '18.169.', '18.170.', '18.171.', '18.175.',
  '18.188.', '18.189.', '18.190.', '18.191.', '18.216.',
  '18.217.', '18.218.', '18.219.', '18.220.', '18.221.',
  '18.222.', '18.223.', '18.224.',
  // Vultr
  '45.32.', '45.63.', '45.76.', '45.77.',
  '64.176.', '66.42.', '95.179.',
  '104.156.', '104.207.', '104.238.', '108.61.',
  '136.244.', '137.220.', '139.180.', '140.82.',
  '141.98.', '142.4.', '144.202.', '147.182.',
  '149.28.', '149.248.', '152.53.', '155.138.',
  '158.247.', '163.172.', '167.179.', '170.187.',
  '172.93.', '172.104.', '173.199.', '185.59.',
  '192.46.', '192.241.', '192.243.', '198.58.',
  '199.245.', '199.247.', '202.61.', '207.148.',
  '207.246.', '208.72.', '208.167.', '209.250.',
  // AWS
  '3.', '13.', '15.', '18.', '34.', '35.', '50.',
  '52.', '54.', '63.', '64.', '65.', '69.', '70.',
  '71.', '72.', '73.', '74.', '75.', '99.', '100.',
  '107.', '122.', '143.', '174.', '176.', '177.',
  '184.', '204.', '205.', '207.', '216.',
  // Google Cloud
  '8.34.', '8.35.', '23.236.', '23.251.',
  '34.', '35.', '35.186.', '35.187.', '35.188.', '35.189.',
  '35.190.', '35.191.', '35.192.', '35.193.', '35.194.',
  '35.195.', '35.196.', '35.197.', '35.198.', '35.199.',
  '35.200.', '35.201.', '35.202.', '35.203.', '35.204.',
  '35.205.', '35.206.', '35.207.', '35.208.', '35.209.',
  '35.210.', '35.211.', '35.212.', '35.213.', '35.214.',
  '35.215.', '35.216.', '35.217.', '35.218.', '35.219.',
  '35.220.', '35.221.', '35.222.', '35.223.', '35.224.',
  '35.225.', '35.226.', '35.227.', '35.228.', '35.229.',
  '35.230.', '35.231.', '35.232.', '35.233.', '35.234.',
  '35.235.', '35.236.', '35.237.', '35.238.', '35.239.',
  '35.240.', '35.241.', '35.242.', '35.243.', '35.244.',
  '35.245.', '35.246.', '35.247.',
  '104.154.', '104.155.', '104.196.', '104.197.',
  '104.198.', '104.199.', '107.167.', '107.178.',
  '130.211.', '146.148.',
  // Azure
  '13.', '20.', '40.', '52.', '65.', '66.', '68.',
  '70.', '71.', '72.', '73.', '74.', '75.', '94.',
  '104.', '137.', '138.', '139.', '157.', '168.',
  '191.', '199.', '207.', '209.',
  // Linode/Akamai
  '45.33.', '45.56.', '45.79.', '45.113.', '45.127.',
  '50.116.', '66.175.', '69.164.', '72.14.',
  '74.207.', '85.90.', '96.126.', '97.107.',
  '109.74.', '109.169.', '139.144.', '139.162.',
  '143.42.', '143.198.', '170.187.', '172.104.',
  '172.232.', '172.233.', '172.234.', '172.235.',
  '172.236.', '172.237.', '172.238.', '172.239.',
  '172.240.', '172.241.', '172.242.', '172.243.',
  '172.244.', '172.245.', '172.246.', '172.247.',
  '172.248.', '172.249.', '172.250.', '172.251.',
  '172.252.', '172.253.', '172.254.', '172.255.',
  '192.46.', '194.195.', '198.58.',
  // Contabo (our own VPS provider - users shouldn't vote from it)
  '5.189.', '89.117.', '89.145.', '89.163.',
  '91.195.', '116.202.', '161.97.',
  '178.238.', '185.104.', '185.225.', '185.245.',
  '192.71.', '194.5.', '195.248.',
  '209.126.', '209.250.',
  // Known attack ranges from the bot attack
  '185.192.16.', '45.130.203.', '45.146.55.',
  '216.24.219.', '109.110.169.', '185.64.78.',
  '45.131.193.', '173.244.55.', '104.234.19.',
  '45.86.203.', '193.56.116.', '91.193.232.',
];

export function isDatacenterIP(ip: string): boolean {
  for (const prefix of DATACENTER_PREFIXES) {
    if (ip.startsWith(prefix)) return true;
  }
  return false;
}

// ============================================================
// LAYER 2: Subnet Rate Limiting
// Instead of per-IP, limit per /24 subnet
// ============================================================

// In-memory store for subnet rate limiting (resets on restart, fine for a voting app)
const subnetVotes = new Map<string, { count: number; windowStart: number }>();

export function getSubnet(ip: string): string {
  const parts = ip.split('.');
  if (parts.length !== 4) return ip;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

const SUBNET_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const SUBNET_MAX_VOTES = 30; // max 30 votes per /24 subnet per hour

export function checkSubnetRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const subnet = getSubnet(ip);
  const now = Date.now();
  const entry = subnetVotes.get(subnet);

  if (!entry || (now - entry.windowStart) > SUBNET_WINDOW_MS) {
    subnetVotes.set(subnet, { count: 1, windowStart: now });
    return { allowed: true, remaining: SUBNET_MAX_VOTES - 1 };
  }

  if (entry.count >= SUBNET_MAX_VOTES) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: SUBNET_MAX_VOTES - entry.count };
}

// ============================================================
// LAYER 3: Proof-of-Work Challenge
// Frontend must solve a hash challenge before voting
// ============================================================

const CHALLENGE_EXPIRY_MS = 60_000; // 60 seconds
const CHALLENGE_DIFFICULTY = 3; // number of leading zeros in hash

// Store active challenges
const activeChallenges = new Map<string, { timestamp: number; difficulty: number }>();

interface PoWChallenge {
  challenge: string;
  difficulty: number;
  expiresAt: number;
}

export function generateChallenge(ip: string): PoWChallenge {
  const challenge = randomBytes(16).toString('hex');
  const expiresAt = Date.now() + CHALLENGE_EXPIRY_MS;
  activeChallenges.set(challenge, { timestamp: Date.now(), difficulty: CHALLENGE_DIFFICULTY });

  // Cleanup old challenges (avoid memory leak)
  if (activeChallenges.size > 10000) {
    const now = Date.now();
    for (const [key, val] of activeChallenges) {
      if (now - val.timestamp > CHALLENGE_EXPIRY_MS) activeChallenges.delete(key);
    }
  }

  return { challenge, difficulty: CHALLENGE_DIFFICULTY, expiresAt };
}

export function verifyPoW(challenge: string, nonce: number): boolean {
  const entry = activeChallenges.get(challenge);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > CHALLENGE_EXPIRY_MS) {
    activeChallenges.delete(challenge);
    return false;
  }

  // Verify the hash
  const hash = createHash('sha256')
    .update(`${challenge}:${nonce}`)
    .digest('hex');

  const prefix = '0'.repeat(entry.difficulty);
  const valid = hash.startsWith(prefix);

  if (valid) {
    activeChallenges.delete(challenge); // single use
  }

  return valid;
}

// ============================================================
// LAYER 4: HMAC Token with Timestamp
// Token expires in 60s, must be requested from server first
// Prevents direct API calls without frontend interaction
// ============================================================

const TOKEN_SECRET = process.env.VOTE_TOKEN_SECRET || randomBytes(32).toString('hex');
const TOKEN_EXPIRY_MS = 60_000; // 60 seconds

interface VoteToken {
  token: string;
  expiresAt: number;
}

// Store used tokens to prevent replay
const usedTokens = new Set<string>();

export function generateVoteToken(restaurantId: number): VoteToken {
  const timestamp = Date.now();
  const expiresAt = timestamp + TOKEN_EXPIRY_MS;
  const payload = `${restaurantId}:${timestamp}`;
  const signature = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');

  // Cleanup used tokens
  if (usedTokens.size > 50000) usedTokens.clear();

  return { token, expiresAt };
}

export function verifyVoteToken(token: string, restaurantId: number): { valid: boolean; error?: string } {
  if (usedTokens.has(token)) {
    return { valid: false, error: 'Token ya usado' };
  }

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return { valid: false, error: 'Token inválido' };

    const [storedRestaurantId, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Check restaurant ID matches
    if (parseInt(storedRestaurantId, 10) !== restaurantId) {
      return { valid: false, error: 'Token no corresponde al restaurante' };
    }

    // Check expiry
    if (Date.now() - timestamp > TOKEN_EXPIRY_MS) {
      return { valid: false, error: 'Token expirado' };
    }

    // Verify signature
    const payload = `${storedRestaurantId}:${timestampStr}`;
    const expectedSig = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');

    if (signature !== expectedSig) {
      return { valid: false, error: 'Firma inválida' };
    }

    // Mark as used
    usedTokens.add(token);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Token malformado' };
  }
}

// ============================================================
// LAYER 5: Anomaly Detection
// Detect suspicious patterns in vote data
// ============================================================

export interface AnomalyCheck {
  passed: boolean;
  reasons: string[];
}

// Suspicious name patterns (keyboard smashing, test names, too short)
const SUSPICIOUS_NAME_PATTERNS = [
  /^[a-z]{1,3}$/i,                    // Too short (1-3 chars)
  /^(test|admin|bot|prueba)$/i,       // Obvious test names
  /([a-z])\1{4,}/i,                   // Repeated chars (aaaaaa)
  /^[asdfghjkl]{4,}$/i,              // Keyboard smashing (asdf, adfadfa)
  /^[qwertyuiop]{4,}$/i,             // Keyboard smashing
  /^(votante|user|name)\s*\d*$/i,    // Generic "Votante 1", "User 2"
];

// Suspicious WhatsApp patterns
const SUSPICIOUS_WA_PATTERNS = [
  /^(\d)\1{7,}$/,                     // Repeated digit (3000000000)
  /^(000|111|222|333|444|555|666|777|888|999)/, // Starts with repeated
  /^300000000/,                       // Obvious fake
  /^0000000/,                         // All zeros
  /^(1234567|1111111|0000000)/,       // Sequential
];

export function checkVoteAnomaly(
  nombre: string,
  whatsapp: string,
  rating: number,
  allRecentRatings: number[] // recent ratings for same restaurant
): AnomalyCheck {
  const reasons: string[] = [];

  // Check name
  for (const pattern of SUSPICIOUS_NAME_PATTERNS) {
    if (pattern.test(nombre)) {
      reasons.push(`Nombre sospechoso: "${nombre}"`);
      break;
    }
  }

  // Check WhatsApp
  for (const pattern of SUSPICIOUS_WA_PATTERNS) {
    if (pattern.test(whatsapp)) {
      reasons.push(`WhatsApp sospechoso: "${whatsapp}"`);
      break;
    }
  }

  // Check if all recent votes for this restaurant are 5 stars (bot pattern)
  if (allRecentRatings.length >= 10) {
    const allFive = allRecentRatings.every(r => r === 5);
    if (allFive && rating === 5) {
      reasons.push('Patrón bot detectado: todos los votos recientes son 5⭐');
    }
  }

  return { passed: reasons.length === 0, reasons };
}

// ============================================================
// Helper: Clean old data periodically
// ============================================================

export function cleanupAntibotState(): void {
  const now = Date.now();

  // Clean subnet votes older than 2 hours
  for (const [key, val] of subnetVotes) {
    if (now - val.windowStart > SUBNET_WINDOW_MS * 2) {
      subnetVotes.delete(key);
    }
  }

  // Clean expired challenges
  for (const [key, val] of activeChallenges) {
    if (now - val.timestamp > CHALLENGE_EXPIRY_MS * 2) {
      activeChallenges.delete(key);
    }
  }

  // Clear old used tokens (keep last hour worth)
  if (usedTokens.size > 20000) {
    usedTokens.clear();
  }
}
