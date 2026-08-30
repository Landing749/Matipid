const CLOUD_NAME = 'damr6r9op'
const UPLOAD_PRESET = 'org-resources'

export type CloudinaryFolder = 'gallery' | 'events' | 'receipts' | 'announcements' | 'logos' | 'timeline' | 'submissions'

export interface CloudinaryResult {
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
  bytes: number
  created_at: string
}

export async function uploadImage(
  file: File,
  folder: CloudinaryFolder,
  onProgress?: (pct: number) => void
): Promise<CloudinaryResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryResult)
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(formData)
  })
}

export function cloudinaryUrl(
  publicId: string,
  opts: {
    width?: number
    height?: number
    crop?: string
    quality?: string | number
    format?: string
  } = {}
) {
  const transforms: string[] = []
  if (opts.width) transforms.push(`w_${opts.width}`)
  if (opts.height) transforms.push(`h_${opts.height}`)
  if (opts.crop) transforms.push(`c_${opts.crop}`)
  if (opts.quality) transforms.push(`q_${opts.quality}`)
  if (opts.format) transforms.push(`f_${opts.format}`)

  const t = transforms.length ? transforms.join(',') + '/' : ''
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${t}${publicId}`
}

export async function getCloudinaryResources(folder: CloudinaryFolder) {
  try {
    const res = await fetch(
      `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${folder}.json`
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.resources || []
  } catch {
    return []
  }
}
