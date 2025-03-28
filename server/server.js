import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import cors from 'cors';
import { Groq } from 'groq-sdk';
import { writeFile, readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';


// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Add CORS before other middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));


// Simple test route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from EC2 backend!' });
});

// Initialize APIs
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to save temporary image
async function saveTemporaryImage(base64Data) {
  const filename = `math-${Date.now()}.png`;
  const filepath = path.join(__dirname, 'temp', filename);
  const imageBuffer = Buffer.from(base64Data, 'base64');
  await writeFile(filepath, imageBuffer);
  return `http://localhost:${port}/temp/${filename}`;
}

// Add this function
async function cleanupTempFiles() {
  const tempDir = path.join(__dirname, 'temp');
  try {
    const files = await readdir(tempDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await stat(filePath);
      // Delete files older than 1 hour
      if (now - stats.mtime.getTime() > 3600000) {
        await unlink(filePath);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Add cleanup interval
setInterval(cleanupTempFiles, 3600000); // Run every hour

// Debug route
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ status: 'Server is running' });
});

// Update the vision endpoint to use Groq SDK
app.post('/vision', async (req, res) => {
  try {
    console.log('Received vision request');
    let { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Debug the incoming data
    console.log('Image data length:', imageBase64.length);
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "What mathematical expression do you see? Return only the expression, no explanations. Keep it under 10 characters."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${imageBase64}`
            }
          }
        ]
      }],
      model: "llama-3.2-90b-vision-preview",
      temperature: 0.1,
      max_completion_tokens: 100,
      top_p: 0.8,
      stream: false,
      stop: null
    });

    console.log('Groq Response:', JSON.stringify(chatCompletion, null, 2));

    if (!chatCompletion?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response structure from Groq');
    }

    let text = chatCompletion.choices[0].message.content.trim();
    text = text.substring(0, 10); // Limit to 10 characters

    // Set proper headers and return JSON
    res.setHeader('Content-Type', 'application/json');
    return res.json({
      success: true,
      text: text
    });

  } catch (error) {
    console.error('Vision endpoint error:', error);
    
    // Ensure we always return JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Existing calculate endpoint for GPT-4 solving
app.post('/calculate', async (req, res) => {
  let { imageBase64, ocrText } = req.body;
  
  if (imageBase64.startsWith("data:image/png;base64,")) {
    imageBase64 = imageBase64.replace("data:image/png;base64,", "");
  }
  
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { 
              type: "input_text", 
              text: `Solve this mathematical expression: ${ocrText}. Only respond with the numerical answer.` 
            },
            {
              type: "input_image",
              image_url: `data:image/png;base64,${imageBase64}`,
              detail: "high"
            },
          ],
        },
      ],
    });
    
    const description = response.output_text.trim();
    console.log('GPT Response:', description);
    res.json({ description });
    
  } catch (error) {
    console.error('GPT Error:', error);
    res.status(500).json({ 
      error: 'Failed to process calculation',
      details: error.message 
    });
  }
});

// Update the solve-steps endpoint to use OpenAI GPT-4
app.post('/solve-steps', async (req, res) => {
  const { imageBase64 } = req.body;
  
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { 
              type: "input_text", 
              text: `Solve this mathematical expression step by step. Follow these formatting rules:
              1. Start with a brief introduction
              2. Number each step (1, 2, 3, etc.)
              3. Each numbered step should be a complete thought
              4. Use simple mathematical symbols (+, -, ×, ÷, =)
              5. No bullet points or dashes
              6. Maximum 10 steps
              7. End with a conclusion` 
            },
            {
              type: "input_image",
              image_url: `data:image/png;base64,${imageBase64}`,
              detail: "high"
            },
          ],
        },
      ],
    });

    // Process the response to ensure proper formatting
    const solution = response.output_text.trim()
      .replace(/\\[a-zA-Z]+{|}|\\/g, '') // Remove LaTeX commands
      .replace(/\([^)]+\)/g, match => match.replace(/\s+/g, '')) // Clean spaces in parentheses
      .replace(/\s*\n\s*(\d+\.)/g, '\n\n$1') // Add extra line break before numbered steps
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    console.log('Processed solution:', solution);
    res.json({ steps: [solution] });
    
  } catch (error) {
    console.error('Step-by-step solution error:', error);
    res.status(500).json({ 
      error: 'Failed to generate solution steps',
      details: error.message 
    });
  }
});

app.listen(port, '0.0.0.0',() => {
  console.log(`Server is running on port ${port}`);
});
