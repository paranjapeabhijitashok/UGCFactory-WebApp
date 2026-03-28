'use client'

import { useState, useRef, useEffect } from 'react'

type Step = 'upload' | 'processing' | 'review' | 'published'

const STEP_ORDER: Step[] = ['upload', 'processing', 'review']

const PHASE_MESSAGES = [
  { at: 0,   text: 'Analysing your product image\u2026' },
  { at: 15,  text: 'Generating UGC creative\u2026' },
  { at: 45,  text: 'Writing video script\u2026' },
  { at: 60,  text: 'Rendering your video \u2014 this takes ~3 min' },
  { at: 180, text: 'Almost there\u2026' },
]

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" className={className}>
      <polygon points="12,2.5 14.8,9.3 22,10.2 16.8,15.1 18.3,22 12,18.5 5.7,22 7.2,15.1 2,10.2 9.2,9.3" />
    </svg>
  )
}

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

  const currentStepIndex = STEP_ORDER.indexOf(step)

  return (
    <main className="min-h-screen bg-[#0C1928] flex flex-col font-[family-name:var(--font-poppins)]">

      {/* Header */}
      <header className="border-b border-[#1A2E45] px-6 py-4 flex-shrink-0">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <StarIcon className="w-6 h-6 text-[#C46B3A] flex-shrink-0" />
          <div className="w-px h-6 bg-[#C46B3A]/30 flex-shrink-0" />
          <div className="leading-none">
            <span className="text-white font-[family-name:var(--font-lora)] text-[15px] font-medium">Abhijit&apos;s</span>
            <span className="block text-[#3D4F63] text-[8px] tracking-[0.22em] uppercase mt-0.5">Consulting</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 max-w-xl mx-auto w-full px-6 py-10">

        {/* Hero — shown on upload step */}
        {step === 'upload' && (
          <div className="mb-8">
            <p className="text-[#C46B3A] text-[10px] tracking-[0.25em] uppercase font-medium mb-3">
              UGC Content Studio
            </p>
            <h1 className="font-[family-name:var(--font-lora)] text-[28px] font-semibold text-white leading-snug mb-3">
              Product to Video,<br />in Minutes.
            </h1>
            <p className="text-[#3D4F63] text-sm leading-relaxed">
              Upload a product image, add your brief, and receive a publish-ready UGC video \u2014 automatically distributed across Instagram, Facebook, YouTube, and X.
            </p>
          </div>
        )}

        {/* Step indicator — upload / processing / review */}
        {step !== 'published' && (
          <div className="flex items-center gap-2 mb-8">
            {STEP_ORDER.map((s, i) => {
              const isPast = i < currentStepIndex
              const isCurrent = i === currentStepIndex
              const labels = ['Brief', 'Generate', 'Review']
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold transition-colors ${
                    isCurrent ? 'bg-[#C46B3A] text-white' :
                    isPast    ? 'bg-[#C46B3A]/25 text-[#C46B3A]' :
                                'bg-[#1A2E45] text-[#3D4F63]'
                  }`}>{i + 1}</div>
                  <span className={`text-xs ${isCurrent ? 'text-white' : 'text-[#3D4F63]'}`}>
                    {labels[i]}
                  </span>
                  {i < STEP_ORDER.length - 1 && (
                    <div className="w-6 h-px bg-[#1A2E45] mx-1" />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* \u2500\u2500 Step 1: Brief / Upload \u2500\u2500 */}
        {step === 'upload' && (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Image drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border border-dashed border-[#C46B3A]/35 rounded-lg p-6 text-center hover:border-[#C46B3A]/70 hover:bg-[#1A2E45]/30 transition-all bg-[#1A2E45]/15"
            >
              {preview ? (
                <div>
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-52 mx-auto rounded object-contain mb-3"
                  />
                  <p className="text-[#3D4F63] text-xs">Click to change image</p>
                </div>
              ) : (
                <div className="py-6">
                  <StarIcon className="w-9 h-9 text-[#C46B3A]/40 mx-auto mb-3" />
                  <p className="text-white text-sm font-medium mb-1">Upload product image</p>
                  <p className="text-[#3D4F63] text-xs">JPG, JPEG, PNG accepted</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Brief textarea */}
            <div>
              <label className="block text-[#3D4F63] text-[10px] tracking-[0.18em] uppercase mb-2">
                Creative Brief
              </label>
              <textarea
                placeholder="e.g. 10-second UGC video for this product in a kitchen scene, vertical format, casual tone"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="w-full bg-[#1A2E45]/30 border border-[#1A2E45] rounded-lg px-4 py-3 text-white placeholder-[#3D4F63]/60 text-sm focus:outline-none focus:border-[#C46B3A]/50 transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="border border-red-800/40 bg-red-950/15 text-red-400 rounded-lg px-4 py-3 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!image || !instructions.trim()}
              className="w-full bg-[#C46B3A] hover:bg-[#D4794A] disabled:bg-[#1A2E45] disabled:cursor-not-allowed text-white disabled:text-[#3D4F63] font-semibold rounded-lg py-3.5 text-sm tracking-wide transition-colors"
            >
              Generate Content
            </button>

            <p className="text-center text-[#3D4F63] text-xs">
              Generation takes approximately 4 minutes
            </p>
          </form>
        )}

        {/* \u2500\u2500 Step 2: Processing \u2500\u2500 */}
        {step === 'processing' && (
          <div className="py-14 text-center">
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="w-14 h-14 border-[1.5px] border-[#C46B3A] border-t-transparent rounded-full animate-spin" />
              <StarIcon className="absolute w-5 h-5 text-[#C46B3A]" />
            </div>
            <h2 className="font-[family-name:var(--font-lora)] text-xl text-white mb-2">
              {PHASE_MESSAGES[phaseIndex].text}
            </h2>
            <p className="text-[#3D4F63] text-sm mb-8">
              Keep this tab open \u2014 your content will be ready shortly.
            </p>
            <div className="flex justify-center gap-1.5">
              {PHASE_MESSAGES.map((_, i) => (
                <div
                  key={i}
                  className={`h-0.5 rounded-full transition-all duration-700 ${
                    i <= phaseIndex ? 'w-8 bg-[#C46B3A]' : 'w-4 bg-[#1A2E45]'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* \u2500\u2500 Step 3: Review \u2500\u2500 */}
        {step === 'review' && ugcImageUrl && videoUrl && (
          <div className="space-y-5">

            <div className="rounded-lg overflow-hidden border border-[#1A2E45] bg-[#1A2E45]/20">
              <div className="px-4 py-2.5 border-b border-[#1A2E45]">
                <p className="text-[#3D4F63] text-[10px] tracking-[0.18em] uppercase">UGC Image</p>
              </div>
              <img src={ugcImageUrl} alt="Generated UGC" className="w-full" />
            </div>

            <div className="rounded-lg overflow-hidden border border-[#1A2E45] bg-[#1A2E45]/20">
              <div className="px-4 py-2.5 border-b border-[#1A2E45]">
                <p className="text-[#3D4F63] text-[10px] tracking-[0.18em] uppercase">UGC Video</p>
              </div>
              <video src={videoUrl} controls className="w-full bg-[#0C1928]" />
            </div>

            {error && (
              <div className="border border-red-800/40 bg-red-950/15 text-red-400 rounded-lg px-4 py-3 text-xs">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 bg-[#C46B3A] hover:bg-[#D4794A] disabled:bg-[#C46B3A]/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3.5 text-sm tracking-wide transition-colors"
              >
                {publishing ? 'Publishing\u2026' : 'Publish to All Platforms'}
              </button>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center border border-[#1A2E45] hover:border-[#C46B3A]/35 text-white text-sm font-medium rounded-lg py-3.5 transition-colors"
              >
                Download Only
              </a>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-[#3D4F63] hover:text-white text-xs py-2 transition-colors"
            >
              Start a new brief
            </button>
          </div>
        )}

        {/* \u2500\u2500 Step 4: Published \u2500\u2500 */}
        {step === 'published' && (
          <div className="py-16 text-center">
            <div className="w-14 h-14 border border-[#C46B3A]/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <StarIcon className="w-7 h-7 text-[#C46B3A]" />
            </div>
            <h2 className="font-[family-name:var(--font-lora)] text-2xl text-white mb-3">
              Content Live.
            </h2>
            <p className="text-[#3D4F63] text-sm mb-8 max-w-xs mx-auto leading-relaxed">
              Your UGC video has been published to Instagram, Facebook, YouTube, and X.
            </p>
            <button
              onClick={handleReset}
              className="bg-[#C46B3A] hover:bg-[#D4794A] text-white font-semibold rounded-lg px-8 py-3.5 text-sm tracking-wide transition-colors"
            >
              Create Another
            </button>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="border-t border-[#1A2E45] px-6 py-4 flex-shrink-0">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <p className="text-[#3D4F63] text-xs">Smart systems. Real results. 24/7.</p>
          <p className="text-[#3D4F63] text-xs">abhijitparanjape.in</p>
        </div>
      </footer>

    </main>
  )
}
