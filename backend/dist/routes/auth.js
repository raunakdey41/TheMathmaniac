"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jwt = __importStar(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const twilio_1 = __importDefault(require("twilio"));
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'mathemaniac_secret_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'mathemaniac_refresh_key';
// Initialize Firebase Admin SDK if environment variables exist
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;
if (firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
    try {
        if ((0, app_1.getApps)().length === 0) {
            (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({
                    projectId: firebaseProjectId,
                    clientEmail: firebaseClientEmail,
                    privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
                }),
            });
            console.log('Firebase Admin SDK initialized successfully.');
        }
    }
    catch (err) {
        console.error('Failed to initialize Firebase Admin SDK:', err);
    }
}
else {
    console.warn('Firebase Admin environment variables missing. Firebase user sync is disabled.');
}
// Initialize Twilio client if environment variables exist
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
let twilioClient = null;
if (accountSid && authToken) {
    twilioClient = (0, twilio_1.default)(accountSid, authToken);
    console.log('Twilio client initialized.');
}
else {
    console.warn('Twilio credentials missing. SMS delivery is disabled.');
}
const pendingOtps = new Map();
function generateTokens(payload) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' });
    return { accessToken, refreshToken };
}
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
            }
            else {
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
        const code = crypto_1.default.randomInt(100000, 999999).toString();
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
    }
    catch (error) {
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
            }
            else {
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
        let user = await db_1.default.user.findUnique({
            where: { phoneNumber: formattedPhone },
        });
        if (!user) {
            user = await db_1.default.user.create({
                data: {
                    name: name?.trim() || (role === 'TEACHER' ? 'Mathemaniac Teacher' : 'Mathemaniac Student'),
                    phoneNumber: formattedPhone,
                    role: role || 'STUDENT',
                },
            });
            // Welcome Notification
            await db_1.default.notification.create({
                data: {
                    userId: user.id,
                    title: 'Welcome to Mathemaniac!',
                    body: 'Thanks for signing up. Start exploring your courses and taking integration quizzes!',
                },
            });
            // Auto-unlock Calculus course for onboarding ease
            const calculusCourse = await db_1.default.course.findFirst({
                where: { title: { contains: 'Calculus' } },
            });
            if (calculusCourse) {
                await db_1.default.purchase.create({
                    data: {
                        userId: user.id,
                        courseId: calculusCourse.id,
                        amount: calculusCourse.price,
                        status: 'SUCCESS',
                        razorpayOrderId: `order_auto_${user.id.substring(0, 8)}`,
                    },
                });
            }
        }
        else if (role && user.role !== role) {
            // Dynamic role updates for portal switching tests convenience
            user = await db_1.default.user.update({
                where: { phoneNumber: formattedPhone },
                data: { role },
            });
        }
        // Sync user data to Firebase Firestore
        if ((0, app_1.getApps)().length > 0) {
            try {
                const db = (0, firestore_1.getFirestore)();
                const userRef = db.collection('users').doc(user.id);
                await userRef.set({
                    id: user.id,
                    name: user.name,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                }, { merge: true });
                console.log(`[Firebase Sync] Synchronized user ${user.id} to Firestore users collection.`);
            }
            catch (firebaseErr) {
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
    }
    catch (error) {
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
    jwt.verify(refreshToken, REFRESH_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid refresh token' });
        }
        const payload = decoded;
        const accessToken = jwt.sign({ id: payload.id, phoneNumber: payload.phoneNumber, role: payload.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({
            success: true,
            data: { accessToken },
        });
    });
});
exports.default = router;
