import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  college?: string;
  phone?: string;
  isAdmin?: boolean;
  isCoAdmin?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isCoAdmin: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  googleToken: string | null;
  login: (requestDriveScopes?: boolean | any) => Promise<string | null>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  loginAsVisitor: (name: string, email?: string, phone?: string, college?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoAdmin, setIsCoAdmin] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if there is a local guest session first
    const localGuest = localStorage.getItem('rasayan_guest_user');
    if (localGuest) {
      try {
        const guestData = JSON.parse(localGuest);
        setUser(guestData.user);
        setProfile(guestData.profile);
        setIsAdmin(false);
        setIsCoAdmin(false);
        setLoading(false);
      } catch (err) {
        console.warn("Failed to parse local guest session:", err);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const hasLocalGuest = localStorage.getItem('rasayan_guest_user');
      if (user) {
        // A real user signed in, clear guest if any
        localStorage.removeItem('rasayan_guest_user');
        
        setUser(user);
        setAuthError(null);
        const userEmailLower = user.email?.toLowerCase() || '';
        const isAdminEmail = 
          userEmailLower === 'brothernitin99@gmail.com' || 
          userEmailLower === 'nitin.c@somaiya.edu' ||
          userEmailLower === 'meetshetye06@gmail.com';
        
        const isCoAdminEmail = userEmailLower === 'brothernitin77@gmail.com';
        
        console.log(`User Logged In: ${userEmailLower}, Admin: ${isAdminEmail}, Co-Admin: ${isCoAdminEmail}`);

        // Default local fallback profile in case Firestore is offline
        const localFallbackProfile: UserProfile = {
          userId: user.uid,
          name: user.displayName || 'Anonymous User',
          email: user.email || '',
          isAdmin: isAdminEmail,
          isCoAdmin: isCoAdminEmail,
          createdAt: new Date().toISOString()
        };

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          // Ensure admin document exists for Firestore rules if admin or co-admin
          if (isAdminEmail || isCoAdminEmail) {
            try {
              await setDoc(doc(db, 'admins', user.uid), {
                email: user.email,
                role: isAdminEmail ? 'admin' : 'co-admin',
                lastSeen: new Date().toISOString()
              }, { merge: true });
            } catch (e) {
              console.error("Failed to sync admin status to Firestore:", e);
            }
          }

          if (userDoc.exists()) {
            const profileData = userDoc.data() as UserProfile;
            setProfile(profileData);
            const isActuallyAdmin = !!profileData.isAdmin || isAdminEmail;
            const isActuallyCoAdmin = !!profileData.isCoAdmin || isCoAdminEmail;
            setIsAdmin(isActuallyAdmin);
            setIsCoAdmin(isActuallyCoAdmin);
            
            // Logic for syncing flags if they are missing in profile
            const updates: any = {};
            if (isAdminEmail && !profileData.isAdmin) updates.isAdmin = true;
            if (isCoAdminEmail && !profileData.isCoAdmin) updates.isCoAdmin = true;
            
            if (Object.keys(updates).length > 0) {
              try {
                await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
              } catch (setErr) {
                console.warn("Failed to update profile flags when syncing:", setErr);
              }
            }
          } else {
            // Create initial profile
            try {
              await setDoc(doc(db, 'users', user.uid), localFallbackProfile);
            } catch (createErr) {
              console.warn("Failed to write initial profile to db (offline/transient):", createErr);
            }
            setProfile(localFallbackProfile);
            setIsAdmin(isAdminEmail);
            setIsCoAdmin(isCoAdminEmail);
          }
        } catch (error: any) {
          console.warn("Firestore offline or unavailable during auth profile check - using client fallback:", error);
          // Set standard fallback profile rather than crashing the page
          setProfile(localFallbackProfile);
          setIsAdmin(isAdminEmail);
          setIsCoAdmin(isCoAdminEmail);
        }
      } else if (!hasLocalGuest) {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setIsCoAdmin(false);
        setGoogleToken(null);
      }
      
      if (!hasLocalGuest || user) {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (requestDriveScopes: boolean | any = false): Promise<string | null> => {
    if (isAuthenticating) return null;
    setIsAuthenticating(true);
    setAuthError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      if (requestDriveScopes === true) {
        provider.addScope('https://www.googleapis.com/auth/spreadsheets');
        provider.addScope('https://www.googleapis.com/auth/drive.file');
        provider.addScope('https://www.googleapis.com/auth/drive');
      }
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken);
        console.log("Cached Google Drive access token in memory successfully.");
        return credential.accessToken;
      }
      return null;
    } catch (error: any) {
      console.error("Auth Exception Details:", error);
      
      let message = "Login failed. Please try again.";
      if (error.code === 'auth/popup-blocked') {
        message = "Login popup blocked. Please allow popups or open in a new tab.";
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        message = "Login cancelled. Please keep the Google popup open until sign-in is complete.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = `This domain (${window.location.hostname}) is not authorized in your Firebase Project. Please go to your Firebase Console -> Authentication -> Settings -> Authorized domains, and add "${window.location.hostname}" to the list.`;
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Google Sign-In is not enabled in your Firebase Project. Please go to your Firebase Console -> Authentication -> Sign-in method, and enable 'Google'.";
      } else if (error.code === 'auth/configuration-not-found' || error.code === 'auth/invalid-api-key') {
        message = "Invalid Firebase configuration. Please check your Firebase settings.";
      } else if (error.message?.includes('INTERNAL ASSERTION FAILED') || error.code === 'auth/internal-error') {
        message = "Browser security block or third-party cookies disabled. Please open this app directly in a new tab or use a browser like Chrome with standard privacy settings.";
      } else if (error.message?.includes('access_denied') || error.message?.includes('403') || error.message?.includes('unverified')) {
        message = "Access Blocked (Google OAuth is in 'Testing' mode): Ensure your email is added as a 'Test User' in Google Cloud Console -> APIs & Services -> OAuth consent screen, or publish the consent screen to 'In Production'.";
      } else {
        message = error.message || message;
      }
      setAuthError(message);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<void> => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      console.error("Email Login Exception:", error);
      let message = "Login failed. Please check your credentials.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Incorrect email or password.";
      } else if (error.code === 'auth/user-not-found') {
        message = "No account found with this email.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Please enter a valid email address.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password sign-in is disabled in your Firebase Project. Enable it under Authentication -> Sign-in method.";
      } else {
        message = error.message || message;
      }
      setAuthError(message);
      throw new Error(message, { cause: error });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string): Promise<void> => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (result.user) {
        await updateProfile(result.user, { displayName: name });
        // Create initial profile
        const localFallbackProfile: UserProfile = {
          userId: result.user.uid,
          name: name,
          email: email.trim().toLowerCase(),
          createdAt: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'users', result.user.uid), localFallbackProfile);
        } catch (setErr) {
          console.warn("Failed to write initial profile to db on manual register:", setErr);
        }
      }
    } catch (error: any) {
      console.error("Email Registration Exception:", error);
      let message = "Registration failed. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered. Please sign in instead.";
      } else if (error.code === 'auth/weak-password') {
        message = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Please enter a valid email address.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password sign-in is disabled in your Firebase Project. Enable it under Authentication -> Sign-in method.";
      } else {
        message = error.message || message;
      }
      setAuthError(message);
      throw new Error(message, { cause: error });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loginAsVisitor = async (name: string, email?: string, phone?: string, college?: string): Promise<void> => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const guestId = `guest_local_${Math.random().toString(36).substring(2, 11)}`;
      const guestEmail = email?.trim().toLowerCase() || `${guestId}@rasayan2026.com`;
      
      const mockUser = {
        uid: guestId,
        email: guestEmail,
        displayName: name.trim(),
        emailVerified: false,
        isAnonymous: true,
      } as any;

      const guestProfile: UserProfile = {
        userId: guestId,
        name: name.trim(),
        email: guestEmail,
        phone: phone?.trim() || '',
        college: college?.trim() || 'Visitor/Guest',
        isAdmin: false,
        isCoAdmin: false,
        createdAt: new Date().toISOString()
      };

      // Try to write to Firestore (our updated security rules will permit this!)
      try {
        await setDoc(doc(db, 'users', guestId), guestProfile);
      } catch (setErr) {
        console.warn("Failed to sync guest profile to Firestore (using local fallback only):", setErr);
      }

      // Save in localStorage to persist on refresh
      localStorage.setItem('rasayan_guest_user', JSON.stringify({
        user: mockUser,
        profile: guestProfile
      }));

      setUser(mockUser);
      setProfile(guestProfile);
      setIsAdmin(false);
      setIsCoAdmin(false);
    } catch (error: any) {
      console.error("Local visitor session creation failed:", error);
      setAuthError(error.message || "Failed to enter visitor session");
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('rasayan_guest_user');
    await signOut(auth);
    setGoogleToken(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setIsCoAdmin(false);
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, isAuthenticating, isAdmin, isCoAdmin, authError, 
      googleToken, login, loginWithEmail, registerWithEmail, loginAsVisitor, logout, clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
