const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  course: { type: String, required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  examType: { type: String, required: true },
  questionWeightage: [{ type: Number }],
  convertedScale: { type: Number, default: 30 },
  questionPaperUrl: { type: String, default: '' },
  answerKeyUrl: { type: String, default: '' },
  courseInChargeFacultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },
  handedOverFacultyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' }],
  finalSubmittedToAdmin: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  status: { type: String, default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now }
});

examSchema.index({ course: 1, subject: 1, semester: 1, section: 1, examType: 1 }, { unique: true });

const Exam = mongoose.model('Exam', examSchema);
module.exports = Exam;


