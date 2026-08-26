/**
 * MyProjectTrace - Authentication & Multi-Tenant Workspace Context
 * 
 * Manages Firebase Authentication, Firestore company profile resolution,
 * role authorization (OWNER, ADMIN, FIELD_USER), interactive Demo Mode,
 * and deterministic, idempotent workspace onboarding & recovery.
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Company, User, UserRole } from '../types';
import { DEMO_COMPANY, DEMO_USERS } from '../services/mockSeedData';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { companyRepository } from '../services/firebase/companyRepository';
import { userRepository } from '../services/firebase/userRepository';

export type AuthState = 'LOADING_AUTH' | 'UNAUTHENTICATED' | 'AUTHENTICATED' | 'DEMO_MODE' | 'NEEDS_ONBOARDING';

interface AuthContextType {
  authState: AuthState;
  currentCompany: Company;
  currentUser: User;
  allUsers: User[];
  userRole: UserRole;
  isOwnerOrAdmin: boolean;
  isProjectManager: boolean;
  isAccounting: boolean;
  isFieldUser: boolean;
  canManageOrganization: boolean;
  canManageProjects: boolean;
  canViewFinancialReports: boolean;
  canCaptureTransactions: boolean;
  isDemoMode: boolean;
  isFirebaseAvailable: boolean;
  firebaseAuthUser: FirebaseUser | null;
  loading: boolean;
  authError: string | null;
  
  // Actions
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, fullName: string, companyName: string, tradeType: string) => Promise<void>;
  createWorkspaceAfterAuth: (companyName: string, tradeType: string) => Promise<void>;
  logOut: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  switchDemoUser: (userId: string) => void;
  updateCompanySettings: (settings: Partial<Company['settings']>) => Promise<void>;
  updateCompanyName: (name: string) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_USER = 'mpt_current_user_id';
const LOCAL_STORAGE_KEY_COMPANY = 'mpt_current_company';
const LOCAL_STORAGE_KEY_DEMO_MODE = 'mpt_demo_mode';

// Deterministic company ID for user's primary company workspace to guarantee idempotency on retries
export const getDeterministicCompanyId = (uid: string): string => `comp_${uid}`;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isFirebaseAvailable = isFirebaseConfigured();

  // Flag to avoid race conditions with onAuthStateChanged during signup/onboarding
  const isSigningUpRef = useRef<boolean>(false);

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_DEMO_MODE);
    if (saved !== null) return saved === 'true';
    return !isFirebaseAvailable; // Default to demo if Firebase not configured
  });

  const [authState, setAuthState] = useState<AuthState>(() => {
    if (!isFirebaseAvailable) return 'DEMO_MODE';
    const savedDemo = localStorage.getItem(LOCAL_STORAGE_KEY_DEMO_MODE);
    if (savedDemo === 'true') return 'DEMO_MODE';
    return 'LOADING_AUTH';
  });

  const [currentCompany, setCurrentCompany] = useState<Company>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_COMPANY);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEMO_COMPANY;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUserId = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
    if (savedUserId) {
      const matched = DEMO_USERS.find(u => u.userId === savedUserId);
      if (matched) return matched;
    }
    return DEMO_USERS[0];
  });

  const [allUsers, setAllUsers] = useState<User[]>(DEMO_USERS);
  const [firebaseAuthUser, setFirebaseAuthUser] = useState<FirebaseUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync state to local storage fallback
  useEffect(() => {
    if (authState === 'DEMO_MODE') {
      localStorage.setItem(LOCAL_STORAGE_KEY_COMPANY, JSON.stringify(currentCompany));
      localStorage.setItem(LOCAL_STORAGE_KEY_USER, currentUser.userId);
    }
  }, [currentCompany, currentUser, authState]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_DEMO_MODE, String(isDemoMode));
  }, [isDemoMode]);

  // Safe idempotent workspace setup & recovery helper
  const ensureUserWorkspaceIdempotent = async (
    uid: string,
    email: string,
    name: string,
    companyName: string,
    tradeType: string
  ): Promise<{ company: Company; user: User }> => {
    const targetCompanyId = getDeterministicCompanyId(uid);
    const nowIso = new Date().toISOString();

    // 1. Check if user_directory already points to an existing company
    const existingDir = await userRepository.findUserCompany(uid);
    let activeCompanyId = existingDir?.companyId || targetCompanyId;

    // 2. Check if company doc exists
    let companyDoc = await companyRepository.getCompany(activeCompanyId);

    if (!companyDoc && activeCompanyId !== targetCompanyId) {
      // Fall back to deterministic ID
      activeCompanyId = targetCompanyId;
      companyDoc = await companyRepository.getCompany(activeCompanyId);
    }

    if (!companyDoc) {
      // Create new company document with deterministic ID
      const newCompany: Company = {
        companyId: activeCompanyId,
        companyName: companyName.trim() || 'My Contracting Business',
        ownerUid: uid,
        tradeType: (tradeType as any) || 'GENERAL_CONTRACTOR',
        settings: {
          minimumGrossMarginThreshold: 0.25,
          largePurchaseThreshold: 1500,
          currency: 'USD',
          arWarningThreshold: 15000,
        },
        createdAt: nowIso,
      };
      await companyRepository.createCompany(newCompany);
      companyDoc = newCompany;
    }

    // 3. Ensure OWNER user doc exists
    let userDoc = await userRepository.getUser(activeCompanyId, uid);
    if (!userDoc) {
      const newUser: User = {
        userId: uid,
        companyId: activeCompanyId,
        name: name.trim() || 'Account Owner',
        email: email.trim(),
        role: 'OWNER',
        createdAt: nowIso,
      };
      await userRepository.createUser(newUser);
      userDoc = newUser;
    }

    // 4. Ensure /user_directory/{uid} mapping points to this company
    if (!existingDir || existingDir.companyId !== activeCompanyId) {
      try {
        await userRepository.setUserDirectoryMapping(uid, activeCompanyId);
      } catch (err) {
        console.warn('[MyProjectTrace] Non-blocking directory mapping warning:', err);
      }
    }

    return { company: companyDoc, user: userDoc };
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    if (!auth || !isFirebaseAvailable) {
      setAuthState('DEMO_MODE');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // If signup/onboarding is already in flight in the UI, avoid race conditions
      if (isSigningUpRef.current) {
        return;
      }

      setFirebaseAuthUser(fbUser);

      if (!fbUser) {
        // No authenticated Firebase user
        if (isDemoMode) {
          setAuthState('DEMO_MODE');
          setCurrentCompany(DEMO_COMPANY);
          setCurrentUser(DEMO_USERS[0]);
          setAllUsers(DEMO_USERS);
        } else {
          setAuthState('UNAUTHENTICATED');
        }
        return;
      }

      // User is authenticated with Firebase
      setAuthState('LOADING_AUTH');
      try {
        // Step A: Resolve user's company membership via user_directory
        const membership = await userRepository.findUserCompany(fbUser.uid);

        if (membership?.companyId) {
          const company = await companyRepository.getCompany(membership.companyId);
          const userDoc = await userRepository.getUser(membership.companyId, fbUser.uid);

          if (company && userDoc) {
            setCurrentCompany(company);
            setCurrentUser(userDoc);
            const team = await userRepository.getCompanyUsers(company.companyId);
            setAllUsers(team.length > 0 ? team : [userDoc]);
            setIsDemoMode(false);
            setAuthState('AUTHENTICATED');
            return;
          }
        }

        // Step B: Auto-recovery for interrupted initial onboarding
        // If directory mapping is missing, check if deterministic company already exists for this owner
        const deterministicId = getDeterministicCompanyId(fbUser.uid);
        const recoveredCompany = await companyRepository.getCompany(deterministicId);

        if (recoveredCompany && recoveredCompany.ownerUid === fbUser.uid) {
          // Repair user record if needed
          let userDoc = await userRepository.getUser(deterministicId, fbUser.uid);
          if (!userDoc) {
            userDoc = {
              userId: fbUser.uid,
              companyId: deterministicId,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Account Owner',
              email: fbUser.email || '',
              role: 'OWNER',
              createdAt: new Date().toISOString(),
            };
            await userRepository.createUser(userDoc);
          }
          // Repair directory mapping
          await userRepository.setUserDirectoryMapping(fbUser.uid, deterministicId);

          setCurrentCompany(recoveredCompany);
          setCurrentUser(userDoc);
          const team = await userRepository.getCompanyUsers(deterministicId);
          setAllUsers(team.length > 0 ? team : [userDoc]);
          setIsDemoMode(false);
          setAuthState('AUTHENTICATED');
          return;
        }

        // Authenticated user exists but has no company workspace created yet
        setAuthState('NEEDS_ONBOARDING');
      } catch (err: any) {
        console.error('[MyProjectTrace] Error loading user workspace from Firestore:', err);
        setAuthError("We couldn't load your workspace. Please check your connection and try again.");
        setAuthState('UNAUTHENTICATED');
      }
    });

    return () => unsubscribe();
  }, [isDemoMode, isFirebaseAvailable]);

  // Sign In with email/password
  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    setAuthState('LOADING_AUTH');
    try {
      if (!auth) {
        throw new Error('Firebase Authentication is not configured.');
      }
      setIsDemoMode(false);
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error('[MyProjectTrace] Sign in error:', err);
      let msg = "We couldn't sign you in. Please check your connection and try again.";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please verify your credentials.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      }
      setAuthError(msg);
      setAuthState('UNAUTHENTICATED');
      throw new Error(msg);
    }
  };

  // Sign Up with email/password - Idempotent and deterministic
  const signUpWithEmail = async (
    email: string,
    pass: string,
    fullName: string,
    companyName: string,
    tradeType: string
  ) => {
    setAuthError(null);
    setAuthState('LOADING_AUTH');
    isSigningUpRef.current = true;
    try {
      if (!auth) {
        throw new Error('Firebase Authentication is not configured.');
      }
      setIsDemoMode(false);

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const uid = cred.user.uid;

      // Idempotently create or repair workspace
      const { company, user } = await ensureUserWorkspaceIdempotent(
        uid,
        email.trim(),
        fullName.trim() || 'Account Owner',
        companyName.trim() || 'My Contracting Business',
        tradeType
      );

      setFirebaseAuthUser(cred.user);
      setCurrentCompany(company);
      setCurrentUser(user);
      setAllUsers([user]);
      setAuthState('AUTHENTICATED');
    } catch (err: any) {
      console.error('[MyProjectTrace] Sign up error:', err);
      let msg = "We couldn't complete your registration. Please check your connection and try again.";
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setAuthError(msg);
      setAuthState('UNAUTHENTICATED');
      throw new Error(msg);
    } finally {
      isSigningUpRef.current = false;
    }
  };

  // Complete workspace onboarding for existing authenticated user without company (Idempotent)
  const createWorkspaceAfterAuth = async (companyName: string, tradeType: string) => {
    if (!auth?.currentUser) {
      throw new Error('No authenticated user found.');
    }
    setAuthError(null);
    setAuthState('LOADING_AUTH');
    isSigningUpRef.current = true;
    try {
      const uid = auth.currentUser.uid;
      const email = auth.currentUser.email || '';
      const name = auth.currentUser.displayName || email.split('@')[0] || 'Account Owner';

      // Idempotently create or resume company workspace
      const { company, user } = await ensureUserWorkspaceIdempotent(
        uid,
        email,
        name,
        companyName,
        tradeType
      );

      setCurrentCompany(company);
      setCurrentUser(user);
      setAllUsers([user]);
      setAuthState('AUTHENTICATED');
    } catch (err: any) {
      console.error('[MyProjectTrace] Workspace onboarding error:', err);
      setAuthError("We couldn't setup your company workspace. Please check your connection and try again.");
      setAuthState('NEEDS_ONBOARDING');
      throw new Error("We couldn't setup your company workspace. Please check your connection and try again.");
    } finally {
      isSigningUpRef.current = false;
    }
  };

  // Log Out
  const logOut = async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch (err: any) {
      console.error('[MyProjectTrace] Logout error:', err);
    } finally {
      setFirebaseAuthUser(null);
      setIsDemoMode(false);
      setAuthState('UNAUTHENTICATED');
      setCurrentCompany(DEMO_COMPANY);
      setCurrentUser(DEMO_USERS[0]);
      setAllUsers(DEMO_USERS);
    }
  };

  // Demo Mode controls
  const enterDemoMode = () => {
    setIsDemoMode(true);
    setAuthState('DEMO_MODE');
    setCurrentCompany(DEMO_COMPANY);
    setCurrentUser(DEMO_USERS[0]);
    setAllUsers(DEMO_USERS);
    setAuthError(null);
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    setAuthError(null);
    if (firebaseAuthUser) {
      setAuthState('AUTHENTICATED');
    } else {
      setAuthState('UNAUTHENTICATED');
    }
  };

  const switchDemoUser = (userId: string) => {
    const user = DEMO_USERS.find(u => u.userId === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  // Company settings update
  const updateCompanySettings = async (newSettings: Partial<Company['settings']>) => {
    if (authState === 'AUTHENTICATED' && isFirebaseAvailable) {
      try {
        await companyRepository.updateCompanySettings(currentCompany.companyId, newSettings);
        setCurrentCompany(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            ...newSettings,
          },
          updatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error('[MyProjectTrace] Failed to update Firestore company settings:', err);
        throw new Error("We couldn't update company settings. Please check your connection and try again.");
      }
    } else {
      setCurrentCompany(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...newSettings,
        },
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const updateCompanyName = async (name: string) => {
    if (authState === 'AUTHENTICATED' && isFirebaseAvailable) {
      try {
        await companyRepository.updateCompanyName(currentCompany.companyId, name);
        setCurrentCompany(prev => ({
          ...prev,
          companyName: name,
          updatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error('[MyProjectTrace] Failed to update company name in Firestore:', err);
        throw new Error("We couldn't update the company name. Please check your connection and try again.");
      }
    } else {
      setCurrentCompany(prev => ({
        ...prev,
        companyName: name,
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const clearAuthError = () => setAuthError(null);

  const isOwnerOrAdmin = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';
  const isProjectManager = currentUser.role === 'PROJECT_MANAGER';
  const isAccounting = currentUser.role === 'ACCOUNTING';
  const isFieldUser = currentUser.role === 'FIELD_USER';

  const canManageOrganization = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';
  const canManageProjects = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN' || currentUser.role === 'PROJECT_MANAGER';
  const canViewFinancialReports = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN' || currentUser.role === 'PROJECT_MANAGER' || currentUser.role === 'ACCOUNTING';
  const canCaptureTransactions = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN' || currentUser.role === 'PROJECT_MANAGER' || currentUser.role === 'FIELD_USER';

  const loading = authState === 'LOADING_AUTH';

  return (
    <AuthContext.Provider
      value={{
        authState,
        currentCompany,
        currentUser,
        allUsers,
        userRole: currentUser.role,
        isOwnerOrAdmin,
        isProjectManager,
        isAccounting,
        isFieldUser,
        canManageOrganization,
        canManageProjects,
        canViewFinancialReports,
        canCaptureTransactions,
        isDemoMode: authState === 'DEMO_MODE',
        isFirebaseAvailable,
        firebaseAuthUser,
        loading,
        authError,
        signInWithEmail,
        signUpWithEmail,
        createWorkspaceAfterAuth,
        logOut,
        enterDemoMode,
        exitDemoMode,
        switchDemoUser,
        updateCompanySettings,
        updateCompanyName,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
