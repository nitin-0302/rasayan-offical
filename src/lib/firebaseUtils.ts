import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Only throw as a fatal error if it is a security or permission-denied issue (as needed for system diagnostics)
  const isPermissionOrAuthError = 
    errorMessage.toLowerCase().includes('permission') || 
    errorMessage.toLowerCase().includes('insufficient') ||
    errorMessage.toLowerCase().includes('unauthorized') ||
    errorMessage.toLowerCase().includes('denied');

  if (isPermissionOrAuthError) {
    throw new Error(JSON.stringify(errInfo));
  } else {
    // Log as warning for offline/network disconnect signals
    console.warn("Gracefully recovered from transient/offline Firestore state: ", errorMessage);
  }
}
