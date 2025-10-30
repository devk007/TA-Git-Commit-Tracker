import ClassModel from '../models/Class.js';
import StudentModel from '../models/Student.js';
import CommitModel from '../models/Commit.js';
import githubService from './githubService.js';

const DAYS_IN_MS = 24 * 60 * 60 * 1000;

export const syncClassCommits = async ({ classId, days = 30 }) => {
  const classDoc = await ClassModel.findById(classId);
  if (!classDoc) {
    const error = new Error('Class not found.');
    error.status = 404;
    throw error;
  }

  const students = await StudentModel.find({ classId });
  if (!students.length) {
    const error = new Error('No students found for this class.');
    error.status = 400;
    throw error;
  }

  const since = Number.isFinite(Number(days)) ? new Date(Date.now() - Number(days) * DAYS_IN_MS) : null;
  const until = new Date();

  const syncSummary = {
    processedStudents: students.length,
    commitsUpserted: 0,
    studentErrors: [],
  };

  for (const student of students) {
    try {
      const commits = await githubService.fetchCommits({
        repoUrl: student.repoUrl,
        since,
        until,
      });

      if (commits.length) {
        const bulkOps = commits.map((commit) => ({
          updateOne: {
            filter: { student: student._id, sha: commit.sha },
            update: {
              student: student._id,
              class: classDoc._id,
              sha: commit.sha,
              message: commit.message,
              htmlUrl: commit.htmlUrl,
              authorDate: commit.authorDate,
            },
            upsert: true,
          },
        }));

        const result = await CommitModel.bulkWrite(bulkOps, { ordered: false });
        syncSummary.commitsUpserted +=
          (result.upsertedCount || 0) + (result.modifiedCount || result.nModified || 0);
      }

      student.lastSyncedAt = new Date();
      await student.save();
    } catch (error) {
      syncSummary.studentErrors.push({
        studentId: student._id,
        name: student.name,
        message: error.message,
      });
    }
  }

  return syncSummary;
};
