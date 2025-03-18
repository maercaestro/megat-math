import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import Together from 'together-ai';
import cors from 'cors';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { unlink } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Add CORS before other middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Add static file serving for temp directory
app.use('/temp', express.static(path.join(__dirname, 'temp')));

// Initialize both APIs
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const together = new Together({
  apiKey: process.env.TOGETHER_API_KEY,
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

// Update the vision endpoint
app.post('/vision', async (req, res) => {
  console.log('Vision endpoint hit');
  let { imageBase64 } = req.body;
  
  try {
    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // Save image and get URL
    const imageUrl = await saveTemporaryImage(base64Data);
    console.log('Image saved at:', imageUrl);
    
    // Format the request according to Together AI's specifications
    const response = await together.chat.completions.create({
      model: "meta-llama/Llama-Vision-Free",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "What mathematical expression do you see?"
          },
          {
            type: "image_url",
            url: imageUrl // Changed from image_url to url
          }
        ]
      }],
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1
    });

    console.log('Together AI Response:', response);
    
    if (response.choices && response.choices[0]) {
      const text = response.choices[0].message.content.trim();
      console.log('Extracted text:', text);
      res.json({ text });
    } else {
      throw new Error('Invalid response format from Together AI');
    }
    
  } catch (error) {
    console.error('Together AI Error:', {
      message: error.message,
      details: error.response?.data || error
    });
    
    res.status(500).json({ 
      error: 'Failed to process vision request',
      details: error.message
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
