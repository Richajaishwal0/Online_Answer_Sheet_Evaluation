const mongoose = require('mongoose');

const questionEvaluationSchema = new mongoose.Schema({
  sheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnswerSheet', required: true },
  questionNumber: { type: Number, required: true },
  marksObtained: { type: Number, default: null },
  review: { type: String, default: null },
  status: { type: String, default: 'PENDING', enum: ['PENDING', 'DRAFT', 'COMPLETED', 'SUBMITTED', 'LOCKED', 'UNLOCK_REQUESTED', 'UNLOCKED'] },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  evaluatorSubmitted: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});

questionEvaluationSchema.index({ sheetId: 1, questionNumber: 1 }, { unique: true });

const QuestionEvaluation = mongoose.model('QuestionEvaluation', questionEvaluationSchema);
module.exports = QuestionEvaluation;
