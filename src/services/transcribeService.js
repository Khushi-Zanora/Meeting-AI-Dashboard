import Groq from 'groq-sdk';
import fs from 'fs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Transcribes an audio file using Groq's Whisper API.
 * @param {string} filePath - Path to the audio file on disk
 * @returns {Promise<string>} The transcribed text
 */
export const transcribeAudio = async (filePath) => {
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: process.env.GROQ_WHISPER_MODEL,
    response_format: 'text'
  });

  return transcription; // plain text when response_format is 'text'
};