/**
 * VoteWise AI — Prerequisites Verification Script
 * Run: node verify-setup.js
 * Tests: Vertex AI (Gemini 2.0 Flash), Firestore, Translation, STT, TTS
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS
  || 'C:\\Users\\sachi\\Downloads\\votewiseai-94849-e353ed41a3a2.json';

const PROJECT_ID = 'votewiseai-94849';
const LOCATION   = 'us-central1';
const MODEL      = 'gemini-2.0-flash';
// ─────────────────────────────────────────────────────────────────────────────

process.env.GOOGLE_APPLICATION_CREDENTIALS = SERVICE_ACCOUNT_PATH;

const results = [];

function pass(name)       { results.push({ name, status: '✅ PASS' }); }
function fail(name, err)  { results.push({ name, status: `❌ FAIL — ${err.message || err}` }); }

// ── 1. Vertex AI — Direct REST call (bypasses SDK credential issues) ──────────
async function checkVertexAI() {
  const name = 'Vertex AI (gemini-2.0-flash)';
  try {
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      keyFilename: SERVICE_ACCOUNT_PATH,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const token = await auth.getAccessToken();
    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-001'];
    const errors = [];
    for (const model of models) {
      const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say ok' }] }] }),
      });
      if (res.ok) { pass(`${name} [${model}]`); return; }
      const body = await res.json();
      errors.push(`${model}: ${body?.error?.message || JSON.stringify(body)}`);
    }
    throw new Error(errors.join(' | '));
  } catch (err) { fail(name, err); }
}


// ── 2. Firestore ──────────────────────────────────────────────────────────────
async function checkFirestore() {
  const name = 'Firestore';
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: PROJECT_ID,
      });
    }
    const db = admin.firestore();
    await db.collection('_verify').doc('test').set({ ok: true, ts: new Date() });
    await db.collection('_verify').doc('test').delete();
    pass(name);
  } catch (err) { fail(name, err); }
}

// ── 3. Cloud Translation API ──────────────────────────────────────────────────
async function checkTranslation() {
  const name = 'Cloud Translation API';
  try {
    const { TranslationServiceClient } = require('@google-cloud/translate').v3;
    const client = new TranslationServiceClient();
    const [response] = await client.translateText({
      parent: `projects/${PROJECT_ID}/locations/global`,
      contents: ['Hello'],
      targetLanguageCode: 'hi',
    });
    if (response.translations?.[0]?.translatedText) pass(name);
    else throw new Error('No translation returned');
  } catch (err) { fail(name, err); }
}

// ── 4. Cloud Speech-to-Text ───────────────────────────────────────────────────
async function checkSTT() {
  const name = 'Cloud Speech-to-Text API';
  try {
    const speech = require('@google-cloud/speech');
    const client = new speech.SpeechClient();
    await client.initialize();
    pass(name);
  } catch (err) { fail(name, err); }
}

// ── 5. Cloud Text-to-Speech ───────────────────────────────────────────────────
async function checkTTS() {
  const name = 'Cloud Text-to-Speech API';
  try {
    const textToSpeech = require('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();
    const [response] = await client.listVoices({ languageCode: 'en-IN' });
    if (response.voices?.length > 0) pass(name);
    else throw new Error('No voices returned');
  } catch (err) { fail(name, err); }
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 VoteWise AI — Setup Verification\n');
  console.log(`   Project : ${PROJECT_ID}`);
  console.log(`   Model   : ${MODEL}`);
  console.log(`   Creds   : ${SERVICE_ACCOUNT_PATH}\n`);
  console.log('Running checks...\n');

  await checkVertexAI();
  await checkFirestore();
  await checkTranslation();
  await checkSTT();
  await checkTTS();

  console.log('─'.repeat(52));
  results.forEach(r => console.log(`  ${r.status}  ${r.name}`));
  console.log('─'.repeat(52));

  const passed = results.filter(r => r.status.startsWith('✅')).length;
  console.log(`\n  Result: ${passed}/${results.length} checks passed\n`);

  if (passed === results.length) {
    console.log('  🚀 All systems ready — start coding!\n');
  } else {
    console.log('  ⚠️  Fix the failing checks before proceeding.\n');
  }
}

main().catch(console.error);
