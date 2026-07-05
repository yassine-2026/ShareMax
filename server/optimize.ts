import express from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
const archiver = require('archiver');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const TMP_DIR = path.join(process.cwd(), '.tmp_optimize');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// Cleanup old files periodically (every hour)
setInterval(() => {
  try {
    const files = fs.readdirSync(TMP_DIR);
    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(TMP_DIR, file);
      const stats = fs.statSync(filePath);
      // Delete files older than 2 hours
      if (now - stats.mtimeMs > 2 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (err) {
    console.error('Failed to cleanup TMP_DIR:', err);
  }
}, 60 * 60 * 1000);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

export const optimizeRouter = express.Router();

const activeJobs = new Map<string, any>();

function parseFps(r_frame_rate: string | undefined): string {
  if (!r_frame_rate) return 'N/A';
  const parts = r_frame_rate.split('/');
  if (parts.length === 2) {
    const fps = parseInt(parts[0]) / parseInt(parts[1]);
    return fps.toFixed(2);
  }
  return r_frame_rate;
}

optimizeRouter.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const filePath = req.file.path;
  
  ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err) {
      console.error('ffprobe error:', err);
      return res.status(500).json({ error: 'Failed to analyze video' });
    }
    
    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
    const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
    
    res.json({
      jobId: req.file.filename,
      metadata: {
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'N/A',
        fps: parseFps(videoStream?.r_frame_rate),
        codec: videoStream?.codec_name || 'N/A',
        bitrate: metadata.format.bit_rate ? (Number(metadata.format.bit_rate) / 1000).toFixed(0) + ' kbps' : 'N/A',
        container: metadata.format.format_name || 'N/A',
        pixelFormat: videoStream?.pix_fmt || 'N/A',
        audioCodec: audioStream?.codec_name || 'N/A',
        audioBitrate: audioStream?.bit_rate ? (Number(audioStream.bit_rate) / 1000).toFixed(0) + ' kbps' : 'N/A',
        sampleRate: audioStream?.sample_rate ? audioStream.sample_rate + ' Hz' : 'N/A',
        fileSize: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
        duration: metadata.format.duration ? Number(metadata.format.duration).toFixed(2) + ' s' : 'N/A'
      }
    });
  });
});

optimizeRouter.get('/stream/:jobId', (req, res) => {
  const { jobId } = req.params;
  const filePath = path.join(TMP_DIR, jobId);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.sendFile(filePath);
});

import { platformProfiles } from './platformProfiles';

optimizeRouter.post('/start', (req, res) => {
  const { jobId, platforms } = req.body as { jobId: string, platforms: string[] };
  const sourcePath = path.join(TMP_DIR, jobId);
  
  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: 'Original file not found' });
  }

  const jobState: Record<string, any> = {};
  
  platforms.forEach(p => {
    jobState[p] = {
      status: 'pending',
      progress: 0,
      elapsedTime: '0s',
      remainingTime: 'Calculating...',
      outputFile: ''
    };
  });
  
  activeJobs.set(jobId, jobState);
  
  res.json({ success: true });
  
  // Start async processing
  (async () => {
    try {
      const originalMetadata = await new Promise<any>((resolve, reject) => {
        ffmpeg.ffprobe(sourcePath, (err, metadata) => {
          if (err) reject(err);
          else resolve(metadata);
        });
      });

      const videoStream = originalMetadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = originalMetadata.streams.find((s: any) => s.codec_type === 'audio');
      
      const origCodec = videoStream?.codec_name;
      const origPixFmt = videoStream?.pix_fmt;
      const origContainer = originalMetadata.format.format_name?.includes('mp4') ? 'mp4' : 'other';
      const origBitrateStr = originalMetadata.format.bit_rate as string | number | undefined;
      const origBitrate = origBitrateStr ? Number(origBitrateStr) : Infinity;

      const concurrencyLimit = Math.max(1, os.cpus().length - 1);
      console.log(`[Job ${jobId}] Processing ${platforms.length} platforms with concurrency ${concurrencyLimit}`);

      let platformIndex = 0;
      const processNextPlatform = async () => {
        while (platformIndex < platforms.length) {
          const platform = platforms[platformIndex++];
          await new Promise<void>((resolvePlatform) => {
          const profile = platformProfiles[platform] || platformProfiles['TikTok'];
          const outputPath = path.join(TMP_DIR, `${platform}_${jobId}.mp4`);
          
          const targetBitrateNum = parseInt(profile.videoBitrate) * 1000;
          const origFps = videoStream?.r_frame_rate ? parseFloat(parseFps(videoStream.r_frame_rate)) : 0;
          const origWidth = videoStream?.width || 0;
          const origHeight = videoStream?.height || 0;
          
          const [targetWidth, targetHeight] = profile.resolution.split('x').map(Number);
          
          const isResolutionMatch = (origWidth === targetWidth && origHeight === targetHeight) || 
                                    (origWidth === targetHeight && origHeight === targetWidth); // allow rotated
                                    
          const isCodecMatch = origCodec === profile.videoCodec.replace('lib', '');
          const isFpsMatch = origFps > 0 && Math.abs(origFps - profile.fps) <= 2;
          const isBitrateMatch = origBitrate <= targetBitrateNum * 1.2;
          
          // Can we copy video without re-encoding?
          // We can copy if codec, resolution, and fps match, and bitrate isn't wildly high
          const canCopyVideo = isCodecMatch && isResolutionMatch && isFpsMatch && isBitrateMatch;
          const canCopyAudio = audioStream?.codec_name === profile.audioCodec;
          
          // Heuristic for already completely optimized (container also matches)
          const isOptimized = canCopyVideo && canCopyAudio && origContainer === profile.container;
            
          if (isOptimized) {
            fs.copyFileSync(sourcePath, outputPath);
            jobState[platform].status = 'completed';
            jobState[platform].progress = 100;
            jobState[platform].remainingTime = '0s';
            jobState[platform].elapsedTime = '0s';
            jobState[platform].outputFile = `${platform}_${jobId}.mp4`;
            jobState[platform].message = 'Already optimized for this platform.';
            
            jobState[platform].resultMetadata = {
              resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'N/A',
              fps: parseFps(videoStream?.r_frame_rate),
              codec: videoStream?.codec_name || 'N/A',
              bitrate: origBitrateStr ? (Number(origBitrateStr) / 1000).toFixed(0) + ' kbps' : 'N/A',
              pixelFormat: videoStream?.pix_fmt || 'N/A',
              audioCodec: audioStream?.codec_name || 'N/A',
              fileSize: (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2) + ' MB',
              appliedSettings: {
                preset: 'N/A (Copied)',
                crf: 'N/A (Copied)',
                videoBitrate: 'N/A (Copied)',
                audioBitrate: 'N/A (Copied)',
                container: 'N/A (Copied)'
              }
            };
            return resolvePlatform();
          }
          
          jobState[platform].status = 'processing';
          jobState[platform].outputFile = `${platform}_${jobId}.mp4`;
          
          const outputOptions: string[] = ['-nostdin', '-map_metadata -1'];

          if (profile.faststart) {
            outputOptions.push('-movflags +faststart');
          }

          const command = ffmpeg(sourcePath);
          
          if (canCopyVideo) {
            command.videoCodec('copy');
            outputOptions.push('-map 0:v');
          } else {
            command.videoCodec(profile.videoCodec)
                   .size(profile.resolution)
                   .autopad(true as any, 'black')
                   .fps(profile.fps);
                   
            outputOptions.push(
              '-profile:v high',
              `-pix_fmt ${profile.pixelFormat}`,
              `-g ${profile.gop}`,
              `-preset ${profile.preset}`,
              `-crf ${profile.crf}`,
              `-b:v ${profile.videoBitrate}`,
              `-maxrate ${profile.maxBitrate}`,
              `-bufsize ${profile.bufSize}`,
              `-colorspace ${profile.colorSpace}`
            );
          }
          
          if (audioStream) {
            if (canCopyAudio) {
              command.audioCodec('copy');
              outputOptions.push('-map 0:a?');
            } else {
              command.audioCodec(profile.audioCodec);
              outputOptions.push(
                `-b:a ${profile.audioBitrate}`,
                `-ar ${profile.audioSampleRate}`
              );
            }
          } else {
            // No audio stream
            outputOptions.push('-an');
          }

          command.outputOptions(outputOptions).format(profile.container);

          console.log(`[Job ${jobId}] Start processing ${platform}`);
          console.log(`[Job ${jobId}] Output path: ${outputPath}`);

          command
            .on('start', (commandLine) => {
              console.log(`[Job ${jobId}] Running FFmpeg command: ${commandLine}`);
              jobState[platform].startTime = Date.now();
            })
            .on('progress', (progress) => {
              // fluent-ffmpeg progress.percent is sometimes NaN or undefined if duration is unknown
              let percent = 0;
              if (progress.percent) {
                percent = Math.min(Math.round(progress.percent), 99);
              } else if (progress.timemark) {
                // If percent is missing but we have timemark, we could parse it, but let's stick to fluent-ffmpeg's percent if available.
                // Or we can just log frames.
                percent = jobState[platform].progress || 0;
                if (percent < 95) percent += 1; // Fake progress if duration is unknown to avoid staying at 0
              }
              
              if (percent > (jobState[platform].progress || 0)) {
                jobState[platform].progress = percent;
                console.log(`[Job ${jobId}] Current progress for ${platform}: ${percent}%`);
              }
              
              if (jobState[platform].startTime) {
                const elapsedMs = Date.now() - jobState[platform].startTime;
                jobState[platform].elapsedTime = Math.round(elapsedMs / 1000) + 's';
                
                if (percent > 0) {
                  const totalEst = elapsedMs / (percent / 100);
                  const remaining = Math.round((totalEst - elapsedMs) / 1000);
                  jobState[platform].remainingTime = remaining + 's';
                }
              }
            })
            .on('end', () => {
              console.log(`[Job ${jobId}] End processing ${platform}`);
              // Check if output file actually exists and has size > 0
              if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
                console.error(`[Job ${jobId}] Error: Output file was not created or is empty for ${platform}`);
                jobState[platform].status = 'error';
                jobState[platform].error = 'Output file was not created successfully';
                resolvePlatform();
                return;
              }

              jobState[platform].status = 'completed';
              jobState[platform].progress = 100;
              jobState[platform].remainingTime = '0s';
              
              ffmpeg.ffprobe(outputPath, (err, metadata) => {
                if (!err) {
                  const outVideoStream = metadata.streams.find(s => s.codec_type === 'video');
                  const outAudioStream = metadata.streams.find(s => s.codec_type === 'audio');
                  
                  jobState[platform].resultMetadata = {
                    resolution: outVideoStream ? `${outVideoStream.width}x${outVideoStream.height}` : 'N/A',
                    fps: parseFps(outVideoStream?.r_frame_rate),
                    codec: outVideoStream?.codec_name || 'N/A',
                    bitrate: metadata.format.bit_rate ? (Number(metadata.format.bit_rate) / 1000).toFixed(0) + ' kbps' : 'N/A',
                    pixelFormat: outVideoStream?.pix_fmt || 'N/A',
                    audioCodec: outAudioStream?.codec_name || 'N/A',
                    fileSize: (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2) + ' MB',
                    appliedSettings: {
                      preset: profile.preset,
                      crf: profile.crf,
                      videoBitrate: profile.videoBitrate,
                      audioBitrate: profile.audioBitrate,
                      container: profile.container
                    }
                  };
                } else {
                  console.error(`[Job ${jobId}] Error analyzing output for ${platform}:`, err.message);
                }
                resolvePlatform();
              });
            })
            .on('error', (err, stdout, stderr) => {
              console.error(`[Job ${jobId}] Error message for ${platform}:`, err.message);
              console.error(`[Job ${jobId}] FFmpeg stderr:`, stderr);
              jobState[platform].status = 'error';
              jobState[platform].error = err.message || 'Unknown FFmpeg error';
              resolvePlatform();
            });

          // Run the command
          command.save(outputPath);
        });
        }
      };

      const workers = Array(concurrencyLimit).fill(0).map(() => processNextPlatform());
      await Promise.all(workers);
      
    } catch (err: any) {
      console.error('Error in optimization loop:', err);
      platforms.forEach(p => {
        if (jobState[p].status === 'pending') {
          jobState[p].status = 'error';
          jobState[p].error = err?.message || 'Failed to analyze original video';
        }
      });
    }
  })();
});

optimizeRouter.get('/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const interval = setInterval(() => {
    const state = activeJobs.get(jobId);
    if (state) {
      res.write(`data: ${JSON.stringify(state)}\n\n`);
    }
  }, 1000);
  
  req.on('close', () => {
    clearInterval(interval);
  });
});

optimizeRouter.get('/download/:jobId/:platform', (req, res) => {
  const { jobId, platform } = req.params;
  const fileName = `${platform}_${jobId}.mp4`;
  const filePath = path.join(TMP_DIR, fileName);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, `Optimized_${platform}.mp4`);
  } else {
    res.status(404).send('File not found');
  }
});

optimizeRouter.get('/download-all/:jobId', (req, res) => {
  const { jobId } = req.params;
  const state = activeJobs.get(jobId);
  
  if (!state) {
    return res.status(404).send('Job not found');
  }
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="Optimized_Videos_${jobId}.zip"`);
  
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.on('error', (err) => {
    res.status(500).send({ error: err.message });
  });
  
  archive.pipe(res);
  
  for (const [platform, dataUncasted] of Object.entries(state)) {
    const data = dataUncasted as any;
    if (data.status === 'completed' && data.outputFile) {
      const filePath = path.join(TMP_DIR, data.outputFile);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `Optimized_${platform}.mp4` });
      }
    }
  }
  
  archive.finalize();
});
