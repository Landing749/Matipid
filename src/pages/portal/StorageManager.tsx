import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Image, Receipt, Tag, RefreshCw } from 'lucide-react'
import { getCloudinaryResources, cloudinaryUrl } from '@/lib/cloudinary'
import { dbGet } from '@/lib/firebase'
import { PageHeader, Skeleton } from '@/components/ui'

interface CloudinaryAsset {
  public_id: string
  secure_url?: string
  format: string
  bytes: number
  created_at: string
  width: number
  height: number
}

interface FolderStats {
  folder: string
  label: string
  icon: React.ElementType
  assets: CloudinaryAsset[]
  loading: boolean
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function StorageManager() {
  const [folders, setFolders] = useState<FolderStats[]>([
    { folder: 'gallery', label: 'Gallery Images', icon: Image, assets: [], loading: true },
    { folder: 'receipts', label: 'Receipts', icon: Receipt, assets: [], loading: true },
    { folder: 'announcements', label: 'Announcements', icon: Tag, assets: [], loading: true },
    { folder: 'logos', label: 'Logos', icon: Database, assets: [], loading: true },
  ])
  const [dbStats, setDbStats] = useState<{ collection: string; count: number }[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function loadAll() {
    setRefreshing(true)

    // Load Cloudinary assets per folder
    const updated = await Promise.all(
      folders.map(async (f) => {
        try {
          const assets = await getCloudinaryResources(f.folder as 'gallery' | 'events' | 'receipts' | 'announcements' | 'logos')
          return { ...f, assets, loading: false }
        } catch {
          return { ...f, assets: [], loading: false }
        }
      })
    )
    setFolders(updated)

    // Load Firebase collection counts
    const collections = ['events', 'announcements', 'transactions', 'gallery', 'logs', 'audit_records', 'users', 'officers']
    const counts = await Promise.all(
      collections.map(async (col) => {
        const data = await dbGet<Record<string, unknown>>(col)
        return { collection: col, count: data ? Object.keys(data).length : 0 }
      })
    )
    setDbStats(counts)
    setRefreshing(false)
  }

  useEffect(() => { loadAll() }, [])

  const totalCloudinaryAssets = folders.reduce((s, f) => s + f.assets.length, 0)
  const totalCloudinaryBytes = folders.reduce((s, f) => s + f.assets.reduce((ss, a) => ss + (a.bytes ?? 0), 0), 0)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Storage Manager"
        description="Monitor Cloudinary assets and database records."
        action={
          <button onClick={loadAll} disabled={refreshing} className="btn-secondary gap-2">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-2xl font-bold text-surface-100">{totalCloudinaryAssets}</p>
          <p className="text-xs text-surface-500 mt-1 uppercase tracking-wider">Total Assets</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-surface-100">{formatBytes(totalCloudinaryBytes)}</p>
          <p className="text-xs text-surface-500 mt-1 uppercase tracking-wider">Estimated Usage</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-surface-100">{folders.find((f) => f.folder === 'gallery')?.assets.length ?? 0}</p>
          <p className="text-xs text-surface-500 mt-1 uppercase tracking-wider">Gallery Images</p>
        </div>
        <div className="card">
          <p className="text-2xl font-bold text-surface-100">{folders.find((f) => f.folder === 'receipts')?.assets.length ?? 0}</p>
          <p className="text-xs text-surface-500 mt-1 uppercase tracking-wider">Receipts</p>
        </div>
      </div>

      {/* Cloudinary folders */}
      <h2 className="text-sm font-semibold text-surface-300 mb-3 uppercase tracking-wider">Cloudinary Storage</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {folders.map((folder) => {
          const totalBytes = folder.assets.reduce((s, a) => s + (a.bytes ?? 0), 0)
          return (
            <div key={folder.folder} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-600/15 flex items-center justify-center">
                    <folder.icon size={16} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-100">{folder.label}</p>
                    <p className="text-xs text-surface-500">{folder.folder}/</p>
                  </div>
                </div>
                <div className="text-right">
                  {folder.loading ? (
                    <Skeleton className="h-5 w-12" />
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-surface-100">{folder.assets.length}</p>
                      <p className="text-xs text-surface-500">{formatBytes(totalBytes)}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Thumbnail strip */}
              {!folder.loading && folder.assets.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {folder.assets.slice(0, 8).map((asset) => (
                    <a
                      key={asset.public_id}
                      href={cloudinaryUrl(asset.public_id, { width: 200, height: 200, crop: 'fill' })}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0"
                    >
                      <img
                        src={cloudinaryUrl(asset.public_id, { width: 60, height: 60, crop: 'fill', quality: 80 })}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover border border-surface-700 hover:border-brand-600 transition-colors"
                      />
                    </a>
                  ))}
                  {folder.assets.length > 8 && (
                    <div className="w-14 h-14 rounded-lg bg-surface-800 flex items-center justify-center text-xs text-surface-400 flex-shrink-0">
                      +{folder.assets.length - 8}
                    </div>
                  )}
                </div>
              )}

              {!folder.loading && folder.assets.length === 0 && (
                <p className="text-xs text-surface-600 italic">No assets in this folder</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Firebase DB stats */}
      <h2 className="text-sm font-semibold text-surface-300 mb-3 uppercase tracking-wider">Firebase Database</h2>
      <div className="card p-0 overflow-hidden">
        <div className="divide-y divide-surface-800/60">
          {dbStats.map((stat) => (
            <div key={stat.collection} className="flex items-center justify-between px-5 py-3 hover:bg-surface-800/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-500" />
                <span className="text-sm text-surface-200 font-mono">{stat.collection}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full"
                    style={{ width: `${Math.min((stat.count / 100) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-surface-300 w-12 text-right tabular-nums">{stat.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
