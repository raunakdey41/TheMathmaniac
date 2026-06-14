"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 1. Get Tests List
router.get('/', auth_1.authenticateJWT, async (req, res) => {
    try {
        const tests = await db_1.default.test.findMany({
            where: { published: true },
            include: {
                course: {
                    select: { title: true },
                },
            },
        });
        return res.status(200).json({ success: true, data: tests });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 2. Get Test Details (Hides correct answers)
router.get('/:id', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const test = await db_1.default.test.findUnique({
            where: { id },
            include: {
                questions: {
                    include: {
                        options: {
                            select: {
                                id: true,
                                text: true,
                            },
                        },
                    },
                },
            },
        });
        if (!test) {
            return res.status(404).json({ success: false, error: 'Test not found' });
        }
        // Hide answers payload
        const safeQuestions = test.questions.map((q) => {
            const { numericalAnswer, explanation, ...rest } = q;
            return rest;
        });
        return res.status(200).json({
            success: true,
            data: {
                id: test.id,
                title: test.title,
                duration: test.duration,
                totalMarks: test.totalMarks,
                questions: safeQuestions,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 3. Submit Test Answers & Calculate Scores
router.post('/:id/submit', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body; // Array of { questionId: string, optionId?: string, numericalAnswer?: string }
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const test = await db_1.default.test.findUnique({
            where: { id },
            include: {
                questions: {
                    include: {
                        options: true,
                    },
                },
            },
        });
        if (!test) {
            return res.status(404).json({ success: false, error: 'Test not found' });
        }
        let score = 0;
        let correctCount = 0;
        const feedbackPayload = [];
        // Calculate score
        for (const question of test.questions) {
            const userAnswer = answers.find((ans) => ans.questionId === question.id);
            let isCorrect = false;
            let selectedText = '';
            if (question.type === 'SINGLE_CORRECT') {
                const correctOption = question.options.find((opt) => opt.isCorrect);
                const selectedOption = question.options.find((opt) => opt.id === userAnswer?.optionId);
                selectedText = selectedOption ? selectedOption.text : '';
                if (userAnswer?.optionId && correctOption && userAnswer.optionId === correctOption.id) {
                    isCorrect = true;
                }
            }
            else if (question.type === 'MULTIPLE_CORRECT') {
                // Multi-correct check: User options must match correct options exactly
                const correctOptionIds = question.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);
                const userOptionIds = userAnswer?.optionIds || (userAnswer?.optionId ? [userAnswer.optionId] : []);
                const matchesAllCorrect = correctOptionIds.every((id) => userOptionIds.includes(id));
                const hasNoIncorrect = userOptionIds.every((id) => correctOptionIds.includes(id));
                isCorrect = matchesAllCorrect && hasNoIncorrect && correctOptionIds.length > 0;
                selectedText = question.options
                    .filter((opt) => userOptionIds.includes(opt.id))
                    .map((opt) => opt.text)
                    .join(', ');
            }
            else if (question.type === 'NUMERICAL') {
                const userNum = String(userAnswer?.numericalAnswer || '').trim();
                const correctNum = String(question.numericalAnswer || '').trim();
                selectedText = userNum;
                if (userNum && correctNum && userNum === correctNum) {
                    isCorrect = true;
                }
            }
            if (isCorrect) {
                score += question.marks;
                correctCount++;
            }
            feedbackPayload.push({
                questionId: question.id,
                text: question.text,
                type: question.type,
                userAnswer: selectedText,
                isCorrect,
                correctAnswer: question.type === 'NUMERICAL'
                    ? question.numericalAnswer
                    : question.options.filter((o) => o.isCorrect).map((o) => o.text).join(', '),
                explanation: question.explanation,
                marksAwarded: isCorrect ? question.marks : 0,
            });
        }
        const accuracy = test.questions.length > 0 ? (correctCount / test.questions.length) * 100 : 0;
        // Save result in DB
        const result = await db_1.default.result.create({
            data: {
                userId,
                testId: id,
                score,
                accuracy,
                answersPayload: JSON.stringify(feedbackPayload),
            },
        });
        // Calculate Rank relative to other results
        const resultsCount = await db_1.default.result.count({
            where: {
                testId: id,
                score: { gt: score },
            },
        });
        const rank = resultsCount + 1;
        return res.status(200).json({
            success: true,
            data: {
                resultId: result.id,
                score,
                totalMarks: test.totalMarks,
                accuracy,
                rank,
                feedback: feedbackPayload,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// 4. Get Leaderboard for a Test
router.get('/:id/leaderboard', auth_1.authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const rawLeaderboard = await db_1.default.result.findMany({
            where: { testId: id },
            orderBy: [
                { score: 'desc' },
                { accuracy: 'desc' },
                { createdAt: 'asc' },
            ],
            take: 20,
            include: {
                user: {
                    select: { name: true },
                },
            },
        });
        // Group by user to show only their personal best result on the board
        const uniqueLeaderboard = [];
        const seenUsers = new Set();
        for (const row of rawLeaderboard) {
            if (!seenUsers.has(row.userId)) {
                seenUsers.add(row.userId);
                uniqueLeaderboard.push({
                    userId: row.userId,
                    name: row.user.name,
                    score: row.score,
                    accuracy: row.accuracy,
                    createdAt: row.createdAt,
                });
            }
        }
        return res.status(200).json({
            success: true,
            data: uniqueLeaderboard,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
