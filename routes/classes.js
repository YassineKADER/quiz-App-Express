// Import your models
const { Class, Teacher, Student, Quiz} = require("../models/models");

// Express Router
const express = require("express");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Class-related endpoints
 */

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Get classes for the authenticated user (teacher or student)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successful retrieval of user classes
 *         content:
 *           application/json:
 *             example:
 *               classes: [{ class_name: "Math", teacher_id: "teacherId", students: ["studentId1", "studentId2"], quizzes: ["quizId1", "quizId2"] }]
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal Server Error
 */

router.get("/", async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let classes;
    if (user.role === "teacher") {
      classes = await Class.find({ teacher_id: user.id });
    } else if (user.role === "student") {
      //   classes = await Class.find({ _id: { $in: user.classes } });
      classes = await Class.find({ students: { $in: user.id } });
    }
    classes = await Promise.all(
      classes.map(async (cls) => {
        const classObject = cls.toObject();
        const teacher = await Teacher.findById(cls.teacher_id);
        const teacherobj = teacher.toObject();
        delete teacherobj["password"];
        return {
          classObject,
          teacher: teacherobj,
        };
      })
    );
    res.json({ classes });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/create:
 *   post:
 *     summary: Create a new class (for teachers)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               class_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful creation of a new class
 *         content:
 *           application/json:
 *             example:
 *               message: Class created successfully
 *               class: { class_name: "Math", teacher_id: "teacherId" }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       500:
 *         description: Internal Server Error
 */

router.post("/create", async (req, res) => {
  try {
    const decoded = req.user;
    // console.log(decoded);

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { class_name } = req.body;

    const newClass = new Class({
      class_name,
      teacher_id: decoded.id,
    });

    await newClass.save();

    res.json({ message: "Class created successfully", class: newClass });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/:classId/add-student:
 *   post:
 *     summary: Add a student to a class (for teachers)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentId:
 *                 type: string
 *     parameters:
 *       - name: classId
 *         in: path
 *         required: true
 *         description: ID of the class
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful addition of a student to the class
 *         content:
 *           application/json:
 *             example:
 *               message: Student added to the class successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */

router.post("/:classId/add-student", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId } = req.params;
    const { studentId } = req.body;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    existingClass.students.push(student._id);
    await existingClass.save();

    res.json({ message: "Student added to the class successfully" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/join:
 *   post:
 *     summary: Join a class (for students)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful joining of a class
 *         content:
 *           application/json:
 *             example:
 *               message: Student joined the class successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a student
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */

router.post("/join", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "student") {
      return res.status(403).json({ error: "User is not a student" });
    }

    const { classId } = req.body;

    const existingClass = await Class.findById(classId);

    const student = await Student.findById(decoded.id);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }
    if (!existingClass.students.includes(student._id)) {
      existingClass.students.push(student._id);
      await existingClass.save();
      await Student.findByIdAndUpdate(
        decoded.id,
        { $addToSet: { classes: classId } },
        { new: true }
      );
      res.json({ message: "Student joined the class successfully" });
    } else {
      res.json({ message: "Student already in the class" });
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}/students:
 *   get:
 *     summary: Get the list of students in a class
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *     responses:
 *       200:
 *         description: Successful retrieval of students
 *         content:
 *           application/json:
 *             example:
 *               students:
 *                 - id: 60b8f2e2e9e7d0b3a4a3d9c8
 *                   name: John Doe
 *                   email: john.doe@example.com
 *                   username: john.doe
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */
router.get("/:classId/students", async (req, res) => {
  try {
    const decoded = req.user;

    // Ensure the user is authenticated and has the necessary role
    if (
      !decoded ||
      (decoded.role !== "teacher" && decoded.role !== "student")
    ) {
      return res
        .status(403)
        .json({
          error:
            "Forbidden - Only authenticated users can access this endpoint",
        });
    }

    const classId = req.params.classId;

    const myClass = await Class.findById(classId);

    if (!myClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const students = await Promise.all(
      myClass.students.map(async (studentId) => {
        const student = await Student.findById(studentId);
        return {
          id: student._id,
          name: student.full_name,
          email: student.email,
          username: student.username,
        };
      })
    );
    res.json({ students });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Quiz-related endpoints
 */

/**
 * @swagger
 * /api/classes/{classId}/quizzes:
 *   post:
 *     summary: Create a new quiz in a class (for teachers)
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quiz_name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_text:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           option_text:
 *                             type: string
 *                           is_correct:
 *                             type: boolean
 *     responses:
 *       200:
 *         description: Successful creation of a new quiz
 *         content:
 *           application/json:
 *             example:
 *               message: Quiz created successfully
 *               quiz: { quiz_name: "Math Quiz", class_id: "classId", start_date: "2024-01-20T12:00:00Z", duration: 60, questions: [...] }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */

router.post("/:classId/quizzes", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId } = req.params;
    const { quiz_name, start_date, duration, questions } = req.body;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    // Validate start_date is in the future
    const now = new Date();
    const quizStartDate = new Date(start_date);

    if (quizStartDate <= now) {
      return res
        .status(400)
        .json({ error: "Quiz start date must be in the future" });
    }
    // console.log(req.body)
    const newQuiz = await new Quiz({
      quiz_name,
      class_id: classId,
      start_date,
      duration,
      questions,
    });

    // console.log(newQuiz)
    try {
      await newQuiz.validate(); // Validate the document
      await newQuiz.save();
      existingClass.quizzes.push(newQuiz._id);
      await existingClass.save();
      // console.log('Quiz saved successfully:', newQuiz);
    } catch (error) {
      console.error('Error saving quiz:', error);
    }

    res.json({ message: "Quiz created successfully", quiz: newQuiz });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}/quizzes/{quizId}:
 *   patch:
 *     summary: Update a quiz in a class (for teachers)
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the quiz
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quiz_name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     question_text:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           option_text:
 *                             type: string
 *                           is_correct:
 *                             type: boolean
 *     responses:
 *       200:
 *         description: Successful update of a quiz
 *         content:
 *           application/json:
 *             example:
 *               message: Quiz updated successfully
 *               quiz: { quiz_name: "Updated Math Quiz", class_id: "classId", start_date: "2024-01-20T12:00:00Z", duration: 60, questions: [...] }
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a teacher
 *       404:
 *         description: Class or quiz not found
 *       500:
 *         description: Internal Server Error
 */

router.patch("/:classId/quizzes/:quizId", async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== "teacher") {
      return res.status(403).json({ error: "User is not a teacher" });
    }

    const { classId, quizId } = req.params;
    const { quiz_name, start_date, duration, questions } = req.body;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res
        .status(403)
        .json({ error: "User is not the teacher of this class" });
    }

    const existingQuiz = await Quiz.findById(quizId);

    if (!existingQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Validate start_date is in the future
    const now = new Date();
    const quizStartDate = new Date(start_date);

    if (quizStartDate <= now) {
      return res
        .status(400)
        .json({ error: "Quiz start date must be in the future" });
    }

    // Update quiz details
    existingQuiz.quiz_name = quiz_name;
    existingQuiz.start_date = start_date;
    existingQuiz.duration = duration;
    existingQuiz.questions = questions;

    await existingQuiz.save();

    res.json({ message: "Quiz updated successfully", quiz: existingQuiz });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /api/classes/{classId}/quizzes/{quizId}:
 *   get:
 *     summary: Get details of a quiz in a class
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *       - in: path
 *         name: quizId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the quiz
 *     responses:
 *       200:
 *         description: Successful retrieval of quiz details
 *         content:
 *           application/json:
 *             example:
 *               quiz: 
 *                 quiz_name: "Math Quiz"
 *                 class_id: "classId"
 *                 start_date: "2024-01-20T12:00:00Z"
 *                 duration: 60
 *                 questions: [...]
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only authenticated users can access this endpoint
 *       404:
 *         description: Class or quiz not found
 *       500:
 *         description: Internal Server Error
 */

// router.get("/:classId/quizzes/:quizId", async (req, res) => {
//   try {
//     const decoded = req.user;

//     if (
//       !decoded ||
//       (decoded.role !== "teacher" && decoded.role !== "student")
//     ) {
//       return res
//         .status(403)
//         .json({
//           error:
//             "Forbidden - Only authenticated users can access this endpoint",
//         });
//     }

//     const { classId, quizId } = req.params;

//     const myClass = await Class.findById(classId);

//     if (!myClass) {
//       return res.status(404).json({ error: "Class not found" });
//     }

//     const isTeacherOrStudentInClass =
//       myClass.teacher_id.equals(decoded.id) ||
//       myClass.students.includes(decoded.id);

//     if (!isTeacherOrStudentInClass) {
//       return res
//         .status(403)
//         .json({ error: "User is not authorized to access this quiz" });
//     }

//     const quiz = await Quiz.findById(quizId);

//     if (!quiz) {
//       return res.status(404).json({ error: "Quiz not found" });
//     }

//     res.json({ quiz });
//   } catch (error) {
//     if (error.name === "JsonWebTokenError") {
//       return res.status(401).json({ error: "Invalid token" });
//     }
//     console.error(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

router.get("/:classId/quizzes/:quizId", async (req, res) => {
  try {
    const decoded = req.user;

    if (
      !decoded ||
      (decoded.role !== "teacher" && decoded.role !== "student")
    ) {
      return res
        .status(403)
        .json({
          error:
            "Forbidden - Only authenticated users can access this endpoint",
        });
    }

    const { classId, quizId } = req.params;

    const myClass = await Class.findById(classId);

    if (!myClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOrStudentInClass =
      myClass.teacher_id.equals(decoded.id) ||
      myClass.students.includes(decoded.id);

    if (!isTeacherOrStudentInClass) {
      return res
        .status(403)
        .json({ error: "User is not authorized to access this quiz" });
    }

    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // If the user is a student, check if the quiz is accessible
    if (decoded.role === "student") {
      const now = new Date();
      const quizStartDate = new Date(quiz.start_date);
      const quizEndDate = new Date(quizStartDate.getTime() + quiz.duration * 60000); // Convert duration to milliseconds

      if (now < quizStartDate) {
        return res.json({ message: "Quiz has not started yet" });
      }

      if (now > quizEndDate) {
        return res.json({ message: "Quiz has passed" });
      }
    }

    res.json({ quiz });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * @swagger
 * /api/classes/{classId}/quizzes:
 *   get:
 *     summary: Get a list of quizzes in a class
 *     tags: [Quizzes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the class
 *     responses:
 *       200:
 *         description: Successful retrieval of quizzes
 *         content:
 *           application/json:
 *             example:
 *               quizzes:
 *                 - quiz_name: "Math Quiz"
 *                   quiz_id: "quizId1"
 *                   start_date: "2024-01-20T12:00:00Z"
 *                   duration: 60
 *                 - quiz_name: "Science Quiz"
 *                   quiz_id: "quizId2"
 *                   start_date: "2024-01-21T14:00:00Z"
 *                   duration: 45
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Class not found
 *       500:
 *         description: Internal Server Error
 */

router.get("/:classId/quizzes", async (req, res) => {
  try {
    const decoded = req.user;

    if (
      !decoded ||
      (decoded.role !== "teacher" && decoded.role !== "student")
    ) {
      return res
        .status(403)
        .json({
          error:
            "Forbidden - Only authenticated users can access this endpoint",
        });
    }

    const { classId } = req.params;
    console.log(req.params)

    const myClass = await Class.findById(classId);

    if (!myClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    const isTeacherOrStudentInClass =
      myClass.teacher_id.equals(decoded.id) ||
      myClass.students.includes(decoded.id);

    if (!isTeacherOrStudentInClass) {
      return res
        .status(403)
        .json({ error: "User is not authorized to access quizzes in this class" });
    }

    const quizzes = await Quiz.find({ class_id: classId });
    console.log(quizzes);

    const formattedQuizzes = quizzes.map((quiz) => ({
      quiz_name: quiz.quiz_name,
      quiz_id: quiz._id,
      start_date: quiz.start_date,
      duration: quiz.duration,
    }));

    res.json({ quizzes: formattedQuizzes });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
