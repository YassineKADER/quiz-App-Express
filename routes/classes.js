// Import your models
const { Class, Teacher, Student } = require('../models/models');

// Express Router
const express = require('express');
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

router.get('/', async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let classes;
    if (user.role === 'teacher') {
      classes = await Class.find({ teacher_id: user.id });
    } else if (user.role === 'student') {
    //   classes = await Class.find({ _id: { $in: user.classes } });
       classes = await Class.find({ 'students': { $in: user.id}});
    }

    res.json({ classes });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
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

router.post('/create', async (req, res) => {
  try {
    const decoded = req.user;
    console.log(decoded);

    if (decoded.role !== 'teacher') {
      return res.status(403).json({ error: 'User is not a teacher' });
    }

    const { class_name } = req.body;

    const newClass = new Class({
      class_name,
      teacher_id: decoded.id,
    });

    await newClass.save();

    res.json({ message: 'Class created successfully', class: newClass });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
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

router.post('/:classId/add-student', async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== 'teacher') {
      return res.status(403).json({ error: 'User is not a teacher' });
    }

    const { classId } = req.params;
    const { studentId } = req.body;

    const existingClass = await Class.findById(classId);

    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const isTeacherOfClass = existingClass.teacher_id.equals(decoded.id);

    if (!isTeacherOfClass) {
      return res.status(403).json({ error: 'User is not the teacher of this class' });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    existingClass.students.push(student._id);
    await existingClass.save();

    res.json({ message: 'Student added to the class successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
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

router.post('/join', async (req, res) => {
  try {
    const decoded = req.user;

    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'User is not a student' });
    }

    const { classId } = req.body;

    const existingClass = await Class.findById(classId);

    const student = await Student.findById(decoded.id);

    if (!existingClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    existingClass.students.push(student._id);
    await existingClass.save();

    await Student.findByIdAndUpdate(decoded.id, { $addToSet: { classes: classId } }, { new: true });

    res.json({ message: 'Student joined the class successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
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
router.get('/:classId/students', async (req, res) => {
    try {
        const decoded = req.user;

        // Ensure the user is authenticated and has the necessary role
        if (!decoded || (decoded.role !== 'teacher' && decoded.role !== 'student')) {
            return res.status(403).json({ error: 'Forbidden - Only authenticated users can access this endpoint' });
        }

        const classId = req.params.classId;

        const myClass = await Class.findById(classId);

        if (!myClass) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const students = await myClass.students.map(async (studentId) => {
            const student = await Student.findById(studentId);
            return {
                id: student._id,
                name: student.full_name,
                email: student.email,
                username: student.username
            };
        });
        res.json({ students });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;