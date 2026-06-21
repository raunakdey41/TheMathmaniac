import cron from 'node-cron';
import { generateDailyReport } from './reportBuilder';

export function startScheduler() {
  console.log('[Scheduler Service] Initializing daily cron scheduler...');
  
  // Schedule daily report generation at 11:55 PM (23:55)
  cron.schedule('55 23 * * *', async () => {
    console.log('[Scheduler] Executing daily staff attendance PDF generation task...');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const result = await generateDailyReport(todayStr);
      console.log(`[Scheduler] Daily report generated successfully: ${result.title} | URL: ${result.url}`);
    } catch (err: any) {
      console.error('[Scheduler Error] Daily report generation failed:', err.message || err);
    }
  });

  console.log('[Scheduler Service] Daily cron scheduler is active. Scheduled at 11:55 PM.');
}
