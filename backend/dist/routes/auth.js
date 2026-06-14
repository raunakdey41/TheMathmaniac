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
const bcrypt = __importStar(require("bcryptjs"));
const db_1 = __importDefault(require("../config/db"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'mathemaniac_secret_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'mathemaniac_refresh_key';
// Mock database store for pending SMS OTPs during development
// Key: phoneNumber, Value: OTP string
const pendingOtps = {};
function generateTokens(payload) {
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); // Extended for easy local testing
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' });
    return { accessToken, refreshToken };
}
// 1. Send OTP
router.post('/otp/send', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ success: false, error: 'Phone number is required' });
        }
        // Static OTP for dev/testing: 123456
        const mockOtp = '123456';
        pendingOtps[phoneNumber] = mockOtp;
        console.log(`[SMS-MOCK] Sending OTP ${mockOtp} to ${phoneNumber}`);
        return res.status(200).json({
            success: true,
            data: { message: 'OTP sent successfully (Use 123456 for testing)' },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 2. Verify OTP (Handles both Login & Instant Signup)
router.post('/otp/verify', async (req, res) => {
    try {
        const { phoneNumber, code, name } = req.body;
        if (!phoneNumber || !code) {
            return res.status(400).json({ success: false, error: 'Phone number and code are required' });
        }
        const savedOtp = pendingOtps[phoneNumber];
        if (code !== '123456' && savedOtp !== code) {
            return res.status(400).json({ success: false, error: 'Invalid verification code' });
        }
        // Clear OTP
        delete pendingOtps[phoneNumber];
        // Check if user exists
        let user = await db_1.default.user.findUnique({
            where: { phoneNumber },
        });
        if (!user) {
            // Auto register student
            const fallbackEmail = `user_${Date.now()}@synapseedutech.in`;
            user = await db_1.default.user.create({
                data: {
                    name: name || 'Mathemaniac Student',
                    email: fallbackEmail,
                    phoneNumber,
                    role: 'STUDENT',
                },
            });
            // Seed immediate default notification
            await db_1.default.notification.create({
                data: {
                    userId: user.id,
                    title: 'Welcome to Mathemaniac!',
                    body: 'Thanks for signing up. Start exploring courses and attempting integration quizzes now!',
                },
            });
        }
        const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
        return res.status(200).json({
            success: true,
            data: {
                ...tokens,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                },
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 3. Signup (Standard Email registration)
router.post('/signup', async (req, res) => {
    try {
        const { name, email, phoneNumber, password } = req.body;
        if (!name || !email || !phoneNumber || !password) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }
        const existingUser = await db_1.default.user.findFirst({
            where: {
                OR: [{ email }, { phoneNumber }],
            },
        });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Email or Phone number already registered' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await db_1.default.user.create({
            data: {
                name,
                email,
                phoneNumber,
                passwordHash,
                role: 'STUDENT',
            },
        });
        // Auto-purchase Calculus course for immediate onboarding test ease
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
        const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
        return res.status(201).json({
            success: true,
            data: {
                ...tokens,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                },
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 4. Login (Standard Email login)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        const user = await db_1.default.user.findUnique({
            where: { email },
        });
        if (!user || !user.passwordHash) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
        const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
        return res.status(200).json({
            success: true,
            data: {
                ...tokens,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                },
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 5. Mock Google Login
router.post('/google', async (req, res) => {
    try {
        const { email, name, googleId, photoUrl } = req.body;
        if (!email || !googleId) {
            return res.status(400).json({ success: false, error: 'Email and Google ID are required' });
        }
        let user = await db_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            // Create user
            user = await db_1.default.user.create({
                data: {
                    name: name || 'Google User',
                    email,
                    phoneNumber: `google_${googleId.substring(0, 10)}`, // Placeholder phone
                    googleId,
                    role: 'STUDENT',
                },
            });
        }
        else if (!user.googleId) {
            // Link googleId
            user = await db_1.default.user.update({
                where: { id: user.id },
                data: { googleId },
            });
        }
        const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
        return res.status(200).json({
            success: true,
            data: {
                ...tokens,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                },
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 6. Refresh Token
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
        const accessToken = jwt.sign({ id: payload.id, email: payload.email, role: payload.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(200).json({
            success: true,
            data: { accessToken },
        });
    });
});
exports.default = router;
