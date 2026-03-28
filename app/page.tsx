'use client'

import { useState, useRef, useEffect } from 'react'

type Step = 'upload' | 'processing' | 'review' | 'published'

const PHASE_MESSAGES = [
  { at: 0,   text: 'Analyzing your product image\u2026' },
  { at: 15,  text: 'Generating UGC image\u2026' },
  { at: 45,  text: 'Writing video script\u2026' },
  { at: 60,  text: 'Rendering your video \u2014 this takes ~3 min' },
  { at: 180, text: 'Still rendering\u2026 almost there' },
]

export default function Home() {
  const [step, setStep] = useState<Step>('upload')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [instructions, setInstructions] = useState('')
  const [ugcImageUrl, setUgcImageUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (step !== 'processing') {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    startTimeRef.current = Date.now()
    setPhaseIndex(0)
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      let next = 0
      for (let i = 0; i < PHASE_MESSAGES.length; i++) {
        if (elapsed >= PHASE_MESSAGES[i].at) next = i
      }
      setPhaseIndex(next)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setPreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!image || !instructions.trim()) return

    setStep('processing')
    setError(null)

    const formData = new FormData()
    formData.append('product_image', image)
    formData.append('instructions', instructions)

    try {
      const res = await fetch('/api/generate', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.ugc_image_url && data.video_url) {
        setUgcImageUrl(data.ugc_image_url)
        setVideoUrl(data.video_url)
        setStep('review')
      } else {
        setError(data.error || 'Generation failed. Please try again.')
        setStep('upload')
      }
    } catch {
      setError('Network error. Please try again.')
      setStep('upload')
    }
  }

  const handlePublish = async () => {
    if (!videoUrl) return
    setPublishing(true)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl }),
      })
      const data = await res.json()
      if (data.success) {
        setStep('published')
      } else {
        setError(data.error || 'Publishing failed. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setImage(null)
    setPreview(null)
    setInstructions('')
    setUgcImageUrl(null)
    setVideoUrl(null)
    setError(null)
    setPublishing(false)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">

        <div className="text-center mb-10">
          <div className="text-5xl mb-4">\ud83c\udfac</div>
          <h1 className="text-4xl font-bold text-white mb-2">UGC Factory</h1>
          <p className="text-slate-400 text-lg">
            Upload a product image \u2192 get a UGC-style video for socials
          </p>
        </div>

        {step === 'upload' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-amber-500 transition-colors bg-slate-900"
            >
              {preview ? (
                <div>
                  <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-xl object-contain mb-2" />
                  <p className="text-slate-500 text-sm">Click to change image</p>
                </div>
              ) : (
                <div className="py-8">
                  <div className="text-4xl mb-3">\ud83d\udcf8</div>
                  <p className="text-slate-300 font-medium">Click to upload product image</p>
                  <p className="text-slate-500 text-sm mt-1">JPG, JPEG, PNG accepted</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" onChange={handleImageChange} className="hidden" />
            </div>

            <textarea
              placeholder="Instructions \u2014 e.g. Make a 10s UGC video of this product in a kitchen scene, vertical format"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />

            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-2xl px-4 py-3 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={!image || !instructions.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:cursor-not-allowed text-black disabled:text-slate-500 font-bold rounded-2xl py-4 text-lg transition-colors"
            >
              Generate UGC Content
            </button>
          </form>
        )}

        {step === 'processing' && (
          <div className="mt-10 text-center">
            <div className="inline-block w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6" />
            <p className="text-slate-200 font-semibold text-lg">{PHASE_MESSAGES[phaseIndex].text}</p>
            <p className="text-slate-500 text-sm mt-2">Total time is ~4 minutes \u2014 please keep this tab open</p>
            <div className="mt-8 flex justify-center gap-2">
              {PHASE_MESSAGES.map((_, i) => (
                <div key={i} className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${i <= phaseIndex ? 'bg-amber-500' : 'bg-slate-700'}`} />
              ))}
            </div>
          </div>
        )}

        {step === 'review' && ugcImageUrl && videoUrl && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-3">UGC Image</h2>
              <img src={ugcImageUrl} alt="Generated UGC image" className="w-full rounded-2xl shadow-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-3">UGC Video</h2>
              <video src={videoUrl} controls className="w-full rounded-2xl shadow-2xl bg-slate-900" />
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-2xl px-4 py-3 text-sm">{error}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 disabled:cursor-not-allowed text-black font-bold rounded-2xl py-4 text-lg transition-colors"
              >
                {publishing ? 'Posting\u2026' : 'Post to Socials'}
              </button>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-2xl py-4 text-lg transition-colors"
              >
                Download Only
              </a>
            </div>
            <button onClick={handleReset} className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors">Start over</button>
          </div>
        )}

        {step === 'published' && (
          <div className="text-center mt-10 space-y-6">
            <div className="text-6xl">\ud83d\ude80</div>
            <h2 className="text-2xl font-bold text-white">Posted to Socials!</h2>
            <p className="text-slate-400">Your UGC video has been uploaded to Instagram, Facebook, YouTube, and X.</p>
            <button onClick={handleReset} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl py-4 text-lg transition-colors">Generate Another</button>
          </div>
        )}

      </div>
    </main>
  )
}
