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
const db_1 = __importDefault(require("../config/db"));
const jwt = __importStar(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'mathemaniac_secret_key';
// Helper to check token optionally
function getOptionalUserId(authHeader) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            return decoded.id;
        }
        catch (e) {
            return null;
        }
    }
    return null;
}
// 1. Get Categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await db_1.default.courseCategory.findMany();
        return res.status(200).json({ success: true, data: categories });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 2. Get Courses (Supports search, category filters, and limit)
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        const whereClause = {};
        if (category) {
            whereClause.category = { slug: String(category) };
        }
        if (search) {
            whereClause.OR = [
                { title: { contains: String(search), mode: 'insensitive' } },
                { description: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        // Always check if current user purchased these courses
        const userId = getOptionalUserId(req.headers.authorization);
        const courses = await db_1.default.course.findMany({
            where: whereClause,
            include: {
                category: true,
                _count: {
                    select: { lectures: true },
                },
            },
        });
        let purchasedCourseIds = [];
        if (userId) {
            const purchases = await db_1.default.purchase.findMany({
                where: { userId, status: 'SUCCESS' },
                select: { courseId: true },
            });
            purchasedCourseIds = purchases.map((p) => p.courseId);
        }
        const coursesWithPurchaseInfo = courses.map((course) => ({
            ...course,
            isPurchased: purchasedCourseIds.includes(course.id),
            lectureCount: course._count.lectures,
        }));
        return res.status(200).json({ success: true, data: coursesWithPurchaseInfo });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 3. Get Course Details by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getOptionalUserId(req.headers.authorization);
        const course = await db_1.default.course.findUnique({
            where: { id },
            include: {
                category: true,
                lectures: {
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        duration: true,
                        sortOrder: true,
                    },
                },
                _count: {
                    select: { lectures: true },
                },
            },
        });
        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }
        // Determine purchase status
        let isPurchased = false;
        let progressList = [];
        if (userId) {
            const purchase = await db_1.default.purchase.findFirst({
                where: { userId, courseId: id, status: 'SUCCESS' },
            });
            isPurchased = !!purchase;
            // Fetch progress for this user on this course's lectures
            progressList = await db_1.default.lectureProgress.findMany({
                where: {
                    userId,
                    lecture: { courseId: id },
                },
            });
        }
        // Return detailed course, embedding public details + outline
        return res.status(200).json({
            success: true,
            data: {
                ...course,
                isPurchased,
                learningOutcomes: JSON.parse(course.learningOutcomes || '[]'),
                lectureCount: course._count.lectures,
                lectures: course.lectures.map((lecture) => {
                    const progress = progressList.find((p) => p.lectureId === lecture.id);
                    return {
                        ...lecture,
                        lastPosition: progress ? progress.lastPosition : 0,
                        completed: progress ? progress.completed : false,
                    };
                }),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
