import crypto from 'crypto';

export function generateStreamKey(): string {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `stream_${timestamp}_${randomBytes}`;
}

export function generateSessionKey(): string {
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(6).toString('hex');
  return `session_${timestamp}_${randomBytes}`;
}

export function validateStreamKey(streamKey: string): boolean {
  const pattern = /^stream_\d+_[a-f0-9]{16}$/;
  return pattern.test(streamKey);
}

export function extractTimestampFromKey(streamKey: string): number | null {
  const match = streamKey.match(/^stream_(\d+)_/);
  return match ? parseInt(match[1]) : null;
}

export function generateRoomId(): string {
  return `room_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
