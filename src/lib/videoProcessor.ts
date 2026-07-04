import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { google } from 'googleapis';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export interface VideoInfo {
  resolution: string;
  width: number;
  height: number;
  bitrate: number;
  fps: number;
  aspectRatio: string;
  duration: number;
  format: string;
}

export const analyzeVideo = (stream: NodeJS.ReadableStream): Promise<VideoInfo> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(stream, (err, metadata) => {
      if (err) return reject(err);
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const format = metadata.format;
      
      if (!videoStream) {
        return reject(new Error('No video stream found'));
      }
      
      let fps = 0;
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/');
        if (parts.length === 2) {
          fps = Math.round(parseInt(parts[0], 10) / parseInt(parts[1], 10));
        } else {
          fps = parseInt(videoStream.r_frame_rate, 10);
        }
      }
      
      resolve({
        resolution: `${videoStream.width}x${videoStream.height}`,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        bitrate: format.bit_rate ? parseInt(format.bit_rate.toString(), 10) : 0,
        fps,
        aspectRatio: videoStream.display_aspect_ratio || 'Unknown',
        duration: format.duration ? parseFloat(format.duration.toString()) : 0,
        format: format.format_name || 'Unknown'
      });
    });
  });
};

export const checkIfOptimized = (info: VideoInfo, platform: string): boolean => {
  // Rough heuristics to decide if video is already perfect for the platform
  if (info.format.indexOf('mp4') === -1 && info.format.indexOf('mov') === -1) return false;
  
  if (['tiktok', 'instagram', 'youtube_shorts'].includes(platform)) {
    // Needs to be vertical (9:16) roughly
    if (info.width > info.height) return false; // landscape
    if (info.width !== 1080 || info.height !== 1920) return false;
    if (info.fps > 30) return false;
  }
  
  if (platform === 'facebook' || platform === 'twitter' || platform === 'linkedin') {
    if (info.width > 1920 || info.height > 1080) return false;
  }
  
  if (platform === 'whatsapp') {
    // WhatsApp compresses heavily. If it's more than 720p or 16MB it will compress.
    if (info.width > 1280 && info.height > 1280) return false;
    if (info.bitrate > 2000000) return false;
  }
  
  if (platform === 'telegram') {
    if (info.width > 1920 || info.height > 1920) return false;
    if (info.bitrate > 3000000) return false;
  }
  
  return true; // Pretty close, no need to re-encode
};

export const exportVideo = (
  inputStream: NodeJS.ReadableStream,
  platform: 'tiktok' | 'instagram' | 'youtube_shorts' | 'facebook' | 'whatsapp' | 'telegram' | 'twitter' | 'linkedin' | 'low_size' | 'original',
  outputPrefix: string,
  onProgress?: (percent: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `${outputPrefix}_${platform}.mp4`);
    
    let command = ffmpeg(inputStream);
    
    switch (platform) {
      case 'tiktok':
      case 'instagram':
      case 'youtube_shorts':
        // Standard social media portrait format 1080x1920 (9:16)
        command = command
          .outputOptions([
            '-vf scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
            '-c:v libx264',
            '-preset fast',
            '-crf 23',
            '-c:a aac',
            '-b:a 128k',
            '-r 30'
          ]);
        break;
      case 'facebook':
        // Optimized 1080p
        command = command
          .outputOptions([
            '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
            '-c:v libx264',
            '-preset fast',
            '-crf 23',
            '-c:a aac',
            '-b:a 128k'
          ]);
        break;
      case 'twitter':
      case 'linkedin':
        // Twitter & LinkedIn - max 1080p, good quality
        command = command
          .outputOptions([
            '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
            '-c:v libx264',
            '-preset fast',
            '-crf 24',
            '-c:a aac',
            '-b:a 128k',
            '-r 30'
          ]);
        break;
      case 'telegram':
        // Telegram optimized (720p/1080p)
        command = command
          .outputOptions([
            '-vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
            '-c:v libx264',
            '-preset fast',
            '-crf 26',
            '-c:a aac',
            '-b:a 128k'
          ]);
        break;
      case 'whatsapp':
      case 'low_size':
        // Fast sharing, high compression
        command = command
          .outputOptions([
            '-vf scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2',
            '-c:v libx264',
            '-preset fast',
            '-crf 28',
            '-c:a aac',
            '-b:a 96k'
          ]);
        break;
      default:
        // Original - just copy
        command = command.outputOptions(['-c copy']);
        break;
    }
    
    command
      .on('progress', (progress) => {
        if (onProgress && progress.percent) {
          onProgress(progress.percent);
        }
      })
      .on('end', () => {
        resolve(tmpFile);
      })
      .on('error', (err) => {
        console.error(`Error exporting video for ${platform}:`, err);
        reject(err);
      })
      .save(tmpFile);
  });
};
