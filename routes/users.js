const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Teacher, Student } = require('../models/models'); // Adjust the path based on your project structure

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

const generateToken = (user) => {
    const payload = {
        id: user._id,
        username: user.username,
        role: user instanceof Teacher ? 'teacher' : 'student',
    };

    const options = {
        expiresIn: '1h', // Token expiration time
    };

    return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * @swagger
 * /api/user/teacher/signup:
 *   post:
 *     summary: Signup for a teacher account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful signup, returns a JWT token
 *         content:
 *           application/json:
 *             example:
 *               token: JWT_TOKEN_HERE
 *       500:
 *         description: Internal Server Error
 */
router.post('/teacher/signup', async (req, res) => {
    try {
        const { username, password, full_name, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newTeacher = new Teacher({
            username,
            password: hashedPassword,
            full_name,
            email,
        });

        await newTeacher.save();

        const token = generateToken(newTeacher);

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/user/student/signup:
 *   post:
 *     summary: Signup for a student account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful signup, returns a JWT token
 *         content:
 *           application/json:
 *             example:
 *               token: JWT_TOKEN_HERE
 *       500:
 *         description: Internal Server Error
 */

router.post('/student/signup', async (req, res) => {
    try {
        const { username, password, full_name, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = new Student({
            username,
            password: hashedPassword,
            full_name,
            email,
        });

        await newStudent.save();

        const token = generateToken(newStudent);

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/user/teacher/login:
 *   post:
 *     summary: Login for a teacher account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login, returns a JWT token
 *         content:
 *           application/json:
 *             example:
 *               token: JWT_TOKEN_HERE
 *       401:
 *         description: Invalid username or password
 *       500:
 *         description: Internal Server Error
 */
router.post('/teacher/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const teacher = await Teacher.findOne({ username });

        if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = generateToken(teacher);

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @swagger
 * /api/user/student/login:
 *   post:
 *     summary: Login for a student account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login, returns a JWT token
 *         content:
 *           application/json:
 *             example:
 *               token: JWT_TOKEN_HERE
 *       401:
 *         description: Invalid username or password
 *       500:
 *         description: Internal Server Error
 */
router.post('/student/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const student = await Student.findOne({ username });

        if (!student || !(await bcrypt.compare(password, student.password))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = generateToken(student);

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;