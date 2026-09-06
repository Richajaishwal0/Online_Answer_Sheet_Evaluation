const AppError = require('../exceptions/AppError');
const FacultyRepository = require('../repositories/FacultyRepository');
const QuestionAllocationRepository = require('../repositories/QuestionAllocationRepository');
const QuestionEvaluationRepository = require('../repositories/QuestionEvaluationRepository');
const AnswerSheetRepository = require('../repositories/AnswerSheetRepository');
const ExamRepository = require('../repositories/ExamRepository');
const StudentRepository = require('../repositories/StudentRepository');
const AuditLogRepository = require('../repositories/AuditLogRepository');
const aumsExportAdapter = require('../adapters/excel/AUMSExportAdapter');

class FacultyEvaluationService {
  async getFacultySheetEvaluations(facultyEmail, sheetId) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) throw new AppError('Faculty not found', 404);

    const sheet = await AnswerSheetRepository.findById(sheetId);
    if (!sheet) throw new AppError('Answer sheet not found', 404);

    const exam = await ExamRepository.findById(sheet.examId);
    const answerKeyUrl = exam ? (exam.answerKeyUrl || '') : '';
    const questionPaperUrl = exam ? (exam.questionPaperUrl || '') : '';
    const convertedScale = exam?.convertedScale || 30;
    const finalSubmittedToAdmin = Boolean(exam?.finalSubmittedToAdmin);
    const isPublished = Boolean(exam?.isPublished);

    // Fetch ALL evaluations for this sheet (to show co-evaluators' scores & live running total)
    const allEvaluations = await QuestionEvaluationRepository.findAll({ sheetId });

    // Filter evaluations assigned specifically to the requesting faculty
    const myEvaluations = allEvaluations.filter((ev) => ev.facultyId.toString() === faculty._id.toString());

    // Build co-evaluators information
    const coEvaluatorsMap = new Map();
    for (const ev of allEvaluations) {
      if (ev.facultyId.toString() !== faculty._id.toString()) {
        const facId = ev.facultyId.toString();
        if (!coEvaluatorsMap.has(facId)) {
          const coFac = await FacultyRepository.findById(ev.facultyId);
          coEvaluatorsMap.set(facId, {
            name: coFac?.name || 'Co-Evaluator',
            evaluations: []
          });
        }
        coEvaluatorsMap.get(facId).evaluations.push({
          questionNumber: ev.questionNumber,
          marksObtained: ev.marksObtained,
          status: ev.status,
          maxMark: exam?.questionWeightage?.[ev.questionNumber - 1] ?? null
        });
      }
    }

    const coEvaluators = Array.from(coEvaluatorsMap.values());

    const formattedMyEvals = myEvaluations
      .map((item) => ({
        evaluationId: item._id,
        questionNumber: item.questionNumber,
        marksObtained: item.marksObtained,
        review: item.review || '',
        status: item.status,
        maxMark: exam?.questionWeightage?.[item.questionNumber - 1] ?? null
      }))
      .sort((a, b) => a.questionNumber - b.questionNumber);

    return {
      sheetId: sheet._id,
      sheetPdfUrl: sheet.pdfUrl || '',
      questionPaperUrl,
      answerKeyUrl,
      examType: exam ? exam.examType : 'Mid_Term',
      convertedScale,
      finalSubmittedToAdmin,
      isPublished,
      evaluations: formattedMyEvals,
      allEvaluations: allEvaluations.map((item) => ({
        questionNumber: item.questionNumber,
        marksObtained: item.marksObtained,
        maxMark: exam?.questionWeightage?.[item.questionNumber - 1] ?? null,
        facultyId: item.facultyId
      })),
      coEvaluators
    };
  }

  async saveDraft(facultyEmail, sheetId, updates) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) throw new AppError('Faculty not found', 404);

    const sheet = await AnswerSheetRepository.findById(sheetId);
    if (!sheet) throw new AppError('Answer sheet not found', 404);

    const exam = await ExamRepository.findById(sheet.examId);

    for (const update of updates || []) {
      const evaluation = await QuestionEvaluationRepository.findById(update.evaluationId);
      if (!evaluation) continue;
      if (evaluation.facultyId.toString() !== faculty._id.toString()) continue;
      if (evaluation.sheetId.toString() !== sheetId) continue;
      if (exam?.finalSubmittedToAdmin) {
        throw new AppError('Evaluation is permanently locked post Final Submission to Admin.', 403);
      }

      if (update.marksObtained !== undefined && update.marksObtained !== null && update.marksObtained !== '') {
        const val = Number(update.marksObtained);
        if (Number.isNaN(val) || !Number.isInteger(val)) {
          throw new AppError(`Marks for Question ${evaluation.questionNumber} must be a whole integer`, 400);
        }
        if (val < 0) throw new AppError(`Marks for Question ${evaluation.questionNumber} cannot be negative`, 400);

        const maxMark = exam?.questionWeightage?.[evaluation.questionNumber - 1];
        if (maxMark != null && val > maxMark) {
          throw new AppError(`Marks for Question ${evaluation.questionNumber} (${val}) cannot exceed maximum allowed mark (${maxMark})`, 400);
        }
        evaluation.marksObtained = val;
      } else {
        evaluation.marksObtained = null;
      }

      evaluation.review = update.review ?? evaluation.review;
      evaluation.status = 'DRAFT';
      evaluation.updatedAt = new Date();
      await evaluation.save();
    }

    await AuditLogRepository.create({ action: 'FACULTY_DRAFT_SAVE', performedBy: facultyEmail, details: `Draft save for sheet ${sheetId}` });
    return { success: true };
  }

  async submitSheet(facultyEmail, sheetId, updates) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) throw new AppError('Faculty not found', 404);

    const sheet = await AnswerSheetRepository.findById(sheetId);
    if (!sheet) throw new AppError('Answer sheet not found', 404);

    const exam = await ExamRepository.findById(sheet.examId);
    if (exam?.finalSubmittedToAdmin) {
      throw new AppError('Evaluation is permanently locked post Final Submission to Admin.', 403);
    }

    // Verify that ALL assigned evaluations for this faculty & sheet have a valid mark
    const assignedEvaluations = await QuestionEvaluationRepository.findAll({
      sheetId,
      facultyId: faculty._id
    });

    if (!assignedEvaluations.length) {
      throw new AppError('No assigned questions found for this sheet', 400);
    }

    const updateMap = new Map();
    (updates || []).forEach((u) => updateMap.set(String(u.evaluationId), u));

    for (const ev of assignedEvaluations) {
      const u = updateMap.get(String(ev._id));
      const markValue = u ? u.marksObtained : ev.marksObtained;
      if (markValue === null || markValue === undefined || markValue === '') {
        throw new AppError(`Cannot submit evaluation: Question ${ev.questionNumber} has not been evaluated yet. All assigned questions must be marked before submission.`, 400);
      }
    }

    for (const update of updates || []) {
      const evaluation = await QuestionEvaluationRepository.findById(update.evaluationId);
      if (!evaluation) continue;
      if (evaluation.facultyId.toString() !== faculty._id.toString()) continue;
      if (evaluation.sheetId.toString() !== sheetId) continue;

      const val = Number(update.marksObtained);
      if (Number.isNaN(val) || !Number.isInteger(val)) {
        throw new AppError(`Marks for Question ${evaluation.questionNumber} must be a whole integer`, 400);
      }
      if (val < 0) throw new AppError(`Marks for Question ${evaluation.questionNumber} cannot be negative`, 400);

      const maxMark = exam?.questionWeightage?.[evaluation.questionNumber - 1];
      if (maxMark != null && val > maxMark) {
        throw new AppError(`Marks for Question ${evaluation.questionNumber} (${val}) cannot exceed maximum allowed mark (${maxMark})`, 400);
      }
      evaluation.marksObtained = val;
      evaluation.review = update.review ?? evaluation.review;
      evaluation.status = 'COMPLETED';
      evaluation.evaluatorSubmitted = true;
      evaluation.updatedAt = new Date();
      await evaluation.save();
    }

    await AuditLogRepository.create({ action: 'FACULTY_SUBMIT', performedBy: facultyEmail, details: `Submitted section evaluations for sheet ${sheetId}` });
    return { success: true };
  }

  async finalSubmitToAdmin(facultyEmail, examId) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) throw new AppError('Faculty not found', 404);

    const exam = await ExamRepository.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);

    if (!exam.isPublished) {
      throw new AppError('Cannot submit to Admin: Marks must be published for student review first.', 400);
    }

    // Verify all answer sheets for this exam have 100% completed question evaluations
    const answerSheets = await AnswerSheetRepository.findAll({ examId });
    for (const sheet of answerSheets) {
      const evals = await QuestionEvaluationRepository.findAll({ sheetId: sheet._id });
      const pendingCount = evals.filter((e) => e.marksObtained === null || e.marksObtained === undefined).length;
      if (pendingCount > 0) {
        throw new AppError(`Cannot perform Final Submit: Student answer sheet ${sheet._id} still has ${pendingCount} un-evaluated question(s).`, 400);
      }
    }

    for (const sheet of answerSheets) {
      const evals = await QuestionEvaluationRepository.findAll({ sheetId: sheet._id });
      for (const evaluation of evals) {
        evaluation.status = 'SUBMITTED';
        await evaluation.save();
      }
    }

    exam.finalSubmittedToAdmin = true;
    await exam.save();

    await AuditLogRepository.create({
      action: 'FACULTY_FINAL_SUBMIT_TO_ADMIN',
      performedBy: facultyEmail,
      details: `Final submitted exam ${exam.course} / ${exam.subject} (${exam.semester} ${exam.section} ${exam.examType}) to Admin`
    });

    return { success: true, message: 'Final submission completed. Exam marks are now permanently locked.' };
  }

  async toggleFacultyPublish(facultyEmail, examId) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) throw new AppError('Faculty not found', 404);

    const exam = await ExamRepository.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);

    exam.isPublished = !exam.isPublished;
    await exam.save();

    await AuditLogRepository.create({
      action: exam.isPublished ? 'FACULTY_PUBLISH_RESULTS' : 'FACULTY_UNPUBLISH_RESULTS',
      performedBy: facultyEmail,
      details: `${exam.isPublished ? 'Published' : 'Unpublished'} results for ${exam.course} / ${exam.subject}`
    });

    return { success: true, isPublished: exam.isPublished };
  }

  async generateAUMSExport(facultyEmail, examId) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) throw new AppError('Faculty not found', 404);

    const exam = await ExamRepository.findById(examId);
    if (!exam) throw new AppError('Exam not found', 404);

    if (!exam.finalSubmittedToAdmin) {
      throw new AppError('Access Denied: Excel report export is restricted until Final Submission to Admin is completed.', 403);
    }

    const answerSheets = await AnswerSheetRepository.findAll({ examId: exam._id });
    const fullRawMarks = (exam.questionWeightage || []).reduce((a, b) => a + b, 0);
    const convertedScale = exam.convertedScale || 30;

    const rows = [];
    for (const sheet of answerSheets) {
      const student = await StudentRepository.findById(sheet.studentId);
      const evals = await QuestionEvaluationRepository.findAll({ sheetId: sheet._id });

      let rawScore = 0;
      let isComplete = true;
      evals.forEach((e) => {
        if (e.marksObtained !== null && e.marksObtained !== undefined) {
          rawScore += Number(e.marksObtained);
        } else {
          isComplete = false;
        }
      });

      const convertedMarks = fullRawMarks > 0 ? Math.round((rawScore / fullRawMarks) * convertedScale) : 0;

      rows.push({
        registrationNumber: student?.registrationNumber || 'N/A',
        studentName: student?.name || 'Unknown Student',
        course: exam.course,
        subject: exam.subject,
        semester: exam.semester,
        section: exam.section,
        examType: exam.examType,
        rawMarks: rawScore,
        convertedMarks,
        status: isComplete ? 'EVALUATED' : 'PARTIAL'
      });
    }

    return aumsExportAdapter.generateAUMSWorkbook(rows);
  }

  async requestUnlock(facultyEmail, sheetId) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) throw new AppError('Faculty not found', 404);

    const sheet = await AnswerSheetRepository.findById(sheetId);
    if (!sheet) throw new AppError('Answer sheet not found', 404);

    const evaluations = await QuestionEvaluationRepository.findAll({ sheetId, facultyId: faculty._id });
    for (const evaluation of evaluations) {
      if (evaluation.status === 'LOCKED' || evaluation.status === 'SUBMITTED') {
        evaluation.status = 'UNLOCK_REQUESTED';
        evaluation.updatedAt = new Date();
        await evaluation.save();
      }
    }

    await AuditLogRepository.create({ action: 'FACULTY_UNLOCK_REQUEST', performedBy: facultyEmail, details: `Unlock requested for sheet ${sheetId}` });
    return { success: true };
  }

  async getFacultyDashboardItems(facultyEmail) {
    const faculty = await FacultyRepository.findOne({ email: facultyEmail });
    if (!faculty) throw new AppError('Faculty not found', 404);

    const allocations = await QuestionAllocationRepository.findByFacultyId(faculty._id);
    const items = [];

    for (const allocation of allocations) {
      const exam = await ExamRepository.findById(allocation.examId);
      const answerSheets = await QuestionEvaluationRepository.findAll({ facultyId: faculty._id });
      const sheetIds = new Set(answerSheets.map((item) => item.sheetId.toString()));

      for (const sheetId of sheetIds) {
        const sheet = await AnswerSheetRepository.findById(sheetId);
        if (!sheet || sheet.examId.toString() !== allocation.examId.toString()) continue;

        const evaluations = await QuestionEvaluationRepository.findAll({ sheetId, facultyId: faculty._id });
        const relevant = evaluations.filter((item) => item.questionNumber >= allocation.fromQuestion && item.questionNumber <= allocation.toQuestion);
        const statuses = relevant.map((item) => item.status);
        const min = relevant[0]?.questionNumber;
        const max = relevant[relevant.length - 1]?.questionNumber;
        const student = await StudentRepository.findById(sheet.studentId);
        items.push({
          sheetId: sheet._id,
          examId: exam._id,
          studentName: student?.name || 'Unknown',
          registrationNumber: student?.registrationNumber || 'N/A',
          examName: exam ? `${exam.course} / ${exam.subject}` : 'Unknown',
          questionRange: min && max ? `Q${min} to Q${max}` : 'N/A',
          status: statuses.includes('LOCKED') ? 'LOCKED' : statuses.includes('UNLOCK_REQUESTED') ? 'UNLOCK_REQUESTED' : statuses.includes('DRAFT') ? 'DRAFT' : 'PENDING',
          finalSubmittedToAdmin: Boolean(exam?.finalSubmittedToAdmin),
          isPublished: Boolean(exam?.isPublished)
        });
      }
    }

    return items;
  }
}

module.exports = new FacultyEvaluationService();


