const BaseRepository = require('./BaseRepository');
const FacultyMapping = require('../models/entities/facultyMappingModel');

class FacultyMappingRepository extends BaseRepository {
  constructor() {
    super(FacultyMapping);
  }

  async findByExamContext(course, subject, semester, section, examType) {
    return this.model.find({ course, subject, semester, section, examType });
  }

  async findBySubjectAndSemester(course, subject, semester, examType) {
    const filter = { course, subject, semester };
    if (examType) filter.examType = examType;
    return this.model.find(filter);
  }
}

module.exports = new FacultyMappingRepository();
