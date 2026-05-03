'use strict';

/**
 * @fileoverview Quiz Controller
 * Handles election knowledge quiz operations.
 * @module controllers/quiz.controller
 */

const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Retrieves a random election knowledge quiz.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
const getQuiz = async (req, res) => {
  try {
    const quiz = [
      { id: 1, question: "What is the minimum voting age in India?", options: ["16", "18", "21", "25"], answer: "18" },
      { id: 2, question: "Which document is primarily required to prove registration at the polling booth?", options: ["Passport", "EPIC (Voter ID)", "PAN Card", "Driving License"], answer: "EPIC (Voter ID)" },
      { id: 3, question: "What does EVM stand for?", options: ["Electronic Voting Machine", "Election Validation Method", "Elective Voting Module", "Electronic Verification Machine"], answer: "Electronic Voting Machine" },
      { id: 4, question: "What is the NOTA option?", options: ["None of the Above", "New Order for Transitioning Authority", "National Organization for Transparency and Accountability", "None of These Apply"], answer: "None of the Above" },
      { id: 5, question: "Which body conducts elections to the Lok Sabha in India?", options: ["Supreme Court of India", "Election Commission of India", "Parliament of India", "President of India"], answer: "Election Commission of India" }
    ];
    return apiResponse.success(res, quiz, { total: quiz.length });
  } catch (error) {
    logger.error({ message: 'Error retrieving quiz', error: error.message });
    return apiResponse.error(res, error, 'Failed to retrieve quiz');
  }
};

/**
 * Submits quiz answers and returns a score.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return apiResponse.badRequest(res, 'Invalid answers payload');
    }
    
    // In a real app, we'd compare against a DB. Mocking scoring logic here.
    const score = Math.floor(Math.random() * 6); // 0 to 5
    const passed = score >= 3;
    
    logger.info({ event: 'quiz_submitted', uid: req.user?.uid || 'anon', score });
    return apiResponse.success(res, { score, passed, total: 5, feedback: passed ? "Great job!" : "Review the basics and try again." });
  } catch (error) {
    logger.error({ message: 'Error submitting quiz', error: error.message });
    return apiResponse.error(res, error, 'Failed to submit quiz answers');
  }
};

module.exports = { getQuiz, submitQuiz };
