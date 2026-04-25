// src/lib/antibot.ts — 5-layer anti-bot defense system
// All free, self-hosted, no paid APIs

import { createHmac, randomBytes, createHash } from 'crypto';

// ============================================================
// LAYER 1: Datacenter IP Detection — CONFIRMED ATTACK RANGES ONLY
// Only block IPs from the actual bot attack. Broader blocking risks
// blocking real users on ISPs that share ranges with datacenters.
const DATACENTER_PREFIXES: string[] = [
  // Confirmed ranges from the La Casa del Chancho bot attack (April 2026)
  '185.192.16.', '45.130.203.', '45.146.55.',
  '216.24.219.', '109.110.169.', '185.64.78.',
  '45.131.193.', '173.244.55.', '104.234.19.',
  '45.86.203.', '193.56.116.', '91.193.232.',
  '186.84.88.', '190.248.164.',  // secondary bot IPs
  // Known proxy/VPN providers (specific ranges only)
  '185.220.101.', '185.220.100.',  // Tor exit nodes common range
];

// Whitelist: never block these IP ranges (private networks, Tailscale, known admin IPs)
const WHITELIST_PREFIXES = [
  '10.',         // Private class A
  '172.16.', '172.17.', '172.18.', '172.19.',
  '172.20.', '172.21.', '172.22.', '172.23.',
  '172.24.', '172.25.', '172.26.', '172.27.',
  '172.28.', '172.29.', '172.30.', '172.31.', // Private class B
  '192.168.',    // Private class C
  '100.',        // Tailscale / CGNAT
  '127.',        // Localhost
];

export function isDatacenterIP(ip: string): boolean {
  // Whitelist known-safe ranges first
  for (const prefix of WHITELIST_PREFIXES) {
    if (ip.startsWith(prefix)) return false;
  }
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

const SUBNET_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const SUBNET_MAX_VOTES = 24; // max 24 votes per /24 subnet per day (3x per-IP limit)

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
  /^[a-z]{1,2}$/i,                     // Too short (1-2 chars — "Ana", "Eva", "Ian" are 3 chars = valid)
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
