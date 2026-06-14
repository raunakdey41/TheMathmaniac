"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 1. Get Study Materials (Supports courseId filtering, requires auth)
router.get('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { courseId } = req.query;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const whereClause = {};
        if (courseId) {
            whereClause.courseId = String(courseId);
        }
        const materials = await db_1.default.studyMaterial.findMany({
            where: whereClause,
            include: {
                course: {
                    select: { title: true, price: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Check purchases to filter/mark accessible materials
        const purchases = await db_1.default.purchase.findMany({
            where: { userId, status: 'SUCCESS' },
            select: { courseId: true },
        });
        const purchasedCourseIds = purchases.map((p) => p.courseId);
        const materialsWithAccess = materials.map((mat) => {
            const isFree = mat.course.price === 0;
            const hasPurchased = purchasedCourseIds.includes(mat.courseId);
            const isAccessible = isFree || hasPurchased;
            return {
                id: mat.id,
                courseId: mat.courseId,
                courseTitle: mat.course.title,
                title: mat.title,
                type: mat.type,
                fileSize: mat.fileSize,
                fileUrl: isAccessible ? mat.fileUrl : null, // Hide URL if not purchased
                isAccessible,
            };
        });
        return res.status(200).json({ success: true, data: materialsWithAccess });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
