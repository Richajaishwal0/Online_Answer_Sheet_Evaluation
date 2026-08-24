const AppError = require('../exceptions/AppError');
const FacultyRepository = require('../repositories/FacultyRepository');
const QuestionAllocationRepository = require('../repositories/QuestionAllocationRepository');
const QuestionEvaluationRepository = require('../repositories/QuestionEvaluationRepository');
const AnswerSheetRepository = require('../repositories/AnswerSheetRepository');
const StudentRepository = require('../repositories/StudentRepository');
const ExamRepository = require('../repositories/ExamRepository');
const AuditLogRepository = require('../repositories/AuditLogRepository');
const bcrypt = require('bcryptjs');

class FacultyService {
  async getDashboard(facultyEmail) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) {
      throw new AppError('Faculty not found', 404);
    }

    const allocations = await QuestionAllocationRepository.findByFacultyId(faculty._id);
    const assignments = [];

    for (const allocation of allocations) {
      const exam = await ExamRepository.findById(allocation.examId);
      if (!exam) {
        continue;
      }

      const sheets = await AnswerSheetRepository.findAll({ examId: exam._id });
      for (const sheet of sheets) {
        const evaluations = await QuestionEvaluationRepository.findAll({
          sheetId: sheet._id,
          facultyId: faculty._id,
          questionNumber: { $gte: allocation.fromQuestion, $lte: allocation.toQuestion }
        });

        if (evaluations.length === 0) {
          continue;
        }

        const student = await StudentRepository.findById(sheet.studentId);
        const questionRange = `Q${allocation.fromQuestion} to Q${allocation.toQuestion}`;
        const status = this.summarizeStatus(evaluations);
        const evaluationSummary = this.countStatuses(evaluations);

        assignments.push({
          examId: exam._id,
          examName: `${exam.course} / ${exam.subject}`,
          examContext: `${exam.semester} ${exam.section} ${exam.examType}`,
          sheetId: sheet._id,
          studentId: student?._id || null,
          studentName: student?.name || 'Unknown',
          registrationNumber: student?.registrationNumber || 'Unknown',
          questionRange,
          assignedQuestions: evaluations.map((item) => item.questionNumber),
          status,
          evaluationSummary
        });
      }
    }

    const totalAssigned = assignments.length;
    const completed = assignments.filter((assignment) => assignment.status === 'COMPLETED').length;
    const pending = assignments.filter((assignment) => assignment.status !== 'COMPLETED').length;

    return {
      facultyName: faculty.name,
      totalAssigned,
      completed,
      pending,
      assignments
    };
  }

  summarizeStatus(evaluations) {
    const allComplete = evaluations.every((item) => ['SUBMITTED', 'LOCKED', 'UNLOCKED'].includes(item.status));
    return allComplete ? 'COMPLETED' : 'IN_PROGRESS';
  }

  countStatuses(evaluations) {
    return evaluations.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  }

  async getAssignedItems(facultyEmail) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) {
      throw new AppError('Faculty not found', 404);
    }

    const evaluations = await QuestionEvaluationRepository.findAll({ facultyId: faculty._id });
    const sheets = {};

    for (const evaluation of evaluations) {
      const sheetId = evaluation.sheetId.toString();
      if (!sheets[sheetId]) {
        const sheet = await AnswerSheetRepository.findById(evaluation.sheetId);
        const student = sheet ? await StudentRepository.findById(sheet.studentId) : null;
        const exam = sheet ? await ExamRepository.findById(sheet.examId) : null;
        sheets[sheetId] = {
          sheetId: sheet?._id || evaluation.sheetId,
          examId: exam?._id || null,
          studentName: student?.name || 'Unknown',
          registrationNumber: student?.registrationNumber || 'N/A',
          course: exam?.course || 'General',
          subject: exam?.subject || 'Unknown Subject',
          semester: exam?.semester || '',
          section: exam?.section || '',
          examType: exam?.examType || '',
          questionWeightage: exam?.questionWeightage || [],
          convertedScale: exam?.convertedScale || 30,
          examName: exam ? `${exam.course} / ${exam.subject}` : 'Unknown',
          examContext: exam ? `${exam.semester} ${exam.section} ${exam.examType}` : '',
          finalSubmittedToAdmin: Boolean(exam?.finalSubmittedToAdmin),
          isPublished: Boolean(exam?.isPublished),
          questionNumbers: [],
          statuses: [],
          pdfUrl: sheet?.pdfUrl || ''
        };
      }

      sheets[sheetId].questionNumbers.push(evaluation.questionNumber);
      sheets[sheetId].statuses.push(evaluation.status);
    }

    return Object.values(sheets).map((item) => {
      const questionRange = item.questionNumbers.length
        ? `Q${Math.min(...item.questionNumbers)} to Q${Math.max(...item.questionNumbers)}`
        : 'N/A';
      const status = item.statuses.includes('LOCKED')
        ? 'LOCKED'
        : item.statuses.includes('UNLOCK_REQUESTED')
          ? 'UNLOCK_REQUESTED'
          : item.statuses.includes('DRAFT')
            ? 'DRAFT'
            : item.statuses.includes('SUBMITTED')
              ? 'COMPLETED'
              : 'PENDING';

      const summary = item.statuses.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {});

      return {
        sheetId: item.sheetId,
        examId: item.examId,
        studentName: item.studentName,
        registrationNumber: item.registrationNumber,
        course: item.course,
        subject: item.subject,
        semester: item.semester,
        section: item.section,
        examType: item.examType,
        questionWeightage: item.questionWeightage,
        convertedScale: item.convertedScale,
        examName: item.examName,
        examContext: item.examContext,
        finalSubmittedToAdmin: item.finalSubmittedToAdmin,
        isPublished: item.isPublished,
        questionRange,
        status,
        evaluationSummary: summary,
        pdfUrl: item.pdfUrl
      };
    });
  }

  async updateEvaluation(evaluationId, facultyEmail, payload) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) {
      throw new AppError('Faculty not found', 404);
    }

    const evaluation = await QuestionEvaluationRepository.findById(evaluationId);
    if (!evaluation) {
      throw new AppError('Evaluation not found', 404);
    }

    if (evaluation.facultyId.toString() !== faculty._id.toString()) {
      throw new AppError('Access denied', 403);
    }

    if ((evaluation.status === 'LOCKED' || evaluation.status === 'UNLOCK_REQUESTED') && payload.force !== true) {
      throw new AppError('This evaluation is locked and can only be modified after admin unlock', 403);
    }

    if (payload.marksObtained !== undefined) {
      // clamp to exam question max if available
      const sheet = await AnswerSheetRepository.findById(evaluation.sheetId);
      const exam = sheet ? await ExamRepository.findById(sheet.examId) : null;
      const maxMark = exam?.questionWeightage?.[evaluation.questionNumber - 1];
      evaluation.marksObtained = (maxMark != null) ? Math.min(payload.marksObtained, maxMark) : payload.marksObtained;
    }
    if (payload.review !== undefined) {
      evaluation.review = payload.review;
    }
    if (payload.status) {
      evaluation.status = payload.status;
    }
    if (payload.requestUnlock) {
      evaluation.status = 'UNLOCK_REQUESTED';
    }

    evaluation.updatedAt = new Date();
    await evaluation.save();

    await AuditLogRepository.create({
      action: 'FACULTY_EVALUATION_UPDATE',
      performedBy: facultyEmail,
      details: `Updated evaluation ${evaluation._id}`
    });

    return evaluation;
  }

  async submitEvaluation(evaluationId, facultyEmail) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) {
      throw new AppError('Faculty not found', 404);
    }

    const evaluation = await QuestionEvaluationRepository.findById(evaluationId);
    if (!evaluation) {
      throw new AppError('Evaluation not found', 404);
    }

    if (evaluation.facultyId.toString() !== faculty._id.toString()) {
      throw new AppError('Access denied', 403);
    }

    evaluation.status = 'LOCKED';
    evaluation.updatedAt = new Date();
    await evaluation.save();

    await AuditLogRepository.create({
      action: 'FACULTY_EVALUATION_SUBMITTED',
      performedBy: facultyEmail,
      details: `Submitted evaluation ${evaluation._id}`
    });

    return evaluation;
  }

  async requestUnlock(evaluationId, facultyEmail) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) {
      throw new AppError('Faculty not found', 404);
    }

    const evaluation = await QuestionEvaluationRepository.findById(evaluationId);
    if (!evaluation) {
      throw new AppError('Evaluation not found', 404);
    }

    if (evaluation.facultyId.toString() !== faculty._id.toString()) {
      throw new AppError('Access denied', 403);
    }

    evaluation.status = 'UNLOCK_REQUESTED';
    evaluation.updatedAt = new Date();
    await evaluation.save();

    await AuditLogRepository.create({
      action: 'FACULTY_UNLOCK_REQUEST',
      performedBy: facultyEmail,
      details: `Requested unlock for evaluation ${evaluation._id}`
    });

    return evaluation;
  }

  async changePassword(facultyEmail, oldPassword, newPassword) {
    const user = await require('../models/entities/userModel').findOne({ email: facultyEmail });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      throw new AppError('Old password is incorrect', 400);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await AuditLogRepository.create({
      action: 'FACULTY_PASSWORD_CHANGE',
      performedBy: facultyEmail,
      details: 'Faculty changed password'
    });

    return { success: true };
  }
}

module.exports = new FacultyService();
