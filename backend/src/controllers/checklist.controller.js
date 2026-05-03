'use strict';

/**
 * @fileoverview Checklist Controller
 * Handles user voter readiness checklist.
 * @module controllers/checklist.controller
 */

const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const admin = require('firebase-admin');

/**
 * Retrieves the user's checklist.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
const getChecklist = async (req, res) => {
  try {
    const uid = req.user.uid;
    const docRef = admin.firestore().collection('users').doc(uid).collection('data').doc('checklist');
    const doc = await docRef.get();

    let items = [
      { id: 'verify_age', text: 'Verify age eligibility (18+)', completed: false },
      { id: 'form_6', text: 'Submit Form 6 for registration', completed: false },
      { id: 'epic_card', text: 'Receive EPIC (Voter ID) card', completed: false },
      { id: 'find_booth', text: 'Find your polling booth', completed: false },
    ];

    if (doc.exists) {
      items = doc.data().items || items;
    } else {
      // Initialize if missing
      await docRef.set({ items });
    }

    const completedCount = items.filter(i => i.completed).length;
    const progress = Math.round((completedCount / items.length) * 100);

    return apiResponse.success(res, { items, progress });
  } catch (error) {
    logger.error({ message: 'Error retrieving checklist', error: error.message });
    return apiResponse.error(res, error, 'Failed to retrieve checklist');
  }
};

/**
 * Updates a specific item in the checklist.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
const updateChecklist = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { itemId, completed } = req.body;

    if (!itemId || typeof completed !== 'boolean') {
      return apiResponse.badRequest(res, 'Invalid payload: itemId and completed status required');
    }

    const docRef = admin.firestore().collection('users').doc(uid).collection('data').doc('checklist');
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return apiResponse.notFound(res, 'Checklist not found. Please retrieve it first to initialize.');
    }

    const items = doc.data().items;
    const itemIndex = items.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) {
      return apiResponse.badRequest(res, 'Invalid itemId');
    }

    items[itemIndex].completed = completed;
    await docRef.update({ items, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    
    logger.info({ event: 'checklist_updated', uid, itemId, completed });
    
    return apiResponse.success(res, { items, message: 'Checklist updated successfully' });
  } catch (error) {
    logger.error({ message: 'Error updating checklist', error: error.message });
    return apiResponse.error(res, error, 'Failed to update checklist');
  }
};

module.exports = { getChecklist, updateChecklist };
