'use strict';

/**
 * @fileoverview Translation Controller
 * Handles text translation using Google Cloud Translate API (Mocked for now).
 * @module controllers/translate.controller
 */

const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Allowed languages to prevent abuse
const ALLOWED_LANGUAGES = ['hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'or', 'pa', 'en'];

/**
 * Translates application text to a target regional language.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
const translateText = async (req, res) => {
  try {
    const { text, targetLang } = req.body;

    if (!text || !targetLang) {
      return apiResponse.badRequest(res, 'Text and targetLang are required');
    }

    if (!ALLOWED_LANGUAGES.includes(targetLang)) {
      return apiResponse.badRequest(res, 'Unsupported target language');
    }

    // Since we don't have the Cloud Translate API key configured by default,
    // we use a mocked response. In production, this would call @google-cloud/translate.
    
    // MOCK TRANSLATION LOGIC
    let translatedText = text;
    if (targetLang === 'hi') {
      if (text.toLowerCase().includes('vote')) translatedText = text.replace(/vote/gi, 'मतदान (Vote)');
      if (text.toLowerCase().includes('election')) translatedText = translatedText.replace(/election/gi, 'चुनाव (Election)');
    } else {
      translatedText = `[${targetLang.toUpperCase()}] ${text}`;
    }

    logger.info({ event: 'text_translated', uid: req.user?.uid || 'anon', targetLang, textLength: text.length });
    
    // Simulate slight network delay for realism
    await new Promise(resolve => setTimeout(resolve, 300));

    return apiResponse.success(res, { translatedText, sourceLang: 'en', targetLang });
  } catch (error) {
    logger.error({ message: 'Translation error', error: error.message });
    return apiResponse.error(res, error, 'Failed to translate text');
  }
};

module.exports = { translateText };
