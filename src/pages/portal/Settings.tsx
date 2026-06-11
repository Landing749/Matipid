import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Upload, Globe, Palette, Info, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { dbGet, dbSet, logActivity } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, Spinner } from '@/components/ui'

interface SiteSettings {
  siteTitle: string
  motto: string
  description: string
  footerText: string
  maintenanceMode: boolean
  section: string
  gradeLevel: string
  schoolYear: string
  socialLinks: {
    facebook?: string
    twitter?: string
    instagram?: string
  }
  logoUrl?: string
  bannerImage?: string
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: 'Section MATIPID',
  motto: 'Transparent. Accountable. United.',
  description: 'Our official section portal.',
  footerText: '© 2025 Section MATIPID. All rights reserved.',
  maintenanceMode: false,
  section: 'MATIPID',
  gradeLevel: 'Grade 8',
  schoolYear: '2024-2025',
  socialLinks: {},
}

export function Settings() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm<SiteSettings>({
    defaultValues: DEFAULT_SETTINGS,
  })

  const maintenance = watch('maintenanceMode')

  useEffect(() => {
    dbGet<SiteSettings>('settings').then((data) => {
      if (data) reset({ ...DEFAULT_SETTINGS, ...data })
    }).finally(() => setLoading(false))
  }, [reset])

  async function onSave(values: SiteSettings) {
    if (!user || !profile) return
    setSaving(true)
    try {
      const prev = await dbGet<SiteSettings>('settings')
      await dbSet('settings', values)
      await logActivity({
        userUid: user.uid,
        userEmail: profile.email,
        role: profile.role,
        action: 'UPDATE_SETTINGS',
        targetResource: 'settings',
        previousValue: prev,
        newValue: values,
      })
      toast.success('Settings saved.')
      reset(values)
    } catch {
      toast.error('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const res = await uploadImage(file, 'logos')
      setValue('logoUrl', res.secure_url, { shouldDirty: true })
      toast.success('Logo uploaded.')
    } catch { toast.error('Upload failed.') }
    finally { setUploadingLogo(false) }
    e.target.value = ''
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    try {
      const res = await uploadImage(file, 'announcements')
      setValue('bannerImage', res.secure_url, { shouldDirty: true })
      toast.success('Banner uploaded.')
    } catch { toast.error('Upload failed.') }
    finally { setUploadingBanner(false) }
    e.target.value = ''
  }

  const logoUrl = watch('logoUrl')
  const bannerImage = watch('bannerImage')

  if (loading) return <div className="py-12 text-center text-surface-500 text-sm">Loading settings…</div>

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Settings"
        description="Configure site-wide preferences and content."
        action={
          <button onClick={handleSubmit(onSave)} disabled={saving || !isDirty} className="btn-primary">
            {saving ? <Spinner size={16} /> : <><Save size={16} /> Save Changes</>}
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        {/* Section info */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Info size={16} className="text-brand-400" />
            <h2 className="text-sm font-semibold text-surface-200">Section Information</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Site Title</label>
              <input className="input" {...register('siteTitle')} />
            </div>
            <div>
              <label className="label">Section Name</label>
              <input className="input" {...register('section')} />
            </div>
            <div>
              <label className="label">Grade Level</label>
              <input className="input" {...register('gradeLevel')} />
            </div>
            <div>
              <label className="label">School Year</label>
              <input className="input" {...register('schoolYear')} />
            </div>
            <div className="col-span-2">
              <label className="label">Motto</label>
              <input className="input" {...register('motto')} />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input h-20 resize-none" {...register('description')} />
            </div>
            <div className="col-span-2">
              <label className="label">Footer Text</label>
              <input className="input" {...register('footerText')} />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={16} className="text-brand-400" />
            <h2 className="text-sm font-semibold text-surface-200">Branding</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="label">Section Logo</label>
              <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 border-dashed cursor-pointer hover:border-brand-600/50 transition-all">
                {uploadingLogo ? <Spinner size={16} /> : <Upload size={16} className="text-surface-400 flex-shrink-0" />}
                <span className="text-sm text-surface-400 truncate">{logoUrl ? 'Logo uploaded ✓' : 'Upload logo image'}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
              </label>
              {logoUrl && <img src={logoUrl} alt="Logo" className="mt-2 h-16 w-16 rounded-xl object-cover border border-surface-700" />}
            </div>
            <div>
              <label className="label">Homepage Banner</label>
              <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 border-dashed cursor-pointer hover:border-brand-600/50 transition-all">
                {uploadingBanner ? <Spinner size={16} /> : <Upload size={16} className="text-surface-400 flex-shrink-0" />}
                <span className="text-sm text-surface-400 truncate">{bannerImage ? 'Banner uploaded ✓' : 'Upload banner image'}</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleBannerUpload} />
              </label>
              {bannerImage && <img src={bannerImage} alt="Banner" className="mt-2 h-16 w-full rounded-xl object-cover border border-surface-700" />}
            </div>
          </div>
        </div>

        {/* Social links */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-brand-400" />
            <h2 className="text-sm font-semibold text-surface-200">Social Links</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {(['facebook', 'twitter', 'instagram'] as const).map((platform) => (
              <div key={platform}>
                <label className="label capitalize">{platform}</label>
                <input className="input" placeholder={`https://${platform}.com/...`} {...register(`socialLinks.${platform}`)} />
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance mode */}
        <div className={`card border ${maintenance ? 'border-red-600/40 bg-red-900/10' : 'border-surface-800/60'}`}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className={maintenance ? 'text-red-400' : 'text-surface-400'} />
            <h2 className="text-sm font-semibold text-surface-200">Maintenance Mode</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-300">When enabled, the public site shows a maintenance page.</p>
              <p className="text-xs text-surface-500 mt-1">Officers can still access the portal.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" {...register('maintenanceMode')} />
              <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-red-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>
          {maintenance && (
            <p className="text-xs text-red-400 mt-3 font-medium">⚠️ Public site is currently in maintenance mode.</p>
          )}
        </div>
      </form>
    </motion.div>
  )
}
