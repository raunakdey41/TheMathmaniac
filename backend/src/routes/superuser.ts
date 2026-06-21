import { Router, Response } from 'express';
import prisma from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { generateDailyReport } from '../services/reportBuilder';

const router = Router();

// Defined Superuser Phone Numbers (Raunak Dey and Shubhadeep Biswas)
const SUPERUSER_PHONES = ['+917980357754', '+919831754957'];

// Middleware to enforce Superuser access only
export function requireSuperuser(req: AuthenticatedRequest, res: Response, next: any) {
  if (!req.user || !SUPERUSER_PHONES.includes(req.user.phoneNumber)) {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: You do not have superuser privileges to access this report dashboard.'
    });
  }
  next();
}

// 1. Get History of Daily PDF Attendance Reports (Superuser only)
router.get('/reports', authenticateJWT, requireSuperuser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reports = await prisma.dailyReport.findMany({
      orderBy: { date: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error: any) {
    console.error('[Get Superuser Reports Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. On-Demand / Force Generate Daily Report (Superuser only)
router.post('/reports/generate', authenticateJWT, requireSuperuser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.body; // optional date param, e.g. "2026-06-22"
    const result = await generateDailyReport(date);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Report compiled successfully.',
        report: {
          title: result.title,
          date: result.date,
          pdfUrl: result.url,
        }
      }
    });
  } catch (error: any) {
    console.error('[Generate Report Error]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
