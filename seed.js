require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/entities/userModel');
const Faculty = require('./src/models/entities/facultyModel');
const Student = require('./src/models/entities/studentModel');
const Exam = require('./src/models/entities/examModel');
const FacultyMapping = require('./src/models/entities/facultyMappingModel');
const AnswerSheet = require('./src/models/entities/answerSheetModel');
const QuestionAllocation = require('./src/models/entities/questionAllocationModel');
const QuestionEvaluation = require('./src/models/entities/questionEvaluationModel');
const AuditLog = require('./src/models/entities/auditLogModel');

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/online_valuation';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB. Clearing existing collections...');

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Faculty.deleteMany({}),
    Student.deleteMany({}),
    Exam.deleteMany({}),
    FacultyMapping.deleteMany({}),
    AnswerSheet.deleteMany({}),
    QuestionAllocation.deleteMany({}),
    QuestionEvaluation.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  console.log('Collections cleared. Seeding default data...');

  // 1. Seed Admin User (Password: admin123)
  const adminEmail = 'admin1@gmail.com';
  const adminPass = 'admin123';
  const adminUser = await User.create({
    role: 'ADMIN',
    email: adminEmail,
    password: await bcrypt.hash(adminPass, 10),
    name: 'System Administrator'
  });
  console.log(`Created Admin: ${adminEmail} (password: ${adminPass})`);

  // 2. Seed Faculty Users & Entities (Password: faculty123)
  const facultyPass = 'faculty123';
  const faculty1Email = 'dr.a01@gmail.com';
  const userFac1 = await User.create({
    role: 'FACULTY',
    email: faculty1Email,
    password: await bcrypt.hash(facultyPass, 10),
    name: 'Dr. A (DBMS & OS)'
  });
  const fac1 = await Faculty.create({
    userId: userFac1._id,
    name: 'Dr. A',
    email: faculty1Email
  });

  const faculty2Email = 'dr.b01@gmail.com';
  const userFac2 = await User.create({
    role: 'FACULTY',
    email: faculty2Email,
    password: await bcrypt.hash(facultyPass, 10),
    name: 'Dr. B (DBMS)'
  });
  const fac2 = await Faculty.create({
    userId: userFac2._id,
    name: 'Dr. B',
    email: faculty2Email
  });

  // 3. Seed Student Users & Entities (Password: std123)
  const studentPass = 'std123';
  const studentsData = [
    { email: 'student1@gmail.com', name: 'Rahul Sharma', regNo: 'CH.SC.U4CSE23003' },
    { email: 'student2@gmail.com', name: 'Ananya Roy', regNo: 'CH.SC.U4CSE23004' },
    { email: 'student3@gmail.com', name: 'Vikram Patel', regNo: 'CH.SC.U4CSE23005' },
    { email: 'student4@gmail.com', name: 'Priya Nair', regNo: 'CH.SC.U4CSE23006' }
  ];

  const studentEntities = [];
  for (const s of studentsData) {
    const sUser = await User.create({
      role: 'STUDENT',
      email: s.email,
      password: await bcrypt.hash(studentPass, 10),
      name: s.name
    });

    const sEntity = await Student.create({
      userId: sUser._id,
      name: s.name,
      registrationNumber: s.regNo,
      email: s.email
    });
    studentEntities.push(sEntity);
  }

  // 4. Seed Exams
  const dbmsExam = await Exam.create({
    course: 'CSE',
    subject: 'DBMS',
    semester: '3',
    section: 'A',
    examType: 'Mid_Term',
    questionWeightage: [10, 10, 10, 5, 5, 5, 5], // Total 50 marks
    convertedScale: 20, // Converts 50 -> 20 for Midsem
    questionPaperUrl: 'uploads/pdfs/QuestionPaper_3_DBMS_Mid_Term.pdf',
    answerKeyUrl: 'uploads/pdfs/AnswerKey_3_DBMS_Mid_Term.pdf',
    courseInChargeFacultyId: fac1._id,
    isPublished: false
  });

  const dbmsSecBExam = await Exam.create({
    course: 'CSE',
    subject: 'DBMS',
    semester: '3',
    section: 'B',
    examType: 'Mid_Term',
    questionWeightage: [10, 10, 10, 5, 5, 5, 5], // Total 50 marks
    convertedScale: 20,
    questionPaperUrl: 'uploads/pdfs/QuestionPaper_3_DBMS_Mid_Term.pdf',
    answerKeyUrl: 'uploads/pdfs/AnswerKey_3_DBMS_Mid_Term.pdf',
    courseInChargeFacultyId: fac2._id,
    isPublished: false
  });

  const osExam = await Exam.create({
    course: 'CSE',
    subject: 'OS',
    semester: '3',
    section: 'A',
    examType: 'Mid_Term',
    questionWeightage: [10, 10, 10, 10, 10], // Total 50 marks
    convertedScale: 20,
    questionPaperUrl: 'uploads/pdfs/QuestionPaper_3_OS_Mid_Term.pdf',
    answerKeyUrl: 'uploads/pdfs/AnswerKey_3_OS_Mid_Term.pdf',
    courseInChargeFacultyId: fac1._id,
    isPublished: false
  });

  // 5. Seed Faculty Mappings (DBMS: Dr. A for Sec A, Dr. B for Sec B)
  await FacultyMapping.create({
    course: 'CSE',
    subject: 'DBMS',
    semester: '3',
    section: 'A',
    examType: 'Mid_Term',
    facultyId: fac1._id
  });
  await FacultyMapping.create({
    course: 'CSE',
    subject: 'DBMS',
    semester: '3',
    section: 'B',
    examType: 'Mid_Term',
    facultyId: fac2._id
  });
  await FacultyMapping.create({
    course: 'CSE',
    subject: 'OS',
    semester: '3',
    section: 'A',
    examType: 'Mid_Term',
    facultyId: fac1._id
  });

  // 6. Seed Question Allocations (DBMS Sec A & B: Q1-Q3 to Dr. A, Q4-Q7 to Dr. B)
  await QuestionAllocation.create({
    examId: dbmsExam._id,
    facultyId: fac1._id,
    fromQuestion: 1,
    toQuestion: 3,
    allocationType: 'EQUAL'
  });
  await QuestionAllocation.create({
    examId: dbmsExam._id,
    facultyId: fac2._id,
    fromQuestion: 4,
    toQuestion: 7,
    allocationType: 'EQUAL'
  });
  await QuestionAllocation.create({
    examId: dbmsSecBExam._id,
    facultyId: fac1._id,
    fromQuestion: 1,
    toQuestion: 3,
    allocationType: 'EQUAL'
  });
  await QuestionAllocation.create({
    examId: dbmsSecBExam._id,
    facultyId: fac2._id,
    fromQuestion: 4,
    toQuestion: 7,
    allocationType: 'EQUAL'
  });
  await QuestionAllocation.create({
    examId: osExam._id,
    facultyId: fac1._id,
    fromQuestion: 1,
    toQuestion: 5,
    allocationType: 'EQUAL'
  });

  // 7. Seed Answer Sheets
  const sheet1 = await AnswerSheet.create({
    studentId: studentEntities[0]._id, // Student 1
    examId: dbmsExam._id,
    pdfUrl: 'uploads/pdfs/CH.SC.U4CSE23003_3_DBMS_Mid_Term.pdf'
  });

  const sheet2 = await AnswerSheet.create({
    studentId: studentEntities[1]._id, // Student 2 (Sec B)
    examId: dbmsSecBExam._id,
    pdfUrl: 'uploads/pdfs/CH.SC.U4CSE23004_3_DBMS_Mid_Term.pdf'
  });

  const sheet3 = await AnswerSheet.create({
    studentId: studentEntities[2]._id, // Student 3
    examId: osExam._id,
    pdfUrl: 'uploads/pdfs/CH.SC.U4CSE23005_3_OS_Mid_Term.pdf'
  });

  const sheet4 = await AnswerSheet.create({
    studentId: studentEntities[3]._id, // Student 4
    examId: osExam._id,
    pdfUrl: 'uploads/pdfs/CH.SC.U4CSE23006_3_OS_Mid_Term.pdf'
  });

  // 8. Seed Question Evaluations
  // Sheet 1 (Student 1 - DBMS): Dr. A evaluated Q1-Q3 (LOCKED). Dr. B evaluated Q4-Q7 (DRAFT) -> PARTIALLY CHECKED PAPER
  await QuestionEvaluation.create({ sheetId: sheet1._id, questionNumber: 1, marksObtained: 9, review: 'Good work', status: 'LOCKED', facultyId: fac1._id });
  await QuestionEvaluation.create({ sheetId: sheet1._id, questionNumber: 2, marksObtained: 8, review: 'Clean diagram', status: 'LOCKED', facultyId: fac1._id });
  await QuestionEvaluation.create({ sheetId: sheet1._id, questionNumber: 3, marksObtained: 10, review: 'Perfect answer', status: 'LOCKED', facultyId: fac1._id });

  await QuestionEvaluation.create({ sheetId: sheet1._id, questionNumber: 4, marksObtained: 4, review: 'Minor steps missing', status: 'DRAFT', facultyId: fac2._id });
  await QuestionEvaluation.create({ sheetId: sheet1._id, questionNumber: 5, marksObtained: 5, review: 'Correct', status: 'DRAFT', facultyId: fac2._id });
  await QuestionEvaluation.create({ sheetId: sheet1._id, questionNumber: 6, marksObtained: 4, review: 'Ok', status: 'DRAFT', facultyId: fac2._id });
  await QuestionEvaluation.create({ sheetId: sheet1._id, questionNumber: 7, marksObtained: 3, review: 'Partial credit', status: 'DRAFT', facultyId: fac2._id });

  // Sheet 2 (Student 2 - DBMS): All Q1-Q7 evaluations LOCKED -> CHECKED PAPER
  await QuestionEvaluation.create({ sheetId: sheet2._id, questionNumber: 1, marksObtained: 10, review: 'Excellent', status: 'LOCKED', facultyId: fac1._id });
  await QuestionEvaluation.create({ sheetId: sheet2._id, questionNumber: 2, marksObtained: 9, review: 'Very good', status: 'LOCKED', facultyId: fac1._id });
  await QuestionEvaluation.create({ sheetId: sheet2._id, questionNumber: 3, marksObtained: 9, review: 'Great explanation', status: 'LOCKED', facultyId: fac1._id });

  await QuestionEvaluation.create({ sheetId: sheet2._id, questionNumber: 4, marksObtained: 5, review: 'Full credit', status: 'LOCKED', facultyId: fac2._id });
  await QuestionEvaluation.create({ sheetId: sheet2._id, questionNumber: 5, marksObtained: 4, review: 'Good effort', status: 'LOCKED', facultyId: fac2._id });
  await QuestionEvaluation.create({ sheetId: sheet2._id, questionNumber: 6, marksObtained: 5, review: 'Correct', status: 'LOCKED', facultyId: fac2._id });
  await QuestionEvaluation.create({ sheetId: sheet2._id, questionNumber: 7, marksObtained: 4, review: 'Well done', status: 'LOCKED', facultyId: fac2._id });

  // Sheet 3 & 4 (Student 3 & 4 - OS): All Q1-Q5 PENDING -> NOT CHECKED PAPER
  for (let q = 1; q <= 5; q += 1) {
    await QuestionEvaluation.create({ sheetId: sheet3._id, questionNumber: q, marksObtained: null, review: null, status: 'PENDING', facultyId: fac1._id });
    await QuestionEvaluation.create({ sheetId: sheet4._id, questionNumber: q, marksObtained: null, review: null, status: 'PENDING', facultyId: fac1._id });
  }

  // Log Audit Entry
  await AuditLog.create({
    action: 'SEED_DATABASE',
    performedBy: adminEmail,
    details: 'Database seeded with default users, exams, answer sheets, and question allocations'
  });

  console.log('\n======================================================');
  console.log('🎉 DATABASE SEEDED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('Role       | Email                 | Password');
  console.log('-----------+-----------------------+----------------------');
  console.log(`ADMIN      | ${adminEmail}        | ${adminPass}`);
  console.log(`FACULTY    | ${faculty1Email}         | ${facultyPass}`);
  console.log(`FACULTY    | ${faculty2Email}         | ${facultyPass}`);
  console.log(`STUDENT 1  | student1@gmail.com   | ${studentPass} (Reg: CH.SC.U4CSE23003)`);
  console.log(`STUDENT 2  | student2@gmail.com   | ${studentPass} (Reg: CH.SC.U4CSE23004)`);
  console.log(`STUDENT 3  | student3@gmail.com   | ${studentPass} (Reg: CH.SC.U4CSE23005)`);
  console.log(`STUDENT 4  | student4@gmail.com   | ${studentPass} (Reg: CH.SC.U4CSE23006)`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
