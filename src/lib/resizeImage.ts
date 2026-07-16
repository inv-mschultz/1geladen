/**
 * Downscale + recompress an image in the browser before upload, so photos
 * stay well under the Server Action / Vercel body limits (and don't waste
 * storage). GIFs and non-images pass through untouched.
 */
export async function resizeImage(
  file: File,
  { maxDim = 2000, quality = 0.82 }: { maxDim?: number; quality?: number } = {},
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  try {
    // `from-image` applies EXIF orientation so portrait photos aren't sideways
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))

    // Already small enough — keep the original bytes
    if (scale === 1 && file.size <= 1_500_000) {
      bitmap.close()
      return file
    }

    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob || blob.size >= file.size) return file // never upsize the payload

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file // any failure → upload the original
  }
}
