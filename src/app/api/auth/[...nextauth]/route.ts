import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { SchoolModel } from "@/models/School";
import bcrypt from "bcryptjs";
import { ActivityLogModel, LOG_RETENTION_MONTHS } from "@/models/ActivityLog";
import { toYMD } from "@/lib/pkTime";

// Same message for wrong email AND wrong password (don't reveal which emails exist)
const INVALID_LOGIN = "Your email or password is incorrect.";

// Too many wrong passwords → wait before trying again
const LOCK_LIMIT = 10;
const LOCK_MINUTES = 15;


// Login / failed-login log (background, never blocks the login)
function logAuth(user: any, action: "login" | "login_failed", req: any, summary?: string) {
  const expireAt = new Date();
  expireAt.setMonth(expireAt.getMonth() + LOG_RETENTION_MONTHS);
  const headers = req?.headers || {};
  const get = (k: string) => (typeof headers.get === "function" ? headers.get(k) : headers[k]) || "";
  const ip = String(get("x-forwarded-for") || get("x-real-ip")).split(",")[0].trim();

  (ActivityLogModel as any)
    .create({
      schoolId: user.schoolId ? String(user.schoolId) : null,
      userId: String(user._id),
      userName: user.name || "",
      userRole: user.role || "",
      action,
      module: "auth",
      summary: summary || (action === "login" ? "Logged in" : "Wrong password"),
      ip,
      userAgent: get("user-agent"),
      expireAt,
    })
    .catch(() => {});
}

// --- authOptions is exported so other APIs can use it ---
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        await connectDB();

        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");

        if (!email || !password) {
          throw new Error("Your email and password are required!");
        }

        const user = await (UserModel as any).findOne({ email });
        if (!user || !user.password) {
          throw new Error(INVALID_LOGIN);
        }

        // Too many wrong passwords in the last few minutes → locked for a while
        const recentFails = await (ActivityLogModel as any).countDocuments({
          userId: String(user._id),
          action: "login_failed",
          createdAt: { $gte: new Date(Date.now() - LOCK_MINUTES * 60 * 1000) },
        });
        if (recentFails >= LOCK_LIMIT) {
          throw new Error(`Too many wrong attempts. Please try again after ${LOCK_MINUTES} minutes.`);
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
          logAuth(user, "login_failed", req);
          throw new Error(INVALID_LOGIN);
        }

        // Login switched off by the Super Admin
        if (user.isActive === false) {
          logAuth(user, "login_failed", req, "Login blocked (account deactivated)");
          throw new Error("Your account is deactivated. Please contact the Super Admin.");
        }

        let schoolSlug: string | null = null;

        if (user.role !== "super-admin" && user.role !== "super_admin" && user.schoolId) {
          const school = await SchoolModel.findById(user.schoolId);

          if (!school) {
            throw new Error("Institution records not found!");
          }

                    // Expired? (compare Pakistan days, works on any server)
          if (school.expiryDate && toYMD() > toYMD(school.expiryDate) && school.status === "active") {
            await SchoolModel.findByIdAndUpdate(school._id, { status: "inactive" });
            school.status = "inactive";
          }

          if (school.status === "inactive") {
            throw new Error("Your institution's subscription has expired. Please contact the Super Admin.");
          }

          schoolSlug = school.slug || null;
        }

        // Last login time (updateOne → no validation, never blocks the login)
        (UserModel as any)
          .updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })
          .catch(() => {});

        logAuth(user, "login", req);

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