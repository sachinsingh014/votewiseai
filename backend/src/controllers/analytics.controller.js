'use strict';

/**
 * @fileoverview Analytics Controller
 * Handles user activity insights and usage statistics.
 * @module controllers/analytics.controller
 */

const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { aiStats } = require('../services/ai/ai.service');

/**
 * Retrieves platform analytics and AI service statistics.
 * In a real application, this might aggregate data from Firestore.
 * For this MVP, we return active AI service stats and mocked user counts.
 * 
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
const getAnalytics = async (req, res) => {
  try {
    const aiData = aiStats.getSnapshot();
    
    // Simulate fetching aggregated DB metrics
    const data = {
      activeUsersToday: 150 + Math.floor(Math.random() * 50),
      totalChatsProcessed: aiData.totalRequests + 1000, // baseline
      cacheHitRate: aiData.cacheHitRate,
      averageResponseTimeMs: aiData.avgResponseTimeMs || 850,
      completionRate: '68%',
      topQueryTopics: ['Voter ID Registration', 'Polling Booth Location', 'Eligibility Verification']
    };

    logger.info({ event: 'analytics_viewed', uid: req.user?.uid || 'anon' });
    return apiResponse.success(res, data);
  } catch (error) {
    logger.error({ message: 'Error retrieving analytics', error: error.message });
    return apiResponse.error(res, error, 'Failed to retrieve analytics');
  }
};

module.exports = { getAnalytics };
