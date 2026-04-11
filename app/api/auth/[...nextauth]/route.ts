import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Gebruikersnaam", type: "text" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const users: Record<string, { hash: string; name: string }> = {
          emma: {
            hash: process.env.USER_EMMA_PASSWORD ?? "",
            name: "Emma",
          },
          roel: {
            hash: process.env.USER_ROEL_PASSWORD ?? "",
            name: "Roel",
          },
        };

        const user = users[credentials.username.toLowerCase()];
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.hash);
        if (!valid) return null;

        return { id: credentials.username.toLowerCase(), name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
