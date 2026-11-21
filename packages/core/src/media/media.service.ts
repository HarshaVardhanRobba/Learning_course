import 'server-only'
import { AwsV4Signer } from 'aws4fetch'

/**
 * Protected media access. Cloudflare credentials stay on the server: learners only ever receive a
 * short-lived signed playback token or a short-lived presigned R2 URL, issued after an access check.
 *
 * Env (server only, never NEXT_PUBLIC_):
 * - CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN (Stream:Edit), optional CLOUDFLARE_STREAM_CUSTOMER_CODE
 * - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 */

/** How long a playback token stays valid for starting playback. */
const PLAYBACK_TOKEN_TTL_SECONDS = 60 * 60
/** Presigned R2 URLs are used immediately by a redirect, so they can be very short. */
const R2_URL_TTL_SECONDS = 60

export type VideoPlayback =
  | { state: 'ready'; iframeUrl: string; expiresAt: Date }
  | { state: 'processing'; percent: number | null }
  | { state: 'failed'; message: string }
  | { state: 'unavailable'; message: string }

type StreamVideo = {
  readyToStream: boolean
  status: { state: string; pctComplete?: string; errorReasonText?: string }
}

type CloudflareEnvelope<T> = { success: boolean; result: T; errors?: { message: string }[] }

function streamConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN
  if (!accountId || !apiToken) return null
  return { accountId, apiToken, customerCode: process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE }
}

async function cloudflare<T>(path: string, apiToken: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const body = (await res.json()) as CloudflareEnvelope<T>
  return body.success ? body.result : null
}

/**
 * Checks the video's processing state, then mints a signed playback token. Call only after the learner's
 * access to the lesson has been verified. Never throws: failures become a displayable state.
 */
export async function getVideoPlayback(videoUid: string): Promise<VideoPlayback> {
  const config = streamConfig()
  if (!config) return { state: 'unavailable', message: 'Video playback isn’t configured yet.' }

  try {
    const base = `/accounts/${config.accountId}/stream/${encodeURIComponent(videoUid)}`
    const video = await cloudflare<StreamVideo>(base, config.apiToken)
    if (!video) return { state: 'unavailable', message: 'This video can’t be found.' }

    if (video.status.state === 'error') {
      return { state: 'failed', message: video.status.errorReasonText || 'This video failed to process.' }
    }
    if (!video.readyToStream) {
      const pct = Number.parseFloat(video.status.pctComplete ?? '')
      return { state: 'processing', percent: Number.isFinite(pct) ? Math.round(pct) : null }
    }

    const exp = Math.floor(Date.now() / 1000) + PLAYBACK_TOKEN_TTL_SECONDS
    // downloadable: false keeps the player from offering a download.
    const signed = await cloudflare<{ token: string }>(`${base}/token`, config.apiToken, {
      method: 'POST',
      body: JSON.stringify({ exp, downloadable: false }),
    })
    if (!signed?.token) return { state: 'unavailable', message: 'Playback access couldn’t be issued. Try again shortly.' }

    const host = config.customerCode
      ? `https://customer-${config.customerCode}.cloudflarestream.com/${signed.token}/iframe`
      : `https://iframe.videodelivery.net/${signed.token}`
    return { state: 'ready', iframeUrl: host, expiresAt: new Date(exp * 1000) }
  } catch {
    return { state: 'unavailable', message: 'The video service didn’t respond. Try again shortly.' }
  }
}

/** A presigned GET for a private R2 object, shown inline in the browser rather than as a download. */
export async function getSignedR2Url(key: string, title: string): Promise<string | null> {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null

  const path = key.split('/').map(encodeURIComponent).join('/')
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(bucket)}/${path}`)
  url.searchParams.set('X-Amz-Expires', String(R2_URL_TTL_SECONDS))
  url.searchParams.set('response-content-disposition', `inline; filename="${title.replace(/["\\\r\n]/g, '')}"`)

  const signer = new AwsV4Signer({ url: url.toString(), accessKeyId, secretAccessKey, service: 's3', region: 'auto', signQuery: true })
  const signed = await signer.sign()
  return signed.url.toString()
}
