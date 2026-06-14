"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 1. Create Razorpay Order
router.post('/order', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const course = await db_1.default.course.findUnique({
            where: { id: courseId },
        });
        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }
        // Check if course already purchased
        const existing = await db_1.default.purchase.findFirst({
            where: { userId, courseId, status: 'SUCCESS' },
        });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Course already purchased' });
        }
        // Generate mock order
        const mockOrderId = `order_${Math.random().toString(36).substring(2, 12)}`;
        // Save purchase in status PENDING
        await db_1.default.purchase.create({
            data: {
                userId,
                courseId,
                amount: course.price,
                status: 'PENDING',
                razorpayOrderId: mockOrderId,
            },
        });
        return res.status(200).json({
            success: true,
            data: {
                orderId: mockOrderId,
                amount: course.price,
                currency: 'INR',
                courseTitle: course.title,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 2. Verify Razorpay Payment (Unlocks course)
router.post('/verify', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { orderId, paymentId, signature } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const purchase = await db_1.default.purchase.findUnique({
            where: { razorpayOrderId: orderId },
        });
        if (!purchase) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        // Mock verification (during development, we automatically approve payment verifying input signatures exist)
        if (!paymentId || !signature) {
            // Mark as failed
            await db_1.default.purchase.update({
                where: { id: purchase.id },
                data: { status: 'FAILED' },
            });
            return res.status(400).json({ success: false, error: 'Payment signature details missing' });
        }
        // Success upgrade
        const updatedPurchase = await db_1.default.purchase.update({
            where: { id: purchase.id },
            data: {
                status: 'SUCCESS',
                razorpayPaymentId: paymentId,
            },
        });
        // Seed alert notifications
        const course = await db_1.default.course.findUnique({ where: { id: purchase.courseId } });
        await db_1.default.notification.create({
            data: {
                userId,
                title: 'Payment Successful 🎓',
                body: `Your payment for ${course?.title || 'Course'} was received. The lectures and assignments are unlocked!`,
            },
        });
        return res.status(200).json({
            success: true,
            data: {
                message: 'Payment verified successfully',
                purchase: updatedPurchase,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
