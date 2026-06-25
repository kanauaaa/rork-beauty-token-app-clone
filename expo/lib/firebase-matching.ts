export interface FirebaseMatchingRequest {
  id: string;
  customerId: string;
  customerName: string;
  requestDate: string;
  desiredDate?: string;
  desiredTime?: string;
  menu: string[];
  concerns: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  matchedHairdresserId?: string;
  matchedHairdresserName?: string;
  matchedAt?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirebaseMatch {
  id: string;
  requestId: string;
  customerId: string;
  customerName: string;
  hairdresserId: string;
  hairdresserName: string;
  matchedAt: string;
  status: 'scout_pending' | 'booking_confirmed' | 'cancelled' | 'completed' | 'rejected';
  chatUnlocked: boolean;
  visitCompleted: boolean;
  ratingCompleted: boolean;
  cancelRequestBy?: 'customer' | 'hairdresser';
  cancelReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirebaseMatchLog {
  id: string;
  type: 'scout_sent' | 'scout_accepted' | 'scout_rejected' | 'booking_confirmed' | 'cancelled';
  hairdresserId: string;
  hairdresserName: string;
  customerId: string;
  customerName: string;
  requestId: string;
  matchId: string;
  timestamp: string;
  details?: any;
  createdAt?: any;
}

export async function createMatchingRequest(request: FirebaseMatchingRequest): Promise<void> {
  throw new Error('Use tRPC backend instead');
}

export async function updateMatchingRequest(
  requestId: string, 
  updates: Partial<FirebaseMatchingRequest>
): Promise<void> {
  throw new Error('Use tRPC backend instead');
}

export async function getMatchingRequest(requestId: string): Promise<FirebaseMatchingRequest | null> {
  throw new Error('Use tRPC backend instead');
}

export async function getMatchingRequestsByCustomer(customerId: string): Promise<FirebaseMatchingRequest[]> {
  throw new Error('Use tRPC backend instead');
}

export async function getPendingMatchingRequests(): Promise<FirebaseMatchingRequest[]> {
  throw new Error('Use tRPC backend instead');
}

export async function createMatch(match: FirebaseMatch): Promise<void> {
  throw new Error('Use tRPC backend instead');
}

export async function updateMatch(matchId: string, updates: Partial<FirebaseMatch>): Promise<void> {
  throw new Error('Use tRPC backend instead');
}

export async function getMatchesByCustomer(customerId: string): Promise<FirebaseMatch[]> {
  throw new Error('Use tRPC backend instead');
}

export async function getMatchesByHairdresser(hairdresserId: string): Promise<FirebaseMatch[]> {
  throw new Error('Use tRPC backend instead');
}

export async function getMatchesByRequestId(requestId: string): Promise<FirebaseMatch[]> {
  throw new Error('Use tRPC backend instead');
}

export async function createMatchLog(log: FirebaseMatchLog): Promise<void> {
  throw new Error('Use tRPC backend instead');
}

export async function getMatchLogs(matchId?: string): Promise<FirebaseMatchLog[]> {
  throw new Error('Use tRPC backend instead');
}

export function subscribeToMatches(
  userId: string,
  role: 'customer' | 'hairdresser',
  callback: (matches: FirebaseMatch[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (onError) {
    onError(new Error('subscribeToMatches is deprecated. Use tRPC with react-query polling instead'));
  }
  callback([]);
  return () => {};
}

export function subscribeToMatchingRequests(
  customerId: string,
  callback: (requests: FirebaseMatchingRequest[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (onError) {
    onError(new Error('subscribeToMatchingRequests is deprecated. Use tRPC with react-query polling instead'));
  }
  callback([]);
  return () => {};
}

export function subscribeToPendingRequests(
  callback: (requests: FirebaseMatchingRequest[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (onError) {
    onError(new Error('subscribeToPendingRequests is deprecated. Use tRPC with react-query polling instead'));
  }
  callback([]);
  return () => {};
}
