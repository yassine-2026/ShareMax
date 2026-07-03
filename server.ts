import express from 'express';
import session from 'express-session';
import multer from 'multer';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Readable } from 'stream';
import { analyzeVideo, exportVideo } from './src/lib/videoProcessor.js';
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

app.get('/api/video/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.query;
    
    if (!platform || !['tiktok', 'instagram', 'youtube_shorts', 'facebook', 'low_size', 'original'].includes(platform as string)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Notice we skip requireAuth for public share link usage if needed, or we might need a public alternative. 
    // Wait, the prompt says "عند رفع فيديو", so the user is logged in. But just in case.
    // Let's require auth for now, or fetch file safely if shared. 
    // Actually, "لا يتم فقدان الجودة في النسخة الأصلية أبداً", "رابط تحميل حقيقي"
    // Let's use service account or just the session auth if they are logged in.
    let drive;
    if (req.session?.tokens) {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(req.session.tokens);
      drive = google.drive({ version: 'v3', auth: oauth2Client });
    } else {
      // If no auth, assume it's publicly shared. We can only access it if we have an API key or use public URL.
      // We will enforce requireAuth for this advanced processing.
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tmpInputPath = path.join(os.tmpdir(), `export_in_${id}_${Date.now()}`);
    
    const streamRes = await drive.files.get({ fileId: id, alt: 'media' }, { responseType: 'stream' });
    const dest = fs.createWriteStream(tmpInputPath);
    
    await new Promise((resolve, reject) => {
      streamRes.data.pipe(dest);
      dest.on('finish', resolve);
      dest.on('error', reject);
    });

    const exportedFilePath = await exportVideo(
      fs.createReadStream(tmpInputPath),
      platform as any,
      `export_out_${id}_${Date.now()}`
    );

    res.download(exportedFilePath, `${platform}_optimized.mp4`, (err) => {
      // Clean up both files after sending
      fs.unlink(tmpInputPath, () => {});
      fs.unlink(exportedFilePath, () => {});
      if (err) {
        console.error('Error sending file:', err);
      }
    });

  } catch (error) {
    console.error('Export video error:', error);
    res.status(500).json({ error: 'Failed to export video' });
  }
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
