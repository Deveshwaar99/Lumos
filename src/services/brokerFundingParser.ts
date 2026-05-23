interface BrokerFundingParserOptions {
  keywords: string[];
}

export interface ParsedBrokerFundingSms {
  matched: boolean;
  confidence: number;
  amountCents: number | null;
  reason: string;
}

const TRANSFER_HINTS = [
  'fund transfer',
  'transfer',
  'payment',
  'debit',
  'payee',
  'performed',
  'made successfully',
  'was performed',
  'credited',
  'debited',
];

const SUCCESS_HINTS = [
  'successful',
  'successfully',
  'performed',
  'completed',
  'processed',
  'has been made',
  'was made',
  'has been sent',
  'was sent',
];

const NEGATIVE_HINTS = [
  'otp',
  'one time password',
  'promo',
  'offer',
  'loan',
  'reward',
  'cashback',
  'statement',
  'minimum due',
];

const BROKER_DESTINATION_PHRASES = [
  'your trading account',
  'trading account',
  'demat account',
  'demat a/c',
  'brokerage account',
];

const STRUCTURAL_PATTERNS: Array<{ regex: RegExp; reason: string; score: number }> = [
  {
    regex:
      /\bpayment\s+of\s+(?:rs\.?|lkr)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+to\s+.+?\s+from\s+.+?\s+has\s+been\s+made\s+successfully\b/i,
    reason: 'payment-to-broker structure',
    score: 45,
  },
  {
    regex:
      /\bfund\s+transfer\s+debit\s*\(.+?\)\s+of\s+(?:rs\.?|lkr)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+was\s+performed\s+on\s+your\s+account\b/i,
    reason: 'fund-transfer-debit structure',
    score: 45,
  },
  {
    regex:
      /\btransfer\s+of\s+(?:rs\.?|lkr)\s*[0-9,]+(?:\.[0-9]{1,2})?\s+to\s+your\s+trading\s+account\b.+?\b(?:successful|successfully)\b/i,
    reason: 'trading-account transfer structure',
    score: 45,
  },
  {
    regex:
      /\b(?:payment|transfer|debit)\b.+?\b(?:to|for)\b.+?\b(?:successfully|performed|successful)\b/i,
    reason: 'generic transfer-success structure',
    score: 25,
  },
];

const BROKER_ENTITY_PATTERNS = [
  /\bto\s+([A-Z0-9&.,/()' -]{5,80}?)(?:\s+from\b|\s+has\b|\s+was\b|\s+\(ref\b|$)/i,
  /\bFT[A-Z0-9]*_([A-Z0-9&.,/()' -]{5,80}?)(?:_[A-Z0-9-]+)?\b/i,
];

function normalizeKeywords(keywords: string[]): string[] {
  return [...new Set(keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean))];
}

function normalizeEntity(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(
      /\b(pvt|private|limited|ltd|plc|inc|llc|company|co|stockbrokers|stockbroker)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeEntity(value: string): string[] {
  return normalizeEntity(value)
    .split(' ')
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

function extractAmountCents(text: string): number | null {
  const patterns = [
    /\b(?:rs\.?|lkr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i,
    /\bamount[:\s]*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i,
    /\b(?:of|for)\s+(?:rs\.?|lkr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\b/i,
    /\b([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:rs\.?|lkr)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const parsed = Number(match[1].replace(/,/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) continue;
    return Math.round(parsed * 100);
  }

  return null;
}

function hasBrokerDestinationPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return BROKER_DESTINATION_PHRASES.some((phrase) => lower.includes(phrase));
}

function extractBrokerCandidates(text: string): string[] {
  const candidates = BROKER_ENTITY_PATTERNS.flatMap((pattern) => {
    const match = text.match(pattern);
    if (!match?.[1]) return [];
    return [match[1].replace(/\s+/g, ' ').trim()];
  });

  return [...new Set(candidates.filter((candidate) => candidate.length >= 4))];
}

function computeAliasScore(candidate: string, aliases: string[]): {
  score: number;
  matchedAliases: string[];
} {
  if (aliases.length === 0) {
    return { score: 0, matchedAliases: [] };
  }

  const candidateNormalized = normalizeEntity(candidate);
  const candidateTokens = new Set(tokenizeEntity(candidate));
  let score = 0;
  const matchedAliases: string[] = [];

  for (const alias of aliases) {
    const aliasNormalized = normalizeEntity(alias);
    if (!aliasNormalized) continue;

    if (
      candidateNormalized.includes(aliasNormalized) ||
      aliasNormalized.includes(candidateNormalized)
    ) {
      score = Math.max(score, 35);
      matchedAliases.push(alias);
      continue;
    }

    const aliasTokens = tokenizeEntity(alias);
    if (aliasTokens.length === 0) continue;

    const overlap = aliasTokens.filter((token) => candidateTokens.has(token)).length;
    const ratio = overlap / aliasTokens.length;
    if (overlap >= 2 || ratio >= 0.6) {
      score = Math.max(score, Math.round(18 + ratio * 14));
      matchedAliases.push(alias);
    }
  }

  return { score, matchedAliases: [...new Set(matchedAliases)] };
}

function computeBodyAliasScore(text: string, aliases: string[]): {
  score: number;
  matchedAliases: string[];
} {
  const lower = text.toLowerCase();
  let score = 0;
  const matchedAliases: string[] = [];

  for (const alias of aliases) {
    const normalized = normalizeEntity(alias);
    if (!normalized) continue;

    if (lower.includes(alias.toLowerCase()) || lower.includes(normalized)) {
      score = Math.max(score, 25);
      matchedAliases.push(alias);
      continue;
    }

    const aliasTokens = tokenizeEntity(alias);
    const overlap = aliasTokens.filter((token) => lower.includes(token)).length;
    const ratio = aliasTokens.length > 0 ? overlap / aliasTokens.length : 0;
    if (overlap >= 2 || ratio >= 0.6) {
      score = Math.max(score, Math.round(12 + ratio * 10));
      matchedAliases.push(alias);
    }
  }

  return { score, matchedAliases: [...new Set(matchedAliases)] };
}

export function parseBrokerFundingSms(
  body: string,
  options: BrokerFundingParserOptions,
): ParsedBrokerFundingSms {
  const text = body.replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  const keywords = normalizeKeywords(options.keywords);
  const amountCents = extractAmountCents(text);
  const brokerCandidates = extractBrokerCandidates(text);

  let confidence = 0;
  const reasons: string[] = [];

  for (const pattern of STRUCTURAL_PATTERNS) {
    if (!pattern.regex.test(text)) continue;
    confidence += pattern.score;
    reasons.push(pattern.reason);
    break;
  }

  const matchedTransferHint = TRANSFER_HINTS.find((hint) => lower.includes(hint));
  if (matchedTransferHint) {
    confidence += 15;
    reasons.push(`transfer hint: ${matchedTransferHint}`);
  }

  const matchedSuccessHint = SUCCESS_HINTS.find((hint) => lower.includes(hint));
  if (matchedSuccessHint) {
    confidence += 12;
    reasons.push(`success hint: ${matchedSuccessHint}`);
  }

  if (amountCents != null) {
    confidence += 20;
    reasons.push('amount detected');
  }

  const directKeywordScore = computeBodyAliasScore(text, keywords);
  const candidateScores = brokerCandidates.map((candidate) => ({
    candidate,
    ...computeAliasScore(candidate, keywords),
  }));
  const bestCandidateScore = candidateScores.sort((a, b) => b.score - a.score)[0];
  const keywordMatches = [
    ...new Set([
      ...directKeywordScore.matchedAliases,
      ...(bestCandidateScore?.matchedAliases ?? []),
    ]),
  ];
  const hasDestinationPhrase = hasBrokerDestinationPhrase(text);

  if (keywordMatches.length > 0) {
    confidence += Math.max(
      directKeywordScore.score,
      bestCandidateScore?.score ?? 0,
    );
    reasons.push(`broker keyword: ${keywordMatches.join(', ')}`);
  }

  if (hasDestinationPhrase) {
    confidence += 30;
    reasons.push('broker destination: trading/demat account');
  }

  const hasBrokerSignal = keywordMatches.length > 0 || hasDestinationPhrase;

  if (hasBrokerSignal && brokerCandidates.length > 0) {
    reasons.push(`payee candidate: ${brokerCandidates[0]}`);
  }

  if (/\b(?:account\s+no|from\s+[a-z0-9 ]+savings|from\s+[a-z0-9 ]+current)\b/i.test(text)) {
    confidence += 5;
    reasons.push('account debit context');
  }

  const negativeHint = NEGATIVE_HINTS.find((hint) => lower.includes(hint));
  if (negativeHint) {
    confidence = Math.max(0, confidence - 45);
    reasons.push(`negative hint: ${negativeHint}`);
  }

  const hasTransferSignal =
    reasons.some((reason) => reason.includes('structure')) ||
    matchedTransferHint != null;
  const hasSuccessSignal = matchedSuccessHint != null;
  const matched =
    amountCents != null &&
    hasTransferSignal &&
    hasSuccessSignal &&
    hasBrokerSignal &&
    confidence >= 60;

  return {
    matched,
    confidence: Math.min(100, confidence),
    amountCents,
    reason: reasons.join(' | ') || 'No broker funding indicators found',
  };
}
