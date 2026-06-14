import { Router, Response } from 'express';
import prisma from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 1. Get Study Materials (Supports courseId filtering, requires auth)
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const whereClause: any = {};
    if (courseId) {
      whereClause.courseId = String(courseId);
    }

    const materials = await prisma.studyMaterial.findMany({
      where: whereClause,
      include: {
        course: {
          select: { title: true, price: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check purchases to filter/mark accessible materials
    const purchases = await prisma.purchase.findMany({
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
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
