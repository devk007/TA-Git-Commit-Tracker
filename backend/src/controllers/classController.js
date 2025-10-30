import mongoose from 'mongoose';
import XLSX from 'xlsx';
import ClassModel from '../models/Class.js';
import StudentModel from '../models/Student.js';
import CommitModel from '../models/Commit.js';
import parseWorkbook from '../utils/excelParser.js';
import { syncClassCommits } from '../services/syncService.js';

const DAYS_IN_MS = 24 * 60 * 60 * 1000;

const coerceValue = (value) => {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return value;
};

const parseNumericFilter = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildSortComparator = (sortBy, sortOrder) => {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return (a, b) => {
    const left = coerceValue(a[sortBy]);
    const right = coerceValue(b[sortBy]);

    if (left < right) return -1 * direction;
    if (left > right) return 1 * direction;
    return 0;
  };
};

export const createClass = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Class name is required.' });
    }

    const existing = await ClassModel.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: 'A class with this name already exists.' });
    }

    const created = await ClassModel.create({
      name: name.trim(),
      description: description?.trim(),
    });

    return res.status(201).json(created);
  } catch (error) {
    return next(error);
  }
};

export const getClasses = async (req, res, next) => {
  try {
    const classes = await ClassModel.find().sort({ createdAt: -1 });
    return res.json(classes);
  } catch (error) {
    return next(error);
  }
};

export const getClassById = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const includeStudents = req.query.includeStudents === 'true';

    const classDoc = await ClassModel.findById(classId);

    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    if (!includeStudents) {
      return res.json(classDoc);
    }

    const students = await StudentModel.find({ classId }).sort({ createdAt: 1 });

    return res.json({
      ...classDoc.toObject(),
      students,
    });
  } catch (error) {
    return next(error);
  }
};

export const uploadStudents = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Upload file using form field "file".' });
  }

  const { classId } = req.params;

  const processUpload = async (session) => {
    const classQuery = session
      ? ClassModel.findById(classId).session(session)
      : ClassModel.findById(classId);
    const classDoc = await classQuery;

    if (!classDoc) {
      const notFoundError = new Error('Class not found.');
      notFoundError.status = 404;
      throw notFoundError;
    }

    const students = parseWorkbook(req.file.buffer);

    const rollSet = new Set();
    const repoSet = new Set();

    students.forEach((student) => {
      const rollKey = student.rollNumber.toLowerCase();
      const repoKey = student.repoUrl.toLowerCase();

      if (rollSet.has(rollKey) || repoSet.has(repoKey)) {
        const duplicateError = new Error(
          'Duplicate roll numbers or repo URLs found in the spreadsheet.',
        );
        duplicateError.status = 400;
        throw duplicateError;
      }

      rollSet.add(rollKey);
      repoSet.add(repoKey);
    });

    const rollNumbers = students.map((student) => student.rollNumber.toLowerCase());
    const repoUrls = students.map((student) => student.repoUrl.toLowerCase());

    let existingQuery = StudentModel.find({
      classId: classDoc._id,
      $or: [
        { rollNumber: { $in: rollNumbers } },
        { repoUrl: { $in: repoUrls } },
      ],
    });
    if (session) {
      existingQuery = existingQuery.session(session);
    }
    const existingStudents = await existingQuery.lean();

    const existingRolls = new Set(existingStudents.map((student) => student.rollNumber.toLowerCase()));
    const existingRepos = new Set(existingStudents.map((student) => student.repoUrl.toLowerCase()));

    const studentsToInsert = students.filter((student) => {
      const rollLower = student.rollNumber.toLowerCase();
      const repoLower = student.repoUrl.toLowerCase();
      return !existingRolls.has(rollLower) && !existingRepos.has(repoLower);
    });

    if (studentsToInsert.length) {
      const insertOptions = session ? { session, ordered: false } : { ordered: false };
      await StudentModel.insertMany(
        studentsToInsert.map((student) => ({
          classId: classDoc._id,
          name: student.name,
          rollNumber: student.rollNumber,
          repoUrl: student.repoUrl,
          groupType: student.groupType,
        })),
        insertOptions,
      );
    }

    classDoc.studentsUploaded = true;
    const saveOptions = session ? { session } : undefined;
    await classDoc.save(saveOptions);

    return {
      message: 'Students uploaded successfully.',
      insertedCount: studentsToInsert.length,
      skippedExisting: students.length - studentsToInsert.length,
    };
  };

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await processUpload(session);
    await session.commitTransaction();
    return res.status(201).json(result);
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (_) {
        /* ignore abort errors */
      }
      session.endSession();
      session = null;
    }

    const unsupportedTransactionMessage =
      error?.message && error.message.includes('Transaction numbers are only allowed');

    if (unsupportedTransactionMessage) {
      try {
        const result = await processUpload();
        return res.status(201).json(result);
      } catch (fallbackError) {
        return next(fallbackError);
      }
    }

    return next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const addStudent = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { name, rollNumber, repoUrl, groupType } = req.body;

    if (!name || !rollNumber || !repoUrl || !groupType) {
      return res.status(400).json({ message: 'name, rollNumber, repoUrl and groupType are required.' });
    }

    if (!['courseWork', 'personalProjects'].includes(groupType)) {
      return res.status(400).json({ message: 'groupType must be courseWork or personalProjects.' });
    }

    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const student = await StudentModel.create({
      classId,
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      repoUrl: repoUrl.trim(),
      groupType,
    });

    return res.status(201).json(student);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Student roll number or repo already exists in this class.' });
    }
    return next(error);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;
    const { name, rollNumber, repoUrl, groupType } = req.body;

    const student = await StudentModel.findOne({ _id: studentId, classId });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (groupType && !['courseWork', 'personalProjects'].includes(groupType)) {
      return res.status(400).json({ message: 'groupType must be courseWork or personalProjects.' });
    }

    if (name) student.name = name.trim();
    if (rollNumber) student.rollNumber = rollNumber.trim();
    if (repoUrl) student.repoUrl = repoUrl.trim();
    if (groupType) student.groupType = groupType;

    await student.save();

    return res.json(student);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Student roll number or repo already exists in this class.' });
    }
    return next(error);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const { classId, studentId } = req.params;

    const student = await StudentModel.findOneAndDelete({ _id: studentId, classId });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    await CommitModel.deleteMany({ student: studentId });

    return res.json({ message: 'Student removed.' });
  } catch (error) {
    return next(error);
  }
};

export const triggerSync = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { days = 30 } = req.body || {};

    const summary = await syncClassCommits({ classId, days });

    return res.json(summary);
  } catch (error) {
    return next(error);
  }
};

const buildDashboardData = async ({
  classId,
  groupType,
  days,
  sortBy,
  sortOrder,
  search,
  minCommits,
  maxCommits,
}) => {
  const targetGroup = ['courseWork', 'personalProjects'].includes(groupType)
    ? groupType
    : 'courseWork';
  const windowDays = Number(days) > 0 ? Number(days) : 7;
  const since = new Date(Date.now() - windowDays * DAYS_IN_MS);
  const until = new Date();

  const students = await StudentModel.find({ classId, groupType: targetGroup }).lean();

  if (!students.length) {
    return {
      classId,
      groupType: targetGroup,
      since,
      until,
      windowDays,
      studentCount: 0,
      totalCommits: 0,
      averageCommits: 0,
      sortBy: 'totalCommits',
      sortOrder: 'desc',
      students: [],
      filters: {
        search: undefined,
        minCommits: undefined,
        maxCommits: undefined,
      },
    };
  }

  const studentIds = students.map((student) => student._id);

  const commitAggregates = await CommitModel.aggregate([
    {
      $match: {
        student: { $in: studentIds },
        authorDate: { $gte: since, $lte: until },
      },
    },
    {
      $group: {
        _id: '$student',
        totalCommits: { $sum: 1 },
      },
    },
  ]);

  const commitMap = commitAggregates.reduce((acc, doc) => {
    acc[doc._id.toString()] = doc.totalCommits;
    return acc;
  }, {});

  let studentStats = students.map((student) => ({
    studentId: student._id,
    name: student.name,
    rollNumber: student.rollNumber,
    repoUrl: student.repoUrl,
    groupType: student.groupType,
    totalCommits: commitMap[student._id.toString()] || 0,
  }));

  const sortableFields = ['totalCommits', 'name', 'rollNumber'];
  const effectiveSortBy = sortableFields.includes(sortBy) ? sortBy : 'totalCommits';
  const effectiveSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  const trimmedSearch = typeof search === 'string' ? search.trim().toLowerCase() : '';
  let min = Number.isFinite(minCommits) ? minCommits : undefined;
  let max = Number.isFinite(maxCommits) ? maxCommits : undefined;

  if (min !== undefined && min < 0) {
    min = 0;
  }

  if (max !== undefined && max < 0) {
    max = 0;
  }

  if (min !== undefined && max !== undefined && min > max) {
    const temp = min;
    min = max;
    max = temp;
  }

  if (trimmedSearch) {
    studentStats = studentStats.filter((student) => {
      const nameMatch = student.name?.toLowerCase().includes(trimmedSearch);
      const rollMatch = student.rollNumber?.toLowerCase().includes(trimmedSearch);
      return nameMatch || rollMatch;
    });
  }

  if (min !== undefined) {
    studentStats = studentStats.filter((student) => student.totalCommits >= min);
  }

  if (max !== undefined) {
    studentStats = studentStats.filter((student) => student.totalCommits <= max);
  }

  studentStats.sort(buildSortComparator(effectiveSortBy, effectiveSortOrder));

  const totalCommits = studentStats.reduce((sum, student) => sum + student.totalCommits, 0);
  const averageCommits = studentStats.length
    ? Number((totalCommits / studentStats.length).toFixed(2))
    : 0;

  return {
    classId,
    groupType: targetGroup,
    since,
    until,
    windowDays,
    studentCount: studentStats.length,
    totalCommits,
    averageCommits,
    sortBy: effectiveSortBy,
    sortOrder: effectiveSortOrder,
    students: studentStats,
    filters: {
      search: trimmedSearch || undefined,
      minCommits: min,
      maxCommits: max,
    },
  };
};

export const exportStudentsExcel = async (req, res, next) => {
  try {
    const { classId } = req.params;

    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    const students = await StudentModel.find({ classId }).sort({ name: 1 }).lean();

    if (!students.length) {
      return res.status(400).json({ message: 'No students found to export.' });
    }

    const headerRow = ['Name', 'RollNo', 'RepoURL', 'GroupType', 'LastSyncedAt'];
    const sheetRows = students.map((student) => [
      student.name,
      student.rollNumber,
      student.repoUrl,
      student.groupType,
      student.lastSyncedAt ? new Date(student.lastSyncedAt).toISOString() : '',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...sheetRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const safeName = classDoc.name.replace(/[^a-z0-9-_]/gi, '_');
    const fileName = `${safeName || 'class'}_students.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
};

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const {
      groupType = 'courseWork',
      days = '7',
      sortBy = 'totalCommits',
      sortOrder = 'desc',
      search = '',
      minCommits,
      maxCommits,
    } = req.query;

    const minFilter = parseNumericFilter(minCommits);
    const maxFilter = parseNumericFilter(maxCommits);

    const dashboardData = await buildDashboardData({
      classId,
      groupType,
      days,
      sortBy,
      sortOrder,
      search,
      minCommits: minFilter,
      maxCommits: maxFilter,
    });

    return res.json(dashboardData);
  } catch (error) {
    return next(error);
  }
};

export const exportDashboardExcel = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const {
      groupType = 'courseWork',
      days = '7',
      sortBy = 'totalCommits',
      sortOrder = 'desc',
      search = '',
      minCommits,
      maxCommits,
    } = req.query;

    const minFilter = parseNumericFilter(minCommits);
    const maxFilter = parseNumericFilter(maxCommits);

    const dashboardData = await buildDashboardData({
      classId,
      groupType,
      days,
      sortBy,
      sortOrder,
      search,
      minCommits: minFilter,
      maxCommits: maxFilter,
    });

    if (!dashboardData.studentCount) {
      return res.status(400).json({ message: 'No commit data available for this selection.' });
    }

    const headerRow = ['Name', 'RollNo', 'RepoURL', 'GroupType', 'TotalCommits'];
    const sheetRows = dashboardData.students.map((student) => [
      student.name,
      student.rollNumber,
      student.repoUrl,
      student.groupType,
      student.totalCommits,
    ]);

    const metaRows = [
      ['Group Type', dashboardData.groupType],
      ['Date Range', `${dashboardData.since.toISOString()} - ${dashboardData.until.toISOString()}`],
      ['Average Commits', dashboardData.averageCommits],
      ['Total Commits', dashboardData.totalCommits],
    ];

    if (dashboardData.filters?.search) {
      metaRows.push(['Search Filter', dashboardData.filters.search]);
    }
    if (dashboardData.filters?.minCommits !== undefined) {
      metaRows.push(['Min Commits (>=)', dashboardData.filters.minCommits]);
    }
    if (dashboardData.filters?.maxCommits !== undefined) {
      metaRows.push(['Max Commits (<=)', dashboardData.filters.maxCommits]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...sheetRows]);
    XLSX.utils.sheet_add_aoa(worksheet, metaRows, { origin: `A${sheetRows.length + 3}` });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Commit Dashboard');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `commit_dashboard_${dashboardData.groupType}_${dashboardData.windowDays}d.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
};
