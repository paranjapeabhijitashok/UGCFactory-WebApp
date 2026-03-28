import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const webhookUrl = process.env.N8N_PUBLISH_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { video_url } = await request.json() as { video_url?: string }
    if (!video_url) {
      return NextResponse.json({ error: 'Missing video_url' }, { status: 400 })
    }

    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url }),
    })

    if (!n8nRes.ok) {
      const text = await n8nRes.text()
      console.error('n8n publish error:', n8nRes.status, text)
      return NextResponse.json({ error: 'Publishing failed. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Publish route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
