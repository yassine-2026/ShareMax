import express from 'express';
import session from 'express-session';
import multer from 'multer';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Readable } from 'stream';
import { analyzeVideo, exportVideo, checkIfOptimized } from './src/lib/videoProcessor.js';
import os from 'os';

// Ensure required env vars
// For development, these might be missing, but we shouldn't crash if they are missing
// We will throw errors in the API endpoints if they are accessed.

const app = express();
const PORT = 3000;

app.set('trust proxy', 1); // Trust first proxy (Render)
app.use(express.json());

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-do-not-use-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Types for session
declare module 'express-session' {
  interface SessionData {
    tokens?: any;
    user?: {
      id: string;
      email: string;
      name: string;
      picture: string;
    };
  }
}

// Memory storage for multer to avoid saving on disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit (mock)
  },
});

const optimizerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, os.tmpdir());
  },
  filename: function (req, file, cb) {
    cb(null, 'opt_' + Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const optimizerUpload = multer({ storage: optimizerStorage });


// Helper to get OAuth2 client
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// Check if configured
const isConfigured = () => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
};

// Middleware to check authentication
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// --- API Routes ---

app.get('/api/auth/status', (req, res) => {
  res.json({
    configured: isConfigured(),
    authenticated: !!req.session.tokens,
    user: req.session.user || null,
  });
});

app.get('/api/auth/google', (req, res) => {
  if (!isConfigured()) {
    return res.status(500).json({ error: 'Google OAuth is not configured' });
  }
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.file', // Only access files created by the app
    ],
    prompt: 'consent',
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).send('Invalid request');
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    req.session.tokens = tokens;
    req.session.user = {
      id: userInfo.data.id || '',
      email: userInfo.data.email || '',
      name: userInfo.data.name || '',
      picture: userInfo.data.picture || '',
    };

    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Session destruction error:', err);
    res.json({ success: true });
  });
});

app.post('/api/upload', requireAuth, upload.array('files'), async (req, res) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const uploadedFiles = [];

    for (const file of req.files) {
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      const response = await drive.files.create({
        requestBody: {
          name: file.originalname,
          mimeType: file.mimetype,
        },
        media: {
          mimeType: file.mimetype,
          body: bufferStream,
        },
        fields: 'id, name, mimeType, webViewLink, webContentLink, size, createdTime',
      });

      if (response.data.id) {
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      }

      uploadedFiles.push(response.data);
    }

    res.json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

app.get('/api/files', requireAuth, async (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Ensure we only fetch files created by this app (due to drive.file scope)
    const response = await drive.files.list({
      pageSize: 50,
      fields: 'files(id, name, mimeType, size, createdTime, webViewLink, webContentLink, thumbnailLink)',
      orderBy: 'createdTime desc',
    });

    res.json({ files: response.data.files || [] });
  } catch (error) {
    console.error('Fetch files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

app.get('/api/files/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.get({
      fileId: id,
      fields: 'id, name, mimeType, size, createdTime, webViewLink, webContentLink, thumbnailLink',
    });

    res.json({ file: response.data });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

app.get('/api/files/:id/stream', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.get(
      { fileId: id, alt: 'media' },
      { responseType: 'stream' }
    );

    response.data
      .on('end', () => {})
      .on('error', (err: any) => {
        console.error('Error streaming file', err);
        res.status(500).end();
      })
      .pipe(res);
  } catch (error) {
    console.error('Stream file error:', error);
    res.status(500).json({ error: 'Failed to stream file' });
  }
});

app.get('/api/video/:id/analyze', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Download locally to analyze reliably with ffprobe
    const fileMeta = await drive.files.get({ fileId: id, fields: 'name' });
    const tmpPath = path.join(os.tmpdir(), `analyze_${id}_${Date.now()}`);
    
    const streamRes = await drive.files.get({ fileId: id, alt: 'media' }, { responseType: 'stream' });
    const dest = fs.createWriteStream(tmpPath);
    
    await new Promise((resolve, reject) => {
      streamRes.data.pipe(dest);
      dest.on('finish', resolve);
      dest.on('error', reject);
    });

    const info = await analyzeVideo(fs.createReadStream(tmpPath));
    
    // Clean up
    fs.unlink(tmpPath, (err) => { if (err) console.error('Failed to cleanup tmp file:', err); });
    
    res.json({ info });
  } catch (error) {
    console.error('Analyze video error:', error);
    res.status(500).json({ error: 'Failed to analyze video' });
  }
});

const exportJobs = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'error',
  progress: number,
  result?: any,
  error?: string
}>();

app.post('/api/video/:id/optimize', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;
    
    if (!platform || !['tiktok', 'instagram', 'youtube_shorts', 'facebook', 'whatsapp', 'telegram', 'low_size', 'original'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const jobId = Math.random().toString(36).substring(2, 15);
    exportJobs.set(jobId, { status: 'pending', progress: 0 });

    // Start async processing
    (async () => {
      let tmpInputPath = '';
      let exportedFilePath = '';
      try {
        exportJobs.set(jobId, { status: 'processing', progress: 5 });
        
        const fileMeta = await drive.files.get({ fileId: id, fields: 'name' });
        const originalName = fileMeta.data.name || 'video.mp4';
        
        tmpInputPath = path.join(os.tmpdir(), `optimize_in_${id}_${Date.now()}`);
        const streamRes = await drive.files.get({ fileId: id, alt: 'media' }, { responseType: 'stream' });
        const dest = fs.createWriteStream(tmpInputPath);
        
        await new Promise((resolve, reject) => {
          streamRes.data.pipe(dest);
          dest.on('finish', resolve);
          dest.on('error', reject);
        });

        exportJobs.set(jobId, { status: 'processing', progress: 15 });

        // Optional: check if already optimized
        const info = await analyzeVideo(fs.createReadStream(tmpInputPath));
        const originalSize = fs.statSync(tmpInputPath).size;

        if (platform !== 'original' && checkIfOptimized(info, platform)) {
          exportJobs.set(jobId, { 
            status: 'completed', 
            progress: 100, 
            result: { 
              alreadyOptimized: true,
              originalInfo: info,
              originalSize,
              optimizedInfo: info,
              optimizedSize: originalSize,
              driveId: id
            } 
          });
          fs.unlink(tmpInputPath, () => {});
          return;
        }

        exportedFilePath = await exportVideo(
          fs.createReadStream(tmpInputPath),
          platform as any,
          `optimize_out_${id}_${Date.now()}`,
          (percent) => {
            // Map 0-100 to 15-85
            const mappedProgress = Math.floor(15 + (percent * 0.7));
            const job = exportJobs.get(jobId);
            if (job && job.status === 'processing') {
              job.progress = mappedProgress;
            }
          }
        );

        exportJobs.set(jobId, { status: 'processing', progress: 85 });

        // Upload back to Drive
        const optimizedInfo = await analyzeVideo(fs.createReadStream(exportedFilePath));
        const optimizedSize = fs.statSync(exportedFilePath).size;

        const media = {
          mimeType: 'video/mp4',
          body: fs.createReadStream(exportedFilePath),
        };
        const uploadRes = await drive.files.create({
          requestBody: {
            name: `${platform}_optimized_${originalName}`,
            parents: ['root'],
          },
          media: media,
          fields: 'id, webViewLink',
        });
        
        exportJobs.set(jobId, { status: 'processing', progress: 95 });

        // Make it publicly accessible
        await drive.permissions.create({
          fileId: uploadRes.data.id!,
          requestBody: { role: 'reader', type: 'anyone' }
        });

        exportJobs.set(jobId, { 
          status: 'completed', 
          progress: 100, 
          result: {
            alreadyOptimized: false,
            originalInfo: info,
            originalSize,
            optimizedInfo: optimizedInfo,
            optimizedSize: optimizedSize,
            driveId: uploadRes.data.id,
            webViewLink: uploadRes.data.webViewLink
          }
        });

      } catch (err: any) {
        console.error('Job error:', err);
        const job = exportJobs.get(jobId);
        if (job) {
          job.status = 'error';
          job.error = err.message || 'Unknown error occurred';
        }
      } finally {
        if (tmpInputPath) fs.unlink(tmpInputPath, () => {});
        if (exportedFilePath) fs.unlink(exportedFilePath, () => {});
      }
    })();

    res.json({ jobId });
  } catch (error: any) {
    console.error('Optimize start error:', error);
    res.status(500).json({ error: error.message || 'Failed to start optimization' });
  }
});

app.get('/api/video/job/:jobId', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.delete('/api/files/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    await drive.files.delete({ fileId: id });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Alias for delete as requested
app.all('/api/files/:id/delete', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    await drive.files.delete({ fileId: id });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});



app.post('/api/optimizer/upload', optimizerUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Analyze the file
    const info = await analyzeVideo(fs.createReadStream(req.file.path));
    const size = req.file.size;
    
    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      info,
      size
    });
  } catch (err) {
    console.error('Optimizer upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload and analyze file' });
  }
});

app.post('/api/optimizer/process', async (req, res) => {
  try {
    const { fileId, platform } = req.body;
    
    if (!fileId || !platform) {
      return res.status(400).json({ error: 'Missing fileId or platform' });
    }
    
    const inputPath = path.join(os.tmpdir(), fileId);
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: 'Original file not found. Please upload again.' });
    }
    
    const jobId = 'job_' + Math.random().toString(36).substring(2, 15);
    exportJobs.set(jobId, { status: 'pending', progress: 0 });
    
    (async () => {
      let exportedFilePath = '';
      try {
        exportJobs.set(jobId, { status: 'processing', progress: 5 });
        const originalInfo = await analyzeVideo(fs.createReadStream(inputPath));
        const originalSize = fs.statSync(inputPath).size;
        
        if (checkIfOptimized(originalInfo, platform)) {
          exportJobs.set(jobId, { 
            status: 'completed', 
            progress: 100, 
            result: { 
              alreadyOptimized: true,
              originalInfo,
              originalSize,
              optimizedInfo: originalInfo,
              optimizedSize: originalSize,
              optimizedFileId: fileId // use original
            } 
          });
          return;
        }

        exportedFilePath = await exportVideo(
          fs.createReadStream(inputPath),
          platform,
          `optimize_out_${jobId}`,
          (percent) => {
            const mappedProgress = Math.floor(5 + (percent * 0.9));
            const job = exportJobs.get(jobId);
            if (job && job.status === 'processing') {
              job.progress = mappedProgress;
            }
          }
        );

        exportJobs.set(jobId, { status: 'processing', progress: 95 });

        const optimizedInfo = await analyzeVideo(fs.createReadStream(exportedFilePath));
        const optimizedSize = fs.statSync(exportedFilePath).size;
        
        exportJobs.set(jobId, { 
          status: 'completed', 
          progress: 100, 
          result: {
            alreadyOptimized: false,
            originalInfo,
            originalSize,
            optimizedInfo,
            optimizedSize,
            optimizedFileId: path.basename(exportedFilePath)
          }
        });
        
      } catch (err) {
        console.error('Optimizer job error:', err);
        const job = exportJobs.get(jobId);
        if (job) {
          job.status = 'error';
          job.error = err.message || 'Unknown error occurred';
        }
      }
    })();
    
    res.json({ jobId });
  } catch (error) {
    console.error('Optimize start error:', error);
    res.status(500).json({ error: error.message || 'Failed to start optimization' });
  }
});

app.get('/api/optimizer/download/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const filePath = path.join(os.tmpdir(), fileId);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  if (req.query.download) {
    res.download(filePath, `optimized_${fileId}`);
  } else {
    res.sendFile(filePath);
  }
});

// Vite middleware for development or serving static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
