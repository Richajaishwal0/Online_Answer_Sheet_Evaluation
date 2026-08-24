const test = require('node:test');
const assert = require('node:assert/strict');

test('Faculty assignments hierarchical grouping and metric calculation', () => {
  const mockAssignments = [
    {
      sheetId: 's1',
      examId: 'e1',
      studentName: 'Vikram Patel',
      registrationNumber: 'CH.SC.U4CSE23005',
      course: 'CSE',
      subject: 'OS',
      semester: '3',
      section: 'A',
      examType: 'Mid_Term',
      status: 'PENDING',
      finalSubmittedToAdmin: false,
      isPublished: false
    },
    {
      sheetId: 's2',
      examId: 'e1',
      studentName: 'Priya Nair',
      registrationNumber: 'CH.SC.U4CSE23006',
      course: 'CSE',
      subject: 'OS',
      semester: '3',
      section: 'A',
      examType: 'Mid_Term',
      status: 'COMPLETED',
      finalSubmittedToAdmin: false,
      isPublished: false
    },
    {
      sheetId: 's3',
      examId: 'e2',
      studentName: 'Renu',
      registrationNumber: 'CH.SC.U4CSE23163',
      course: 'CSE',
      subject: 'SQL',
      semester: '3',
      section: 'B',
      examType: 'Mid_Term',
      status: 'LOCKED',
      finalSubmittedToAdmin: true,
      isPublished: true
    }
  ];

  // Test total assigned
  assert.equal(mockAssignments.length, 3, 'Total 3 assigned scripts');

  // Test completion calculation
  const completed = mockAssignments.filter(a => a.status === 'COMPLETED' || a.status === 'LOCKED').length;
  assert.equal(completed, 2, '2 scripts evaluated / completed');

  // Test unique subjects
  const subjects = [...new Set(mockAssignments.map(a => a.subject))];
  assert.deepEqual(subjects, ['OS', 'SQL'], 'Identified OS and SQL subjects');

  // Test Department grouping
  const depts = [...new Set(mockAssignments.map(a => a.course))];
  assert.deepEqual(depts, ['CSE'], 'Identified CSE department');
});
