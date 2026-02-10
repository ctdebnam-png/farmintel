import type { NextAuthConfig } from 'next-auth';

/**
 * Auth config that can be used in Edge middleware (no Node.js APIs).
 * The full auth config with providers is in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAppRoute = nextUrl.pathname.startsWith('/app');
      const isAuthRoute = nextUrl.pathname.startsWith('/login');

      if (isAppRoute && !isLoggedIn) {
        return false; // Redirect to signIn page
      }

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL('/app/dashboard', nextUrl));
      }

      return true;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  providers: [], // Providers added in auth.ts (not edge-safe)
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig;
