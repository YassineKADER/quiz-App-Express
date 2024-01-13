const mongoose = require('mongoose');


const teacherSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
});

const studentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true, match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
});





const optionSchema = new mongoose.Schema({
    option_text: { type: String, required: true },
    is_correct: { type: Boolean, required: true },
});

const questionSchema = new mongoose.Schema({
    question_text: { type: String, required: true },
    options: [optionSchema],
    is_multiple_choice: { type: Boolean, default: false }
});

const quizSchema = new mongoose.Schema({
    quiz_name: { type: String, required: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    start_date: { type: Date, required: true },
    duration: { type: Number, required: true },
    questions: [questionSchema]
});

const classSchema = new mongoose.Schema({
    class_name: { type: String, required: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student'}],
    quizzes: [quizSchema],
});

const studentResponseSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    quiz_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    responses: [
        {
            question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
            selected_options: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Option' }],
        },
    ],
});

const Class = mongoose.model('Class', classSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);
const Student = mongoose.model('Student', studentSchema);
const Question = mongoose.model('Question', questionSchema);
const Quiz = mongoose.model('Quiz', quizSchema);
const Option = mongoose.model('Option', optionSchema);
const StudentResponse = mongoose.model('StudentResponse', studentResponseSchema);

module.exports = { Class, Teacher, Student, Question, Quiz, Option, StudentResponse };
