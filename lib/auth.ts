import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { queryOne } from './db';
import crypto from 'crypto';
import { authConfig } from './auth.config';

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? '',
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? '',
    }),
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await queryOne<{
          id: string;
          email: string;
          name: string;
          password_hash: string;
          password_salt: string;
        }>(
          'SELECT id, email, name, password_hash, password_salt FROM users WHERE email = $1',
          [credentials.email]
        );

        if (!user || !user.password_hash) return null;

        const hash = hashPassword(credentials.password as string, user.password_salt);
        if (hash !== user.password_hash) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
