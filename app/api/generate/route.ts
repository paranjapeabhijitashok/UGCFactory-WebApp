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

    // Upload image to fal.ai storage (two-step: initiate → PUT)
    const contentType = imageFile.type || 'image/jpeg'
    const fileName = imageFile.name || 'product.jpg'

    // Step 1: initiate upload to get presigned URL
    const initiateRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_name: fileName, content_type: contentType }),
    })

    if (!initiateRes.ok) {
      const text = await initiateRes.text()
      console.error('fal.ai initiate error:', initiateRes.status, text)
      return NextResponse.json({ error: 'Image upload failed. Please try again.' }, { status: 500 })
    }

    const { file_url: imageUrl, upload_url } = await initiateRes.json() as { file_url: string; upload_url: string }

    // Step 2: PUT the file to the presigned URL
    const imageBuffer = await imageFile.arrayBuffer()
    const putRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: imageBuffer,
    })

    if (!putRes.ok) {
      const text = await putRes.text()
      console.error('fal.ai PUT error:', putRes.status, text)
      return NextResponse.json({ error: 'Image upload failed. Please try again.' }, { status: 500 })
    }

    // Call n8n webhook with image URL + instructions
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, instructions }),
    })

    const n8nText = await n8nRes.text()
    if (!n8nRes.ok || !n8nText.trim()) {
      console.error('n8n error:', n8nRes.status, n8nText)
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    let data: { ugc_image_url?: string; video_url?: string }
    try {
      data = JSON.parse(n8nText)
    } catch {
      console.error('n8n non-JSON response:', n8nText)
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }

    if (!data.ugc_image_url || !data.video_url) {
      console.error('Unexpected n8n response:', data)
      return NextResponse.json({ error: 'Unexpected response from workflow. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ugc_image_url: data.ugc_image_url, video_url: data.video_url })
  } catch (err) {
    console.error('API route error:', err instanceof Error ? err.message : err, err instanceof Error ? err.stack : '')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
