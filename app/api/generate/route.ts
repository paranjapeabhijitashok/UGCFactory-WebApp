import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300 // 5 min — fal.ai + kie.ai generation takes ~250s

export async function POST(request: NextRequest) {
  try {
    const falApiKey = process.env.FAL_API_KEY
    const webhookUrl = process.env.N8N_GENERATE_WEBHOOK_URL
    if (!falApiKey || !webhookUrl) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const imageFile = formData.get('product_image') as File | null
    const instructions = formData.get('instructions') as string | null

    if (!imageFile || !instructions) {
      return NextResponse.json({ error: 'Missing image or instructions' }, { status: 400 })
    }

    // Upload image to fal.ai storage to get a public URL
    const imageBuffer = await imageFile.arrayBuffer()
    const uploadRes = await fetch('https://fal.run/storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': imageFile.type || 'image/jpeg',
        'X-Fal-File-Name': imageFile.name || 'product.jpg',
      },
      body: imageBuffer,
    })

    if (!uploadRes.ok) {
      const text = await uploadRes.text()
      console.error('fal.ai upload error:', uploadRes.status, text)
      return NextResponse.json({ error: 'Image upload failed. Please try again.' }, { status: 500 })
    }

    const { url: imageUrl } = await uploadRes.json() as { url: string }

    // Call n8n webhook with image URL + instructions
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, instructions }),
    })

    if (!n8nRes.ok) {
      const text = await n8nRes.text()
      console.error('n8n error:', n8nRes.status, text)
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    const data = await n8nRes.json() as { ugc_image_url?: string; video_url?: string }

    if (!data.ugc_image_url || !data.video_url) {
      console.error('Unexpected n8n response:', data)
      return NextResponse.json({ error: 'Unexpected response from workflow. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ugc_image_url: data.ugc_image_url, video_url: data.video_url })
  } catch (err) {
    console.error('API route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
