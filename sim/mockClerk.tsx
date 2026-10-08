/**
 * sim/mockClerk.tsx
 *
 * Drop-in replacement for `@clerk/clerk-expo` in the perf-audit copy.
 * Always renders a signed-in fake user.
 */

import React from 'react';
import { SIM_USER } from './seedData';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function ClerkLoaded({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SignedOut(_props?: { children?: React.ReactNode }) {
  return null;
}

const mockUser = {
  id: SIM_USER.userId,
  fullName: SIM_USER.name,
  firstName: SIM_USER.name.split(' ')[0],
  lastName: SIM_USER.name.split(' ').slice(1).join(' '),
  username: 'simuser',
  primaryEmailAddressId: 'email_sim',
  primaryEmailAddress: {
    emailAddress: SIM_USER.email,
    verification: { status: 'verified' },
  },
  emailAddresses: [{ emailAddress: SIM_USER.email }],
  imageUrl: '',
  publicMetadata: {},
  unsafeMetadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function useUser() {
  return { isLoaded: true, isSignedIn: true, user: mockUser };
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: SIM_USER.userId,
    sessionId: 'sim_session',
    getToken: async () => 'sim-token',
    signOut: async () => {},
  };
}

export function useClerk() {
  return {
    loaded: true,
    user: mockUser,
    session: { id: 'sim_session' },
    buildSignInUrl: (_opts?: any) => '#sim',
    buildSignUpUrl: (_opts?: any) => '#sim',
    signOut: async () => {},
    setActive: async () => {},
    openSignIn: () => {},
    openSignUp: () => {},
  };
}

export function useOAuth(_opts?: any) {
  return {
    startOAuthFlow: async () => ({ createdSessionId: undefined, setActive: undefined }),
  };
}

export function useSSO() {
  return { startSSOFlow: async () => ({ createdSessionId: undefined, setActive: undefined }) };
}

export function useSignIn() {
  return { isLoaded: true, signIn: {}, setActive: async () => {} };
}

export function useSignUp() {
  return { isLoaded: true, signUp: {}, setActive: async () => {} };
}
