const express = require('express');
const facultyService = require('../services/FacultyService');
const facultyEvaluationService = require('../services/FacultyEvaluationService');
const facultyAuthMiddleware = require('../middleware/facultyAuthMiddleware');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await require('../services/AuthService').login(email, password);
    if (result.user?.role !== 'FACULTY') throw new AppError('Access denied', 403);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyService.getDashboard(req.user.email);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/assignments', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyService.getAssignedItems(req.user.email);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/evaluations', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyEvaluationService.getFacultySheetEvaluations(req.user.email, req.query.sheetId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.put('/evaluations/sheet/:sheetId/draft', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyEvaluationService.saveDraft(req.user.email, req.params.sheetId, req.body.updates);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.put('/evaluations/sheet/:sheetId/submit', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyEvaluationService.submitSheet(req.user.email, req.params.sheetId, req.body.updates);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/evaluations/sheet/:sheetId/request-unlock', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyEvaluationService.requestUnlock(req.user.email, req.params.sheetId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.put('/evaluations/:evaluationId', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyService.updateEvaluation(req.params.evaluationId, req.user.email, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/evaluations/:evaluationId/submit', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const QuestionEvaluationRepository = require('../repositories/QuestionEvaluationRepository');
    const evaluation = await QuestionEvaluationRepository.findById(req.params.evaluationId);
    if (!evaluation) return res.status(404).json({ success: false, message: 'Evaluation not found' });
    // gather all evaluations for this sheet and faculty
    const evs = await QuestionEvaluationRepository.findAll({ sheetId: evaluation.sheetId, facultyId: evaluation.facultyId });
    const updates = evs.map((ev) => ({ evaluationId: ev._id, marksObtained: ev.marksObtained, review: ev.review }));
    const result = await facultyEvaluationService.submitSheet(req.user.email, evaluation.sheetId.toString(), updates);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/evaluations/:evaluationId/request-unlock', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const QuestionEvaluationRepository = require('../repositories/QuestionEvaluationRepository');
    const evaluation = await QuestionEvaluationRepository.findById(req.params.evaluationId);
    if (!evaluation) return res.status(404).json({ success: false, message: 'Evaluation not found' });
    // request unlock for the entire sheet (paper) for this faculty
    const result = await facultyEvaluationService.requestUnlock(req.user.email, evaluation.sheetId.toString());
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/exams/:examId/final-submit', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyEvaluationService.finalSubmitToAdmin(req.user.email, req.params.examId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/exams/:examId/publish', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyEvaluationService.toggleFacultyPublish(req.user.email, req.params.examId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/exams/:examId/export-aums', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const buffer = await facultyEvaluationService.generateAUMSExport(req.user.email, req.params.examId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=AUMS_Score_Report_${req.params.examId}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

router.post('/exams/:examId/handover', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const result = await facultyEvaluationService.handoverExam(req.user.email, req.params.examId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await facultyService.changePassword(req.user.email, oldPassword, newPassword);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', facultyAuthMiddleware, async (req, res, next) => {
  try {
    const AppError = require('../exceptions/AppError');
    const { name } = req.body;
    if (!name || !name.trim()) throw new AppError('Name is required', 400);
    req.user.name = name.trim();
    await req.user.save();
    // also update faculty entity name
    const FacultyRepository = require('../repositories/FacultyRepository');
    const faculty = await FacultyRepository.findOne({ userId: req.user._id });
    if (faculty) { faculty.name = req.user.name; await faculty.save(); }
    res.json({ success: true, data: { name: req.user.name } });
  } catch (error) {
    next(error);
  }
});

router.get('/me', facultyAuthMiddleware, async (req, res, next) => {
  try {
    res.json({ success: true, data: { name: req.user.name, email: req.user.email, role: req.user.role } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
