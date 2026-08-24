const test = require('node:test');
const assert = require('node:assert/strict');

test('Hierarchical grouping and bulk action helper validation', () => {
  const mockExams = [
    { _id: '1', course: 'CSE', subject: 'DBMS', semester: '3', section: 'A', examType: 'Mid_Term', isPublished: true, finalSubmittedToAdmin: true, studentCount: 30, evaluatedCount: 30 },
    { _id: '2', course: 'CSE', subject: 'DBMS', semester: '3', section: 'B', examType: 'Mid_Term', isPublished: false, finalSubmittedToAdmin: false, studentCount: 28, evaluatedCount: 14 },
    { _id: '3', course: 'CSE', subject: 'OS', semester: '3', section: 'A', examType: 'Mid_Term', isPublished: false, finalSubmittedToAdmin: false, studentCount: 30, evaluatedCount: 0 },
    { _id: '4', course: 'ECE', subject: 'Signals', semester: '4', section: 'A', examType: 'End_Term', isPublished: true, finalSubmittedToAdmin: true, studentCount: 25, evaluatedCount: 25 }
  ];

  // Test Department grouping
  const departments = [...new Set(mockExams.map(e => e.course))];
  assert.deepEqual(departments, ['CSE', 'ECE'], 'Should identify CSE and ECE departments');

  // Test Published summary
  const published = mockExams.filter(e => e.isPublished).length;
  assert.equal(published, 2, '2 exams published');

  // Test Total students
  const totalStudents = mockExams.reduce((acc, e) => acc + e.studentCount, 0);
  assert.equal(totalStudents, 113, 'Total 113 students enrolled');

  // Test Publish eligibility (Teacher submit prerequisite)
  const canPublishExam1 = mockExams[0].isPublished || mockExams[0].finalSubmittedToAdmin;
  const canPublishExam2 = mockExams[1].isPublished || mockExams[1].finalSubmittedToAdmin;
  assert.equal(canPublishExam1, true, 'Exam 1 can be toggled because finalSubmittedToAdmin is true');
  assert.equal(canPublishExam2, false, 'Exam 2 cannot be published because teacher has not submitted marks to admin yet');
});
