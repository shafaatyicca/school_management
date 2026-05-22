import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { SchoolModel } from "@/models/School";
import bcrypt from "bcryptjs";

// --- AUTH OPTIONS KO EXPORT KIYA TAAKE CLASSES API MEIN USE HO SAKAY ---
export const authOptions: NextAuthOptions = {
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
          email: credentials.email.toLowerCase(),
        });

        if (!user) {
          throw new Error("User nahi mila!");
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordCorrect) {
          throw new Error("Password galat hai!");
        }

        let schoolSlug: string | null = null;

        if (
          user.role !== "super-admin" &&
          user.role !== "super_admin" &&
          user.schoolId
        ) {
          const school = await SchoolModel.findById(user.schoolId);

          if (!school) {
            throw new Error("Institution records not found!");
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expiry = new Date(school.expiryDate);
          expiry.setHours(0, 0, 0, 0);

          if (today > expiry && school.status === "active") {
            await SchoolModel.findByIdAndUpdate(school._id, {
              status: "inactive",
            });
            school.status = "inactive";
          }

          if (school.status === "inactive") {
            throw new Error("Aapka school account expire ho chuka hay!");
          }

          schoolSlug = school.slug || null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image || "",
          schoolId: user.schoolId ? user.schoolId.toString() : null,
          schoolSlug: schoolSlug,
        };
      },
    }),
  ],

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        domain:
          process.env.NODE_ENV === "development"
            ? ".lvh.me"
            : process.env.COOKIE_DOMAIN || undefined,
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.schoolSlug = user.schoolSlug;
        token.image = user.image;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role;
        session.user.schoolId = token.schoolId;
        session.user.schoolSlug = token.schoolSlug;
        session.user.image = token.image;
        session.user.id = token.id;
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
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
