const authService = require('../services/AuthService');
const importService = require('../services/ImportService');
const dashboardService = require('../services/DashboardService');
const evaluationService = require('../services/EvaluationService');
const distributionService = require('../services/DistributionService');
const reportService = require('../services/ReportService');
const AuditLogRepository = require('../repositories/AuditLogRepository');
const bcrypt = require('bcryptjs');
const User = require('../models/entities/userModel');
const FacultyRepository = require('../repositories/FacultyRepository');

class AdminFacade {
  async login(email, password) {
    return authService.login(email, password);
  }

  async getDashboard() {
    return dashboardService.getDashboard();
  }

  async previewExcel(fileBuffer) {
    return importService.parseExcel(fileBuffer);
  }

  async importRows(rows) {
    return importService.importRows(rows);
  }

  async importExcel(fileBuffer) {
    return importService.importFromExcel(fileBuffer);
  }

  async getAuditLogs() {
    return AuditLogRepository.findAll();
  }

  async unlockEvaluation(payload, performedBy) {
    const QuestionEvaluationRepository = require('../repositories/QuestionEvaluationRepository');
    if (!payload) throw new Error('No payload for unlock');

    // unlock single evaluation by id
    if (payload.evaluationId) {
      return evaluationService.unlockEvaluation(payload.evaluationId, performedBy);
    }

    // unlock all evaluations for a sheet + faculty (sheet-level unlock)
    if (payload.sheetId && payload.facultyId) {
      const evals = await QuestionEvaluationRepository.findAll({ sheetId: payload.sheetId, facultyId: payload.facultyId, status: 'UNLOCK_REQUESTED' });
      let count = 0;
      for (const ev of evals) {
        ev.status = 'UNLOCKED';
        ev.updatedAt = new Date();
        await ev.save();
        count += 1;
      }
      await AuditLogRepository.create({ action: 'ADMIN_UNLOCK_SHEET', performedBy, details: `Unlocked ${count} evaluations for sheet ${payload.sheetId} and faculty ${payload.facultyId}` });
      return { success: true, unlockedCount: count };
    }

    throw new Error('Invalid unlock payload');
  }

  async rejectUnlock(payload, performedBy) {
    const QuestionEvaluationRepository = require('../repositories/QuestionEvaluationRepository');
    if (!payload || !payload.sheetId || !payload.facultyId) throw new Error('sheetId and facultyId are required');
    const evals = await QuestionEvaluationRepository.findAll({ sheetId: payload.sheetId, facultyId: payload.facultyId, status: 'UNLOCK_REQUESTED' });
    let count = 0;
    for (const ev of evals) {
      ev.status = 'LOCKED';
      ev.updatedAt = new Date();
      await ev.save();
      count += 1;
    }
    await AuditLogRepository.create({ action: 'ADMIN_REJECT_UNLOCK', performedBy, details: `Rejected unlock for ${count} evaluations on sheet ${payload.sheetId} for faculty ${payload.facultyId}` });
    return { success: true, rejectedCount: count };
  }

  async configureDistribution(examId, strategyType, allocations) {
    return distributionService.configureDistribution(examId, strategyType, allocations);
  }

  async togglePublishExam(examId, performedBy) {
    const ExamRepository = require('../repositories/ExamRepository');
    const exam = await ExamRepository.findById(examId);
    if (!exam) throw new Error('Exam not found');
    exam.isPublished = !exam.isPublished;
    await exam.save();
    await AuditLogRepository.create({
      action: exam.isPublished ? 'PUBLISH_EXAM_RESULTS' : 'UNPUBLISH_EXAM_RESULTS',
      performedBy,
      details: `${exam.isPublished ? 'Published' : 'Unpublished'} results for ${exam.course} / ${exam.subject} (${exam.semester} ${exam.section} ${exam.examType})`
    });
    return { success: true, isPublished: exam.isPublished, exam };
  }

  async getReports() {
    return reportService.getReports();
  }

  async getUnlockRequests() {
    const QuestionEvaluationRepository = require('../repositories/QuestionEvaluationRepository');
    const AnswerSheetRepository = require('../repositories/AnswerSheetRepository');
    const StudentRepository = require('../repositories/StudentRepository');
    const FacultyRepository = require('../repositories/FacultyRepository');
    const ExamRepository = require('../repositories/ExamRepository');
    const evaluations = await QuestionEvaluationRepository.findAll({ status: 'UNLOCK_REQUESTED' });
    // group by sheetId + facultyId
    const map = new Map();
    for (const ev of evaluations) {
      const key = `${ev.sheetId.toString()}_${ev.facultyId.toString()}`;
      if (!map.has(key)) map.set(key, { sheetId: ev.sheetId, facultyId: ev.facultyId, questionNumbers: [], evaluations: [] });
      const entry = map.get(key);
      entry.questionNumbers.push(ev.questionNumber);
      entry.evaluations.push(ev);
    }

    const results = [];
    for (const [, entry] of map) {
      const sheet = await AnswerSheetRepository.findById(entry.sheetId);
      const student = sheet ? await StudentRepository.findById(sheet.studentId) : null;
      const faculty = await FacultyRepository.findById(entry.facultyId);
      const exam = sheet ? await ExamRepository.findById(sheet.examId) : null;

      results.push({
        sheetId: entry.sheetId,
        facultyId: entry.facultyId,
        facultyEmail: faculty?.email || null,
        facultyName: faculty?.name || null,
        studentId: student?._id || null,
        studentName: student?.name || 'Unknown',
        registrationNumber: student?.registrationNumber || 'N/A',
        examName: exam ? `${exam.course} / ${exam.subject}` : 'Unknown',
        questionNumbers: entry.questionNumbers.sort((a, b) => a - b)
      });
    }

    return results;
  }

  async listTeachers() {
    return User.find({ role: 'FACULTY' }).select('email name createdAt').lean();
  }

  async createTeacher({ email, name, password }) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new Error('Email already exists');
    }

    const hashed = await bcrypt.hash(password || 'faculty123', 10);
    const user = await User.create({ role: 'FACULTY', email, password: hashed, name });
    await FacultyRepository.create({ userId: user._id, name, email });
    return { id: user._id, email: user.email, name: user.name };
  }

  async updateTeacher(id, { email, name }) {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    if (email && email !== user.email) {
      const dup = await User.findOne({ email });
      if (dup) throw new Error('Email already exists');
      user.email = email;
    }
    if (name) user.name = name;
    await user.save();

    const faculty = await FacultyRepository.findOne({ userId: user._id });
    if (faculty) {
      faculty.name = user.name;
      faculty.email = user.email;
      await faculty.save();
    }

    return { id: user._id, email: user.email, name: user.name };
  }

  async deleteTeacher(id) {
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');
    await User.findByIdAndDelete(id);
    const faculty = await FacultyRepository.findOne({ userId: id });
    if (faculty) {
      await FacultyRepository.delete(faculty._id);
    }
    return { success: true };
  }

  async deleteExam(examId, performedBy) {
    const Exam = require('../models/entities/examModel');
    const AnswerSheet = require('../models/entities/answerSheetModel');
    const QuestionAllocation = require('../models/entities/questionAllocationModel');
    const QuestionEvaluation = require('../models/entities/questionEvaluationModel');
    const FacultyMapping = require('../models/entities/facultyMappingModel');

    const exam = await Exam.findById(examId);
    if (!exam) throw new Error('Exam not found');

    const sheets = await AnswerSheet.find({ examId });
    for (const sheet of sheets) {
      await QuestionEvaluation.deleteMany({ sheetId: sheet._id });
    }
    await AnswerSheet.deleteMany({ examId });
    await QuestionAllocation.deleteMany({ examId });
    await FacultyMapping.deleteMany({
      course: exam.course,
      subject: exam.subject,
      semester: exam.semester,
      section: exam.section,
      examType: exam.examType
    });
    await Exam.findByIdAndDelete(examId);

    await AuditLogRepository.create({
      action: 'ADMIN_DELETE_EXAM',
      performedBy,
      details: `Deleted exam ${exam.course} / ${exam.subject} (${exam.semester} ${exam.section} ${exam.examType})`
    });

    return { success: true, message: 'Exam deleted successfully' };
  }

  async deleteAnswerSheet(sheetId, performedBy) {
    const AnswerSheet = require('../models/entities/answerSheetModel');
    const QuestionEvaluation = require('../models/entities/questionEvaluationModel');

    const sheet = await AnswerSheet.findById(sheetId);
    if (!sheet) throw new Error('Answer sheet not found');

    await QuestionEvaluation.deleteMany({ sheetId: sheet._id });
    await AnswerSheet.findByIdAndDelete(sheetId);

    await AuditLogRepository.create({
      action: 'ADMIN_DELETE_ANSWER_SHEET',
      performedBy,
      details: `Deleted student answer sheet ${sheetId}`
    });

    return { success: true, message: 'Answer sheet deleted successfully' };
  }
}

module.exports = new AdminFacade();
