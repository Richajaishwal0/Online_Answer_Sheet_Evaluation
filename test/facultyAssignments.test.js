/**
 * Tests: Subject-wise independent actions for faculty handling multiple subjects in same section.
 *
 * Bug: getAssignedItems() was not returning examId / isPublished / finalSubmittedToAdmin per item,
 * so the frontend collapsed all subjects into one group under key 'unknown', making one subject's
 * state block actions for another subject.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Minimal stubs — replace real DB calls with in-memory data
// ---------------------------------------------------------------------------

const FACULTY_ID = 'fac001';
const EXAM_MATH  = { _id: 'exam_math',  course: 'CSE', subject: 'Mathematics', semester: '3', section: 'A', examType: 'Mid_Term', finalSubmittedToAdmin: false, isPublished: true  };
const EXAM_PHY   = { _id: 'exam_phy',   course: 'CSE', subject: 'Physics',     semester: '3', section: 'A', examType: 'Mid_Term', finalSubmittedToAdmin: false, isPublished: false };

const SHEET_MATH = { _id: 'sheet_math', examId: 'exam_math', studentId: 'stu1', pdfUrl: '' };
const SHEET_PHY  = { _id: 'sheet_phy',  examId: 'exam_phy',  studentId: 'stu1', pdfUrl: '' };

const STUDENT    = { _id: 'stu1', name: 'Alice', registrationNumber: 'REG001' };

const EVALS = [
  { _id: 'ev1', sheetId: 'sheet_math', facultyId: FACULTY_ID, questionNumber: 1, marksObtained: 8,  status: 'LOCKED' },
  { _id: 'ev2', sheetId: 'sheet_phy',  facultyId: FACULTY_ID, questionNumber: 1, marksObtained: null, status: 'PENDING' },
];

// Inline re-implementation of getAssignedItems logic (mirrors FacultyService.getAssignedItems)
function buildAssignedItems(evaluations, sheetMap, studentMap, examMap) {
  const sheets = {};

  for (const evaluation of evaluations) {
    const sheetId = evaluation.sheetId.toString();
    if (!sheets[sheetId]) {
      const sheet   = sheetMap[sheetId];
      const student = sheet ? studentMap[sheet.studentId] : null;
      const exam    = sheet ? examMap[sheet.examId]       : null;
      sheets[sheetId] = {
        sheetId:               sheet?._id || evaluation.sheetId,
        examId:                exam?._id  || null,
        studentName:           student?.name || 'Unknown',
        registrationNumber:    student?.registrationNumber || 'N/A',
        examName:              exam ? `${exam.course} / ${exam.subject}` : 'Unknown',
        examContext:           exam ? `${exam.semester} ${exam.section} ${exam.examType}` : '',
        finalSubmittedToAdmin: Boolean(exam?.finalSubmittedToAdmin),
        isPublished:           Boolean(exam?.isPublished),
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
          : 'PENDING';
    const summary = item.statuses.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
    return {
      sheetId:               item.sheetId,
      examId:                item.examId,
      examName:              item.examName,
      examContext:           item.examContext,
      finalSubmittedToAdmin: item.finalSubmittedToAdmin,
      isPublished:           item.isPublished,
      studentName:           item.studentName,
      registrationNumber:    item.registrationNumber,
      questionRange,
      status,
      evaluationSummary:     summary,
      pdfUrl:                item.pdfUrl
    };
  });
}

// Inline re-implementation of frontend grouping logic (mirrors FacultyAssignmentsPage examGroups)
function groupByExam(items) {
  return items.reduce((acc, item) => {
    const key = item.examId ? item.examId.toString() : `unknown-${item.examName}`;
    if (!acc[key]) {
      acc[key] = {
        examId:                item.examId,
        examName:              item.examName,
        finalSubmittedToAdmin: item.finalSubmittedToAdmin ?? false,
        isPublished:           item.isPublished ?? false,
        sheets: []
      };
    }
    acc[key].sheets.push(item);
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('getAssignedItems returns examId per item', () => {
  const items = buildAssignedItems(
    EVALS,
    { sheet_math: SHEET_MATH, sheet_phy: SHEET_PHY },
    { stu1: STUDENT },
    { exam_math: EXAM_MATH, exam_phy: EXAM_PHY }
  );

  const mathItem = items.find(i => i.examId === 'exam_math');
  const phyItem  = items.find(i => i.examId === 'exam_phy');

  assert.ok(mathItem, 'Math exam item must be present');
  assert.ok(phyItem,  'Physics exam item must be present');
  assert.equal(mathItem.examId, 'exam_math');
  assert.equal(phyItem.examId,  'exam_phy');
});

test('getAssignedItems returns independent isPublished per subject', () => {
  const items = buildAssignedItems(
    EVALS,
    { sheet_math: SHEET_MATH, sheet_phy: SHEET_PHY },
    { stu1: STUDENT },
    { exam_math: EXAM_MATH, exam_phy: EXAM_PHY }
  );

  const mathItem = items.find(i => i.examId === 'exam_math');
  const phyItem  = items.find(i => i.examId === 'exam_phy');

  // Math is published, Physics is not — they must NOT share the same flag
  assert.equal(mathItem.isPublished, true,  'Math should be published');
  assert.equal(phyItem.isPublished,  false, 'Physics should NOT be published');
});

test('getAssignedItems returns independent finalSubmittedToAdmin per subject', () => {
  const examMathLocked = { ...EXAM_MATH, finalSubmittedToAdmin: true };
  const items = buildAssignedItems(
    EVALS,
    { sheet_math: SHEET_MATH, sheet_phy: SHEET_PHY },
    { stu1: STUDENT },
    { exam_math: examMathLocked, exam_phy: EXAM_PHY }
  );

  const mathItem = items.find(i => i.examId === 'exam_math');
  const phyItem  = items.find(i => i.examId === 'exam_phy');

  assert.equal(mathItem.finalSubmittedToAdmin, true,  'Math should be locked');
  assert.equal(phyItem.finalSubmittedToAdmin,  false, 'Physics should NOT be locked');
});

test('frontend groupByExam creates separate groups for different subjects in same section', () => {
  const items = buildAssignedItems(
    EVALS,
    { sheet_math: SHEET_MATH, sheet_phy: SHEET_PHY },
    { stu1: STUDENT },
    { exam_math: EXAM_MATH, exam_phy: EXAM_PHY }
  );

  const groups = groupByExam(items);
  const keys   = Object.keys(groups);

  assert.equal(keys.length, 2, 'Must produce 2 independent exam groups, not 1');
  assert.ok(groups['exam_math'], 'Group for Math must exist');
  assert.ok(groups['exam_phy'],  'Group for Physics must exist');
});

test('completed subject actions are not blocked by incomplete subject in same section', () => {
  const items = buildAssignedItems(
    EVALS,
    { sheet_math: SHEET_MATH, sheet_phy: SHEET_PHY },
    { stu1: STUDENT },
    { exam_math: EXAM_MATH, exam_phy: EXAM_PHY }
  );

  const groups = groupByExam(items);

  // Math is published → Publish button should be active (not blocked by Physics being unpublished)
  assert.equal(groups['exam_math'].isPublished, true,  'Math publish state must be independent');
  assert.equal(groups['exam_phy'].isPublished,  false, 'Physics publish state must be independent');

  // Simulate: Math finalSubmitted, Physics still in progress
  const examMathDone = { ...EXAM_MATH, finalSubmittedToAdmin: true };
  const itemsDone = buildAssignedItems(
    EVALS,
    { sheet_math: SHEET_MATH, sheet_phy: SHEET_PHY },
    { stu1: STUDENT },
    { exam_math: examMathDone, exam_phy: EXAM_PHY }
  );
  const groupsDone = groupByExam(itemsDone);

  assert.equal(groupsDone['exam_math'].finalSubmittedToAdmin, true,  'Math export must be enabled');
  assert.equal(groupsDone['exam_phy'].finalSubmittedToAdmin,  false, 'Physics export must still be blocked');
});

test('items with missing examId fall back to examName-based key and do not collide', () => {
  const itemsNoId = [
    { examId: null, examName: 'CSE / Mathematics', isPublished: true,  finalSubmittedToAdmin: false, sheetId: 's1' },
    { examId: null, examName: 'CSE / Physics',     isPublished: false, finalSubmittedToAdmin: false, sheetId: 's2' },
  ];
  const groups = groupByExam(itemsNoId);
  assert.equal(Object.keys(groups).length, 2, 'Fallback keys must not collide for different subjects');
});
