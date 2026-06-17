import { Router, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import prisma from '../config/db';
import twilio from 'twilio';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mathemaniac_secret_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'mathemaniac_refresh_key';

// Initialize Firebase Admin SDK if environment variables exist
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: firebaseProjectId,
          clientEmail: firebaseClientEmail,
          privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err);
  }
} else {
  console.warn('Firebase Admin environment variables missing. Firebase user sync is disabled.');
}

// Initialize Twilio client if environment variables exist
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: any = null;
if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
  console.log('Twilio client initialized.');
} else {
  console.warn('Twilio credentials missing. SMS delivery is disabled.');
}

// In-Memory OTP Store
interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}
const pendingOtps = new Map<string, OtpRecord>();

// In-Memory Signup Store
interface PendingSignup {
  name: string;
  phoneNumber: string;
  passwordHash: string;
  code: string;
  expiresAt: number;
}
const pendingSignups = new Map<string, PendingSignup>();

// In-Memory Reset Store
interface PendingReset {
  phoneNumber: string;
  code: string;
  expiresAt: number;
}
const pendingResets = new Map<string, PendingReset>();

function generateTokens(payload: { id: string; phoneNumber: string; role: string }) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

// New Password-based Auth & OTP verification routes

// 1. Password Login
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ success: false, error: 'Phone number and password are required.' });
    }

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
      }
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone },
    });

    if (!user || !user.passwordHash) {
      return res.status(400).json({ success: false, error: 'Incorrect phone number or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Incorrect phone number or password.' });
    }

    const tokens = generateTokens({ id: user.id, phoneNumber: user.phoneNumber, role: user.role });
    return res.status(200).json({
      success: true,
      data: {
        ...tokens,
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error('[Login Error]', error);
    return res.status(500).json({ success: false, error: error.message || 'Login failed.' });
  }
});

// 2. Register / Sign Up (OTP Triggered)
router.post('/register', async (req, res) => {
  try {
    const { name, phoneNumber, password } = req.body;
    if (!name || !phoneNumber || !password) {
      return res.status(400).json({ success: false, error: 'Name, phone number, and password are required.' });
    }

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
      }
    }

    // Check if user already exists in Prisma DB
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone },
    });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'An account with this phone number already exists.' });
    }

    if (!twilioClient || !fromPhoneNumber) {
      return res.status(500).json({
        success: false,
        error: 'Twilio SMS service is not configured on the server. Unable to send OTP.',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Deliver OTP via Twilio
    await twilioClient.messages.create({
      body: `Your Mathemaniac registration code is: ${code}. Valid for 5 minutes.`,
      from: fromPhoneNumber,
      to: formattedPhone,
    });

    // Save registration details to pendingSignups map
    pendingSignups.set(formattedPhone, {
      name: name.trim(),
      phoneNumber: formattedPhone,
      passwordHash,
      code,
      expiresAt,
    });

    console.log(`[Twilio Registration OTP] Sent verification code to ${formattedPhone}`);
    return res.status(200).json({
      success: true,
      data: { message: 'Verification code sent successfully.' },
    });
  } catch (error: any) {
    console.error('[Registration OTP Send Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to deliver registration verification SMS.',
    });
  }
});

// 3. Register Verification
router.post('/register/verify', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, error: 'Phone number and verification code are required.' });
    }

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
      }
    }

    const pending = pendingSignups.get(formattedPhone);
    if (!pending) {
      return res.status(400).json({ success: false, error: 'No pending registration found. Please register again.' });
    }

    if (Date.now() > pending.expiresAt) {
      pendingSignups.delete(formattedPhone);
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please register again.' });
    }

    if (pending.code !== code.trim()) {
      return res.status(400).json({ success: false, error: 'Incorrect verification code.' });
    }

    // OTP matches! Create the user in Prisma DB
    const user = await prisma.user.create({
      data: {
        name: pending.name,
        phoneNumber: pending.phoneNumber,
        passwordHash: pending.passwordHash,
        role: 'STUDENT',
      },
    });

    // Clean up
    pendingSignups.delete(formattedPhone);

    // Welcome Notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to Mathemaniac!',
        body: 'Thanks for signing up. Start exploring your courses and taking integration quizzes!',
      },
    });

    // Auto-unlock Calculus course for onboarding ease
    const calculusCourse = await prisma.course.findFirst({
      where: { title: { contains: 'Calculus' } },
    });
    if (calculusCourse) {
      await prisma.purchase.create({
        data: {
          userId: user.id,
          courseId: calculusCourse.id,
          amount: calculusCourse.price,
          status: 'SUCCESS',
          razorpayOrderId: `order_auto_${user.id.substring(0, 8)}`,
        },
      });
    }

    // Sync to Firestore
    if (getApps().length > 0) {
      try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(user.id);
        await userRef.set({
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`[Firebase Sync] Synchronized registered user ${user.id} to Firestore.`);
      } catch (firebaseErr) {
        console.error('[Firebase Sync Error]', firebaseErr);
      }
    }

    const tokens = generateTokens({ id: user.id, phoneNumber: user.phoneNumber, role: user.role });
    return res.status(200).json({
      success: true,
      data: {
        ...tokens,
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error('[Verify Register Error]', error);
    return res.status(500).json({ success: false, error: error.message || 'Verification failed.' });
  }
});

// 3.5. Register Resend OTP
router.post('/register/resend', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
      }
    }

    const pending = pendingSignups.get(formattedPhone);
    if (!pending) {
      return res.status(400).json({ success: false, error: 'No pending registration found. Please signup again.' });
    }

    if (!twilioClient || !fromPhoneNumber) {
      return res.status(500).json({
        success: false,
        error: 'Twilio SMS service is not configured on the server.',
      });
    }

    // Generate new OTP
    const code = crypto.randomInt(100000, 999999).toString();
    pending.code = code;
    pending.expiresAt = Date.now() + 5 * 60 * 1000;
    pendingSignups.set(formattedPhone, pending);

    await twilioClient.messages.create({
      body: `Your Mathemaniac registration code is: ${code}. Valid for 5 minutes.`,
      from: fromPhoneNumber,
      to: formattedPhone,
    });

    console.log(`[Twilio Registration OTP Resend] Sent code to ${formattedPhone}`);
    return res.status(200).json({ success: true, data: { message: 'OTP resent successfully.' } });
  } catch (error: any) {
    console.error('[Registration OTP Resend Error]', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to resend OTP.' });
  }
});


// 4. Forgot Password - Send OTP
router.post('/forgot-password/send', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
      }
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone },
    });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this phone number.' });
    }

    if (!twilioClient || !fromPhoneNumber) {
      return res.status(500).json({
        success: false,
        error: 'Twilio SMS service is not configured on the server. Unable to send OTP.',
      });
    }

    // Generate 6-digit OTP code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Deliver OTP via Twilio
    await twilioClient.messages.create({
      body: `Your Mathemaniac password reset code is: ${code}. Valid for 5 minutes.`,
      from: fromPhoneNumber,
      to: formattedPhone,
    });

    // Store in pendingResets
    pendingResets.set(formattedPhone, {
      phoneNumber: formattedPhone,
      code,
      expiresAt,
    });

    console.log(`[Twilio Reset OTP] Sent code to ${formattedPhone}`);
    return res.status(200).json({
      success: true,
      data: { message: 'Reset OTP sent successfully.' },
    });
  } catch (error: any) {
    console.error('[Forgot Password OTP Send Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to deliver reset verification SMS.',
    });
  }
});

// 5. Forgot Password - Reset
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { phoneNumber, code, newPassword } = req.body;
    if (!phoneNumber || !code || !newPassword) {
      return res.status(400).json({ success: false, error: 'Phone number, code, and new password are required.' });
    }

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
      }
    }

    const pending = pendingResets.get(formattedPhone);
    if (!pending) {
      return res.status(400).json({ success: false, error: 'No pending reset request. Please request OTP first.' });
    }

    if (Date.now() > pending.expiresAt) {
      pendingResets.delete(formattedPhone);
      return res.status(400).json({ success: false, error: 'Reset code has expired.' });
    }

    if (pending.code !== code.trim()) {
      return res.status(400).json({ success: false, error: 'Incorrect verification code.' });
    }

    // OTP matches! Hash and update the user's password in Prisma
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { phoneNumber: formattedPhone },
      data: { passwordHash },
    });

    // Clean up
    pendingResets.delete(formattedPhone);

    console.log(`[Password Reset Success] Password reset for user with phone ${formattedPhone}`);
    return res.status(200).json({
      success: true,
      data: { message: 'Password has been reset successfully.' },
    });
  } catch (error: any) {
    console.error('[Reset Password Error]', error);
    return res.status(500).json({ success: false, error: error.message || 'Password reset failed.' });
  }
});

// 1. Send SMS OTP (Exclusive login/signup entry)
router.post('/otp/send', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else {
        return res.status(400).json({ success: false, error: 'Phone number must include country code (e.g. +91xxxxxxxxxx)' });
      }
    }

    // Rate Limiting: Max 1 request per 60 seconds
    const existingRecord = pendingOtps.get(formattedPhone);
    if (existingRecord) {
      const timeDiff = Date.now() - existingRecord.lastSentAt;
      if (timeDiff < 60 * 1000) {
        const waitSeconds = Math.ceil((60 * 1000 - timeDiff) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${waitSeconds} seconds before requesting another OTP.`,
        });
      }
    }

    if (!twilioClient || !fromPhoneNumber) {
      return res.status(500).json({
        success: false,
        error: 'Twilio SMS service is not configured on the server. Unable to send OTP.',
      });
    }

    // Cryptographically secure 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Deliver OTP via Twilio
    await twilioClient.messages.create({
      body: `Your Mathemaniac verification code is: ${code}. Valid for 5 minutes.`,
      from: fromPhoneNumber,
      to: formattedPhone,
    });

    pendingOtps.set(formattedPhone, {
      code,
      expiresAt,
      attempts: 0,
      lastSentAt: Date.now(),
    });

    console.log(`[Twilio OTP] Successfully sent verification code to ${formattedPhone}`);
    return res.status(200).json({
      success: true,
      data: { message: 'OTP sent successfully.' },
    });
  } catch (error: any) {
    console.error('[Twilio Send Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to deliver verification SMS via Twilio.',
    });
  }
});

// 2. Verify OTP (Handles both existing login & automatic signup)
router.post('/otp/verify', async (req, res) => {
  try {
    const { phoneNumber, code, name, role } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, error: 'Phone number and verification code are required' });
    }

    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
      }
    }

    const record = pendingOtps.get(formattedPhone);

    if (!record) {
      return res.status(400).json({ success: false, error: 'No OTP requested for this number. Please request a code first.' });
    }

    // Expiration check
    if (Date.now() > record.expiresAt) {
      pendingOtps.delete(formattedPhone);
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
    }

    // Brute-force check: max 3 attempts
    if (record.attempts >= 3) {
      pendingOtps.delete(formattedPhone);
      return res.status(400).json({ success: false, error: 'Too many incorrect attempts. Please request a new verification code.' });
    }

    // Code check
    if (record.code !== code.trim()) {
      record.attempts += 1;
      pendingOtps.set(formattedPhone, record);
      const remaining = 3 - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Incorrect code. ${remaining} attempt(s) remaining.`,
      });
    }

    // Verified successfully - clean up
    pendingOtps.delete(formattedPhone);

    // Look up or auto-register user in Prisma
    let user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name?.trim() || (role === 'TEACHER' ? 'Mathemaniac Teacher' : 'Mathemaniac Student'),
          phoneNumber: formattedPhone,
          role: role || 'STUDENT',
        },
      });

      // Welcome Notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to Mathemaniac!',
          body: 'Thanks for signing up. Start exploring your courses and taking integration quizzes!',
        },
      });

      // Auto-unlock Calculus course for onboarding ease
      const calculusCourse = await prisma.course.findFirst({
        where: { title: { contains: 'Calculus' } },
      });
      if (calculusCourse) {
        await prisma.purchase.create({
          data: {
            userId: user.id,
            courseId: calculusCourse.id,
            amount: calculusCourse.price,
            status: 'SUCCESS',
            razorpayOrderId: `order_auto_${user.id.substring(0, 8)}`,
          },
        });
      }
    } else if (role && user.role !== role) {
      // Dynamic role updates for portal switching tests convenience
      user = await prisma.user.update({
        where: { phoneNumber: formattedPhone },
        data: { role },
      });
    }

    // Sync user data to Firebase Firestore
    if (getApps().length > 0) {
      try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(user.id);
        await userRef.set({
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`[Firebase Sync] Synchronized user ${user.id} to Firestore users collection.`);
      } catch (firebaseErr) {
        console.error('[Firebase Sync Error]', firebaseErr);
        // Do not fail the flow if Firebase Firestore is unreachable/offline
      }
    }

    const tokens = generateTokens({ id: user.id, phoneNumber: user.phoneNumber, role: user.role });
    return res.status(200).json({
      success: true,
      data: {
        ...tokens,
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error('[OTP Verify Error]', error);
    return res.status(500).json({ success: false, error: error.message || 'OTP verification failed.' });
  }
});

// 3. Refresh Token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token is required' });
  }

  jwt.verify(refreshToken, REFRESH_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid refresh token' });
    }

    const payload = decoded as { id: string; phoneNumber: string; role: string };
    const accessToken = jwt.sign(
      { id: payload.id, phoneNumber: payload.phoneNumber, role: payload.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      data: { accessToken },
    });
  });
});

export default router;
