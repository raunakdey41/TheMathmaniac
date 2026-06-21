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
// Helper function to check if a month is overdue and return late fine in Paisa
function getFineForMonth(monthStr) {
    const [year, month] = monthStr.split('-').map(Number);
    // Due date is the 10th of that month at 23:59:59.999
    const dueDate = new Date(year, month - 1, 10, 23, 59, 59, 999);
    const now = new Date();
    if (now > dueDate) {
        return 5000; // ₹50 in Paisa
    }
    return 0;
}
// 3. Get Student Fee Payments
router.get('/fees', auth_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        // Auto-ensure that fee payments exist for this student for the current month and the previous month
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
        const monthsToCheck = [prevMonthStr, currentMonthStr];
        for (const m of monthsToCheck) {
            const existingFee = await db_1.default.feePayment.findFirst({
                where: { userId, month: m },
            });
            if (!existingFee) {
                await db_1.default.feePayment.create({
                    data: {
                        userId,
                        month: m,
                        amount: 100000, // ₹1,000 in Paisa
                        fine: 0,
                        totalAmount: 100000,
                        status: 'PENDING',
                    },
                });
            }
        }
        // Fetch fee records
        const fees = await db_1.default.feePayment.findMany({
            where: { userId },
            orderBy: { month: 'desc' },
        });
        // Update pending fees dynamically with correct fines
        const updatedFees = [];
        for (const fee of fees) {
            if (fee.status === 'PENDING') {
                const currentFine = getFineForMonth(fee.month);
                if (fee.fine !== currentFine) {
                    const updated = await db_1.default.feePayment.update({
                        where: { id: fee.id },
                        data: {
                            fine: currentFine,
                            totalAmount: fee.amount + currentFine,
                        },
                    });
                    updatedFees.push(updated);
                }
                else {
                    updatedFees.push(fee);
                }
            }
            else {
                updatedFees.push(fee);
            }
        }
        return res.status(200).json({
            success: true,
            data: updatedFees,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 4. Create Fee Payment Order
router.post('/fees/order', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { feeId } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const fee = await db_1.default.feePayment.findUnique({
            where: { id: feeId },
        });
        if (!fee || fee.userId !== userId) {
            return res.status(404).json({ success: false, error: 'Fee record not found' });
        }
        if (fee.status === 'SUCCESS') {
            return res.status(400).json({ success: false, error: 'Fee already paid' });
        }
        // Recalculate late fine at moment of checkout
        const currentFine = getFineForMonth(fee.month);
        const totalAmount = fee.amount + currentFine;
        const mockOrderId = `order_fee_${Math.random().toString(36).substring(2, 12)}`;
        // Update record
        await db_1.default.feePayment.update({
            where: { id: feeId },
            data: {
                fine: currentFine,
                totalAmount,
                razorpayOrderId: mockOrderId,
                status: 'PENDING',
            },
        });
        return res.status(200).json({
            success: true,
            data: {
                orderId: mockOrderId,
                amount: totalAmount,
                currency: 'INR',
                month: fee.month,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 5. Verify Fee Payment
router.post('/fees/verify', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { orderId, paymentId, signature } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const fee = await db_1.default.feePayment.findUnique({
            where: { razorpayOrderId: orderId },
        });
        if (!fee || fee.userId !== userId) {
            return res.status(404).json({ success: false, error: 'Fee payment record not found for this order' });
        }
        if (!paymentId || !signature) {
            await db_1.default.feePayment.update({
                where: { id: fee.id },
                data: { status: 'FAILED' },
            });
            return res.status(400).json({ success: false, error: 'Payment signature details missing' });
        }
        // Update status to SUCCESS
        const updatedFee = await db_1.default.feePayment.update({
            where: { id: fee.id },
            data: {
                status: 'SUCCESS',
                razorpayPaymentId: paymentId,
                paidAt: new Date(),
            },
        });
        // Create Notification
        const formattedAmount = (fee.totalAmount / 100).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        });
        // Convert YYYY-MM to Month Name YYYY
        const [year, monthNum] = fee.month.split('-');
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = monthNames[parseInt(monthNum, 10) - 1];
        await db_1.default.notification.create({
            data: {
                userId,
                title: 'Fee Payment Successful 🧾',
                body: `Your payment of ${formattedAmount} for the month of ${monthName} ${year} has been received successfully.`,
            },
        });
        return res.status(200).json({
            success: true,
            data: {
                message: 'Fee payment verified successfully',
                fee: updatedFee,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
