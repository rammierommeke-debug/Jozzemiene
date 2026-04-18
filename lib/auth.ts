import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ALLOWED_EMAILS = [
  process.env.AUTH_EMAIL_ROEL,
  process.env.AUTH_EMAIL_EMMA,
].filter(Boolean) as string[];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return ALLOWED_EMAILS.includes(user.email ?? "");
    },
    async session({ session }) {
      if (session.user?.email) {
        const roelEmail = process.env.AUTH_EMAIL_ROEL;
        session.user.name =
          session.user.email === roelEmail ? "roel" : "emma";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
