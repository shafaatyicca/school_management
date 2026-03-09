import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { SchoolModel } from "@/models/School";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email aur Password dono zaroori hain!");
        }

        const user = await (UserModel as any).findOne({
          email: credentials.email as string,
        });

        if (!user) {
          throw new Error("User nahi mila!");
        }

        // --- School Check & Auto-Inactive Logic ---
        if (user.role !== "super-admin" && user.schoolId) {
          const school = await SchoolModel.findById(user.schoolId);

          if (!school) {
            throw new Error("Institution records not found!");
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const expiry = new Date(school.expiryDate);
          expiry.setHours(0, 0, 0, 0);

          // 1. Agar date guzar gayi hai aur school abhi bhi active hai
          if (today > expiry && school.status === "active") {
            // Database mein school ko inactive kar dein
            await SchoolModel.findByIdAndUpdate(school._id, {
              status: "inactive",
            });
            // Local variable update taake session mein sahi status jaye
            school.status = "inactive";
          }

          // Note: Hum yahan se Error throw nahi kar rahe taake login ho jaye
          // aur user ko aapka "Inactive Modal" dashboard par nazar aaye.
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordCorrect) {
          throw new Error("Password galat hai!");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId ? user.schoolId.toString() : null,
          // Status bhejna zaroori hai modal trigger karne ke liye
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.role = user.role;
        token.schoolId = user.schoolId;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;

        // Dashboard modal ke liye humein school ka fresh status chahiye
        // Aap dashboard ke layout mein session se schoolId lekar
        // ek choti si API call karke status check kar sakte hain.
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 3 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
