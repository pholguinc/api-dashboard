import { Router } from 'express';
import { MetroLiveStreamModel } from '../models/metro-live.model';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// NGINX RTMP callback endpoints must be publicly reachable and lightweight
// NGINX sends application/x-www-form-urlencoded payload with fields like:
//   app, name (streamKey), addr, clientid, tcurl

const router = Router();

// Helper: parse stream key from request
function getStreamKey(req: any): string | null {
  const key = (req.body?.name || req.query?.name || '').toString();
  return key || null;
}

// Publish authorization (RTMP on_publish)

router.post('/publish', async (req, res) => {
  try {
    const streamKey = getStreamKey(req);
    if (!streamKey) return res.status(400).send('missing stream key');
    // Optional signed token validation: pass token as ?token=... or body token
    const token = (req.body?.token || req.query?.token) as string | undefined;
    if (token) {
      try {
        const payload = jwt.verify(token, env.streaming.jwtSecret) as any;
        if (payload.streamKey !== streamKey) return res.status(403).send('invalid');
        if (payload.exp && Date.now() / 1000 > payload.exp) return res.status(403).send('expired');
      } catch (_e) {
        return res.status(403).send('invalid');
      }
    }

    const stream = await MetroLiveStreamModel.findOne({ streamKey: streamKey });
    if (!stream) return res.status(403).send('invalid');

    // Mark stream starting/live if not already
    if (stream.status !== 'live') {
      stream.status = 'starting';
      stream.startedAt = new Date();
      await stream.save();
    }

    return res.status(200).send('ok');
  } catch (err) {
    // On errors, deny publish to avoid abuse
    return res.status(403).send('error');
  }
});

// Publish done (RTMP on_publish_done)

router.post('/publish_done', async (req, res) => {
  try {
    const streamKey = getStreamKey(req);
    if (!streamKey) return res.status(400).send('missing stream key');

    const stream = await MetroLiveStreamModel.findOne({ streamKey: streamKey });
    if (!stream) return res.status(200).send('ok');

    // Compute duration
    const duration = stream.startedAt
      ? Math.floor((Date.now() - stream.startedAt.getTime()) / 1000)
      : 0;

    stream.status = 'offline';
    stream.endedAt = new Date();
    stream.duration = duration;
    await stream.save();

    return res.status(200).send('ok');
  } catch (err) {
    return res.status(200).send('ok');
  }
});

// Viewer play (RTMP/HLS on_play)

router.post('/play', async (req, res) => {
  try {
    const streamKey = getStreamKey(req);
    if (!streamKey) return res.status(400).send('missing stream key');
    const stream = await MetroLiveStreamModel.findOne({ streamKey: streamKey });
    if (!stream) return res.status(403).send('invalid');
    if (stream.status === 'live') {
      stream.viewerCount = Math.max(0, (stream.viewerCount || 0) + 1);
      stream.maxViewers = Math.max(stream.maxViewers || 0, stream.viewerCount);
      await stream.save();
    }
    return res.status(200).send('ok');
  } catch (_err) {
    return res.status(200).send('ok');
  }
});

// Viewer play done (on_play_done)

router.post('/play_done', async (req, res) => {
  try {
    const streamKey = getStreamKey(req);
    if (!streamKey) return res.status(400).send('missing stream key');
    const stream = await MetroLiveStreamModel.findOne({ streamKey: streamKey });
    if (stream) {
      stream.viewerCount = Math.max(0, (stream.viewerCount || 0) - 1);
      await stream.save();
    }
    return res.status(200).send('ok');
  } catch (_err) {
    return res.status(200).send('ok');
  }
});

// Event publish (optional stricter auth)

router.post('/event_publish', async (req, res) => {
  try {
    const streamKey = getStreamKey(req);
    if (!streamKey || !streamKey.startsWith('event_')) return res.status(403).send('invalid');
    const stream = await MetroLiveStreamModel.findOne({ streamKey: streamKey, isEvent: true });
    if (!stream) return res.status(403).send('invalid');
    return res.status(200).send('ok');
  } catch (_err) {
    return res.status(403).send('invalid');
  }
});

// Auth request for protected viewers (used by nginx auth_request)

router.get('/viewer', async (req, res) => {
  try {
    // Basic allow-all for now; extend with JWT or token checks if needed.
    return res.status(200).send('ok');
  } catch (_err) {
    return res.status(403).send('invalid');
  }
});

export default router;

// Helper to issue signed publish tokens (used by streamer dashboard)
export function signPublishToken(streamKey: string, ttlSeconds = 900): string {
  const payload = { streamKey } as any;
  const opts: jwt.SignOptions = { expiresIn: ttlSeconds };
  return jwt.sign(payload, env.streaming.jwtSecret, opts);
}


