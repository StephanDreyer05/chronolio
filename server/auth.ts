import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "../db/schema.js";
import { db } from "../db/index.js";
import { eq, and, sql } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import pkg from 'pg';
import { 
  initializeEmailService, 
  generateVerificationToken, 
  sendVerificationEmail,
  sendPasswordResetEmail
} from "./services/email.js";
import { checkAndUpdateExpiredTrials } from "./services/payment.js";
const { Pool } = pkg;

// Initialize email service
const emailServiceInitialized = initializeEmailService();

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  console.log('[Auth Debug] Request authentication check');
  console.log('[Auth Debug] isAuthenticated exists:', typeof req.isAuthenticated === 'function');
  console.log('[Auth Debug] Authentication status:', req.isAuthenticated ? req.isAuthenticated() : 'isAuthenticated not defined');
  console.log('[Auth Debug] req.user:', req.user ? `User ID: ${req.user.id}` : 'No user');
  console.log('[Auth Debug] req.session:', req.session ? `Session ID: ${req.session.id}` : 'No session');
  
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log('[Auth Debug] Authentication failed, returning 401');
    return res.status(401).json({ message: 'Not authenticated' });
  }
  console.log('[Auth Debug] Authentication passed, continuing');
  next();
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
// Use the correct type for the session store
// @ts-ignore - Ignoring type error due to missing type definitions
const PostgresSessionStore = connectPg(session);

// Create a new pool for sessions
const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function getUserByUsername(username: string) {
  return db.select().from(users).where(eq(users.username, username)).limit(1);
}

async function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).limit(1);
}

export function setupAuth(app: Express) {
  const store = new PostgresSessionStore({
    pool: sessionPool,
    createTableIfMissing: true,
  });

  // For debugging session issues
  console.log('[Auth Debug] Session configuration:', {
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL,
    sessionSecret: process.env.SESSION_SECRET ? 'Defined' : 'Not defined',
    secure: process.env.NODE_ENV === 'production',
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET ?? 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      path: '/',
    },
  };

  // Special handling for Vercel environment 
  if (process.env.VERCEL) {
    console.log('[Auth Debug] Vercel environment detected, adjusting cookie settings');
    // Use a more permissive setting for serverless environments
    if (sessionSettings.cookie) {
      // Allow cross-domain cookies by using 'none' same-site policy
      sessionSettings.cookie.sameSite = 'none';
      // Ensure secure is true when sameSite is 'none'
      sessionSettings.cookie.secure = true;
      console.log('[Auth Debug] Updated cookie settings for Vercel:', sessionSettings.cookie);
    }
  }

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await getUserByUsername(username);
        
        // Check if user exists and password is correct
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // If email verification is enabled and user's email is not verified
        if (emailServiceInitialized && user.email && !user.isEmailVerified) {
          console.log(`User ${user.username} tried to login with unverified email ${user.email}`);
          return done(null, false, { 
            message: "Please verify your email address before logging in to Chronolio. Check your inbox for a verification link or request a new one." 
          });
        }
        
        return done(null, user);
      } catch (err) {
        console.error('Authentication error:', err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log('[Auth Debug] Serializing user:', user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    console.log('[Auth Debug] Deserializing user ID:', id);
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (!user) {
        console.log('[Auth Debug] User not found during deserialization for ID:', id);
        return done(null, false);
      }
      
      console.log('[Auth Debug] User successfully deserialized:', user.id);
      done(null, user);
    } catch (err) {
      console.error('[Auth Debug] Deserialization error:', err);
      done(err);
    }
  });

  // Add the profile update endpoint
  app.put("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { username, currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user!.id;

      // Get current user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      if (!(await comparePasswords(currentPassword, user.password))) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Check if username exists if it's being changed
      if (username !== user.username) {
        const [existingUser] = await getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ error: "Username already exists" });
        }
      }

      // Validate new password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          return res.status(400).json({ error: "New passwords do not match" });
        }
        if (newPassword.length < 8) {
          return res.status(400).json({ error: "Password must be at least 8 characters" });
        }
      }

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set({
          username: username || user.username,
          password: newPassword ? await hashPassword(newPassword) : user.password,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log('Registration attempt:', req.body);
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.toString() });
      }

      // Check if username already exists
      const [existingUsername] = await getUserByUsername(result.data.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Check if email already exists (if email is provided)
      if (result.data.email) {
        const [existingEmail] = await getUserByEmail(result.data.email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }
      
      // Generate email verification token if email is provided and email service is initialized
      let verificationToken = null;
      let verificationExpires = null;
      let isEmailVerified = false;
      
      // If no email verification service, mark as verified by default
      if (!result.data.email || !emailServiceInitialized) {
        isEmailVerified = true;
      } else {
        // Generate verification token and expiration date
        const verification = generateVerificationToken();
        verificationToken = verification.token;
        verificationExpires = verification.expiresAt;
      }
      
      // Create the user
      const [user] = await db
        .insert(users)
        .values({
          ...result.data,
          password: await hashPassword(result.data.password),
          isEmailVerified,
          emailVerificationToken: verificationToken,
          emailVerificationTokenExpires: verificationExpires,
        })
        .returning();
      
      // Send verification email if needed
      if (result.data.email && emailServiceInitialized && verificationToken) {
        await sendVerificationEmail(result.data.email, result.data.username, verificationToken);
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return success response
        res.status(201).json({
          ...user,
          emailVerificationSent: Boolean(result.data.email && emailServiceInitialized),
        });
      });
    } catch (err) {
      console.error('Registration error:', err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('[Auth Debug] Login attempt:', req.body.username);
    // @ts-ignore - Using any types for passport authenticate parameters
    passport.authenticate("local", (err: any, user: any, info: any) => {
      console.log('[Auth Debug] Passport authenticate result:', {
        error: err ? 'Error occurred' : 'No error',
        userFound: !!user,
        info: info || 'No info'
      });
      
      if (err) {
        console.error('[Auth Debug] Login error:', err);
        return next(err);
      }
      if (!user) {
        console.log('[Auth Debug] Login failed:', info?.message || 'Unknown reason');
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error('[Auth Debug] Session creation error:', loginErr);
          return next(loginErr);
        }
        
        console.log('[Auth Debug] Login successful for user:', user.id);
        console.log('[Auth Debug] Session created:', req.sessionID);
        console.log('[Auth Debug] isAuthenticated:', req.isAuthenticated());
        
        // Check if the user has an expired trial subscription and update if needed
        try {
          await checkAndUpdateExpiredTrials(user.id);
        } catch (error) {
          console.error('Error checking subscription trial status:', error);
          // Continue login process even if subscription check fails
        }
        
        return res.json({ 
          message: "Logged in successfully",
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  // Email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Invalid verification token" });
      }
      
      // Check if the user's account has already been verified
      // This is a simple solution to check if this is a repeat visit to the verification link
      let verifiedUser = null;
      
      try {
        // Just check if the user exists - the token will be null if already verified
        [verifiedUser] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.isEmailVerified, true),
            // Updated within the last hour (likely this verification)
            sql`${users.updatedAt} > NOW() - INTERVAL '1 hour'`
          ))
          .limit(1);
      } catch (queryError) {
        console.error('Error checking for previously verified user:', queryError);
        // Continue with the normal flow if this query fails
      }
      
      if (verifiedUser) {
        return res.json({ message: "Email already verified successfully" });
      }
      
      // Find user with this verification token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.emailVerificationToken, token))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "Invalid or expired verification link" });
      }
      
      // Check if token is expired
      if (user.emailVerificationTokenExpires && new Date(user.emailVerificationTokenExpires) < new Date()) {
        return res.status(400).json({ error: "Verification link has expired" });
      }
      
      // Update user as verified
      await db
        .update(users)
        .set({
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      // If user is already logged in, update their session
      if (req.isAuthenticated() && req.user.id === user.id) {
        req.user.isEmailVerified = true;
        req.user.emailVerificationToken = null;
        req.user.emailVerificationTokenExpires = null;
      }
      
      return res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error('Email verification error:', error);
      return res.status(500).json({ error: "Failed to verify email" });
    }
  });
  
  // Resend verification email endpoint
  app.post("/api/resend-verification", async (req, res) => {
    try {
      // Allow both authenticated users and users who just provided their email/username
      let user;
      
      if (req.isAuthenticated()) {
        // Get current user from session
        const userId = req.user!.id;
        [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
      } else if (req.body.username || req.body.email) {
        // Try to find user by username or email
        if (req.body.username) {
          [user] = await getUserByUsername(req.body.username);
        } else if (req.body.email) {
          [user] = await getUserByEmail(req.body.email);
        }
      } else {
        return res.status(400).json({ error: "Must provide username or email, or be authenticated" });
      }
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if user already verified
      if (user.isEmailVerified) {
        return res.status(400).json({ error: "Email already verified" });
      }
      
      // Check if user has an email
      if (!user.email) {
        return res.status(400).json({ error: "No email address associated with account" });
      }
      
      // Check if email service is initialized
      if (!emailServiceInitialized) {
        return res.status(500).json({ error: "Email service not available" });
      }
      
      // Generate new verification token
      const verification = generateVerificationToken();
      
      // Update user with new token
      await db
        .update(users)
        .set({
          emailVerificationToken: verification.token,
          emailVerificationTokenExpires: verification.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      // Send verification email
      const emailSent = await sendVerificationEmail(user.email, user.username, verification.token);
      
      if (emailSent) {
        return res.json({ message: "Verification email sent" });
      } else {
        return res.status(500).json({ error: "Failed to send verification email" });
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      return res.status(500).json({ error: "Failed to resend verification email" });
    }
  });
  
  // Request password reset endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Find user by email
      const [user] = await getUserByEmail(email);
      
      // If user not found, still return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account with that email exists, a password reset link has been sent" });
      }
      
      // Check if email service is available
      if (!emailServiceInitialized) {
        return res.status(500).json({ error: "Email service not available" });
      }
      
      // Generate token
      const verification = generateVerificationToken();
      
      // Update user with token
      await db
        .update(users)
        .set({
          passwordResetToken: verification.token,
          passwordResetTokenExpires: verification.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      // Make sure email is valid (TypeScript validation)
      if (!user.email) {
        console.error('User has no email address, cannot send password reset email');
        return res.json({ message: "If an account with that email exists, a password reset link has been sent" });
      }
      
      // Send password reset email (with guaranteed string email)
      const emailSent = await sendPasswordResetEmail(user.email, user.username, verification.token);
      
      if (!emailSent) {
        console.error('Failed to send password reset email');
      }
      
      // Always return success to prevent email enumeration
      return res.json({ message: "If an account with that email exists, a password reset link has been sent" });
    } catch (error) {
      console.error('Password reset request error:', error);
      return res.status(500).json({ error: "Failed to process password reset request" });
    }
  });
  
  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Reset token is required" });
      }
      
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      
      if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      // Find user with this reset token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "Invalid or expired reset token" });
      }
      
      // Check if token is expired
      if (user.passwordResetTokenExpires && new Date(user.passwordResetTokenExpires) < new Date()) {
        return res.status(400).json({ error: "Password reset link has expired" });
      }
      
      // Update user's password and clear reset token
      await db
        .update(users)
        .set({
          password: await hashPassword(password),
          passwordResetToken: null,
          passwordResetTokenExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
      
      return res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({ error: "Failed to reset password" });
    }
  });
  
  // Validate reset token endpoint
  app.get("/api/validate-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Invalid reset token" });
      }
      
      // Find user with this reset token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "Invalid or expired reset token" });
      }
      
      // Check if token is expired
      if (user.passwordResetTokenExpires && new Date(user.passwordResetTokenExpires) < new Date()) {
        return res.status(400).json({ error: "Password reset link has expired" });
      }
      
      return res.json({ valid: true });
    } catch (error) {
      console.error('Token validation error:', error);
      return res.status(500).json({ error: "Failed to validate reset token" });
    }
  });
}