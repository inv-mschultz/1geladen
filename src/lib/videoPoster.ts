/**
 * Grabs a still from a video file in the browser, for the gallery grid. Best
 * effort: a format this browser cannot decode (HEVC on some Androids) simply
 * gets no poster, and the grid falls back to the video's own first frame.
 */
export async function captureVideoPoster(
  file: File,
  { maxDim = 800, quality = 0.8, timeoutMs = 8000 } = {},
): Promise<File | null> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
      video.addEventListener('error', () => reject(new Error('decode')), { once: true })
      video.addEventListener(
        'loadeddata',
        () => {
          // A frame a moment in avoids the black first frame many phones write.
          video.currentTime = Math.min(0.5, (video.duration || 0) / 2)
        },
        { once: true },
      )
      video.addEventListener(
        'seeked',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
      // iOS ignores preload on detached elements unless asked explicitly.
      video.load()
    })

    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx || !canvas.width || !canvas.height) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    return blob ? new File([blob], 'poster.jpg', { type: 'image/jpeg' }) : null
  } catch {
    return null
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
