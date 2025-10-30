import cron from 'node-cron';
import ClassModel from '../models/Class.js';
import { syncClassCommits } from '../services/syncService.js';

export const scheduleClassSync = () => {
  const cronExpression = process.env.SYNC_CRON || '0 3 * * *';
  const autoSyncEnabled = process.env.ENABLE_AUTO_SYNC === 'true';

  if (!autoSyncEnabled) {
    return;
  }

  cron.schedule(cronExpression, async () => {
    // eslint-disable-next-line no-console
    console.log('Running scheduled commit sync...');
    const classes = await ClassModel.find();

    for (const classDoc of classes) {
      try {
        const summary = await syncClassCommits({
          classId: classDoc._id,
          days: process.env.SYNC_WINDOW_DAYS || 30,
        });

        // eslint-disable-next-line no-console
        console.log(`Class ${classDoc.name} synced`, summary);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Scheduled sync error for class ${classDoc._id}:`, error.message);
      }
    }
  });
};
