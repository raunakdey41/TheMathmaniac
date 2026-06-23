import { Router, Response } from 'express';
import prisma from '../config/db';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mathemaniac_secret_key';

// Helper to check token optionally
function getOptionalUserId(authHeader: string | undefined): string | null {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      return decoded.id;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// 1. Get Categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.courseCategory.findMany();
    return res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Get Courses (Supports search, category filters, and limit)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const whereClause: any = {};

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

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        category: true,
        _count: {
          select: { lectures: true },
        },
      },
    });

    let purchasedCourseIds: string[] = [];
    if (userId) {
      const purchases = await prisma.purchase.findMany({
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
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Get Course Details by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getOptionalUserId(req.headers.authorization);

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        teachers: {
          include: {
            user: {
              select: { id: true, name: true, subjects: true }
            }
          }
        },
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
    let progressList: any[] = [];

    if (userId) {
      const purchase = await prisma.purchase.findFirst({
        where: { userId, courseId: id, status: 'SUCCESS' },
      });
      isPurchased = !!purchase;

      // Fetch progress for this user on this course's lectures
      progressList = await prisma.lectureProgress.findMany({
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
        learningOutcomes: JSON.parse(course.learningOutcomes as string || '[]'),
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
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
