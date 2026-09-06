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
    if (!evaluations || !evaluations.length) return 'PENDING';
    const allMarked = evaluations.every((item) => item.marksObtained !== null && item.marksObtained !== undefined && item.marksObtained !== '');
    const hasCompleteStatus = evaluations.some((item) => ['COMPLETED', 'SUBMITTED', 'LOCKED'].includes(item.status));
    if (allMarked && hasCompleteStatus) {
      return 'COMPLETED';
    }
    if (evaluations.some((item) => item.status === 'DRAFT' || (item.marksObtained !== null && item.marksObtained !== undefined && item.marksObtained !== ''))) {
      return 'DRAFT';
    }
    return 'PENDING';
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
        let courseInChargeName = 'Course In-Charge';
        let allCoEvaluatorsHandedOver = true;
        if (exam) {
          if (exam.courseInChargeFacultyId) {
            const inChargeFac = await FacultyRepository.findById(exam.courseInChargeFacultyId);
            if (inChargeFac) courseInChargeName = inChargeFac.name;
          }
          const examAllocations = await QuestionAllocationRepository.findByExam(exam._id);
          const examFacultyIds = Array.from(new Set(examAllocations.map(a => a.facultyId.toString())));
          const inChargeId = exam.courseInChargeFacultyId ? exam.courseInChargeFacultyId.toString() : null;
          const coEvaluatorIds = examFacultyIds.filter(id => id !== inChargeId);
          const handedOverIds = (exam.handedOverFacultyIds || []).map(id => id.toString());
          allCoEvaluatorsHandedOver = coEvaluatorIds.length === 0 || coEvaluatorIds.every(id => handedOverIds.includes(id));
        }

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
          courseInChargeFacultyId: exam?.courseInChargeFacultyId || null,
          courseInChargeName,
          isCourseInCharge: Boolean(exam?.courseInChargeFacultyId && exam.courseInChargeFacultyId.toString() === faculty._id.toString()),
          handedOverFacultyIds: (exam?.handedOverFacultyIds || []).map((id) => id.toString()),
          isHandedOver: Boolean((exam?.handedOverFacultyIds || []).some((id) => id.toString() === faculty._id.toString())),
          allCoEvaluatorsHandedOver,
          questionNumbers: [],
          statuses: [],
          marks: [],
          pdfUrl: sheet?.pdfUrl || ''
        };
      }

      sheets[sheetId].questionNumbers.push(evaluation.questionNumber);
      sheets[sheetId].statuses.push(evaluation.status);
      sheets[sheetId].marks.push(evaluation.marksObtained);
    }

    return Object.values(sheets).map((item) => {
      const questionRange = item.questionNumbers.length
        ? `Q${Math.min(...item.questionNumbers)} to Q${Math.max(...item.questionNumbers)}`
        : 'N/A';

      const allMarked = item.marks.length > 0 && item.marks.every((m) => m !== null && m !== undefined && m !== '');
      const hasCompletedStatus = item.statuses.some((s) => ['COMPLETED', 'SUBMITTED', 'LOCKED'].includes(s));

      const status = item.statuses.includes('LOCKED')
        ? 'LOCKED'
        : item.statuses.includes('UNLOCK_REQUESTED')
          ? 'UNLOCK_REQUESTED'
          : (allMarked && hasCompletedStatus) || item.statuses.every((s) => ['COMPLETED', 'SUBMITTED', 'LOCKED'].includes(s))
            ? 'COMPLETED'
            : item.statuses.includes('DRAFT') || item.marks.some((m) => m !== null && m !== undefined && m !== '')
              ? 'DRAFT'
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
        courseInChargeFacultyId: item.courseInChargeFacultyId,
        courseInChargeName: item.courseInChargeName,
        isCourseInCharge: item.isCourseInCharge,
        handedOverFacultyIds: item.handedOverFacultyIds,
        isHandedOver: item.isHandedOver,
        allCoEvaluatorsHandedOver: item.allCoEvaluatorsHandedOver,
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
