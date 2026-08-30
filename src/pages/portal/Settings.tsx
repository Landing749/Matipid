import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Save, Upload, Globe, Palette, Info, AlertTriangle, RotateCcw, X, Image as ImageIcon, Music2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { dbGet, dbSet, logActivity } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader, Spinner } from '@/components/ui'
import { Logo } from '@/components/Logo'
import defaultLogo from '@/assets/logo-mark.png'

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
  anthemAudioUrl?: string
  anthemEmbedUrl?: string
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: 'easeOut' as const },
  }),
}

export function Settings() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [dragLogo, setDragLogo] = useState(false)
  const [dragBanner, setDragBanner] = useState(false)

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
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    } catch {
      toast.error('Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadLogoFile(file: File) {
    setUploadingLogo(true)
    try {
      const res = await uploadImage(file, 'logos')
      setValue('logoUrl', res.secure_url, { shouldDirty: true })
      toast.success('Logo uploaded.')
    } catch { toast.error('Upload failed.') }
    finally { setUploadingLogo(false) }
  }

  async function uploadBannerFile(file: File) {
    setUploadingBanner(true)
    try {
      const res = await uploadImage(file, 'announcements')
      setValue('bannerImage', res.secure_url, { shouldDirty: true })
      toast.success('Banner uploaded.')
    } catch { toast.error('Upload failed.') }
    finally { setUploadingBanner(false) }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadLogoFile(file)
    e.target.value = ''
  }

  function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadBannerFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>, kind: 'logo' | 'banner') {
    e.preventDefault()
    kind === 'logo' ? setDragLogo(false) : setDragBanner(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    kind === 'logo' ? uploadLogoFile(file) : uploadBannerFile(file)
  }

  function resetLogo() {
    setValue('logoUrl', '', { shouldDirty: true })
    toast.info('Reverted to default MATIPID logo.')
  }

  const logoUrl = watch('logoUrl')
  const bannerImage = watch('bannerImage')

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-surface-500">
        <Spinner size={24} />
        <p className="text-sm">Loading settings…</p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Settings"
        description="Configure site-wide preferences and content."
        action={
          <motion.button
            onClick={handleSubmit(onSave)}
            disabled={saving || !isDirty}
            className="btn-primary"
            whileHover={!saving && isDirty ? { scale: 1.03 } : {}}
            whileTap={!saving && isDirty ? { scale: 0.97 } : {}}
          >
            {saving ? <Spinner size={16} /> : <><Save size={16} /> Save Changes</>}
          </motion.button>
        }
      />

      <form onSubmit={handleSubmit(onSave)} className="space-y-6 pb-24 sm:pb-6">
        {/* Section info */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="card-hover">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-tile bg-brand-600/15 text-brand-600">
              <Info size={16} />
            </div>
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
        </motion.div>

        {/* Branding */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="card-hover">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-tile bg-gold-500/15 text-gold-700">
              <Palette size={16} />
            </div>
            <h2 className="text-sm font-semibold text-surface-200">Branding</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Logo */}
            <div>
              <label className="label">Section Logo</label>
              <div className="flex items-center gap-4">
                {/* Live preview */}
                <motion.div
                  key={logoUrl || 'default'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="relative flex-shrink-0"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-surface-700/60 bg-gradient-to-br from-brand-500/15 via-surface-900 to-brand-900/30 flex items-center justify-center glow-ring">
                    <img
                      src={logoUrl || defaultLogo}
                      alt="Section logo preview"
                      className="w-[70%] h-[70%] object-contain"
                    />
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={resetLogo}
                      title="Revert to default logo"
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-surface-400 hover:text-red-600 hover:border-red-500/40 transition-colors shadow-md"
                    >
                      <X size={12} />
                    </button>
                  )}
                </motion.div>

                {/* Upload zone */}
                <div className="flex-1 min-w-0">
                  <label
                    className={`upload-zone ${dragLogo ? 'dragging' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragLogo(true) }}
                    onDragLeave={() => setDragLogo(false)}
                    onDrop={(e) => handleDrop(e, 'logo')}
                  >
                    {uploadingLogo ? <Spinner size={16} /> : <Upload size={16} className="text-surface-400 flex-shrink-0" />}
                    <span className="text-sm text-surface-400 truncate">
                      {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace logo image' : 'Drop image or click to upload'}
                    </span>
                    <input type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
                  </label>
                  <p className="text-xs text-surface-500 mt-2">
                    {logoUrl
                      ? 'Custom logo active across the portal & public site.'
                      : 'Using the default MATIPID mark. Upload a square image (PNG/SVG) for best results.'}
                  </p>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={resetLogo}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-700 transition-colors"
                    >
                      <RotateCcw size={12} /> Reset to default logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Banner */}
            <div>
              <label className="label">Homepage Banner</label>
              <label
                className={`upload-zone ${dragBanner ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragBanner(true) }}
                onDragLeave={() => setDragBanner(false)}
                onDrop={(e) => handleDrop(e, 'banner')}
              >
                {uploadingBanner ? <Spinner size={16} /> : <ImageIcon size={16} className="text-surface-400 flex-shrink-0" />}
                <span className="text-sm text-surface-400 truncate">
                  {uploadingBanner ? 'Uploading…' : bannerImage ? 'Replace banner image' : 'Drop image or click to upload'}
                </span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleBannerUpload} />
              </label>
              {bannerImage ? (
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={bannerImage}
                  alt="Banner"
                  className="mt-2 h-24 w-full rounded-xl object-cover border border-surface-700"
                />
              ) : (
                <div className="mt-2 h-24 w-full rounded-xl border border-dashed border-surface-800 flex items-center justify-center text-xs text-surface-600">
                  No banner uploaded
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Live Preview */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="card-hover">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-tile bg-brand-600/15 text-brand-600">
              <SettingsIcon size={16} />
            </div>
            <h2 className="text-sm font-semibold text-surface-200">Preview</h2>
          </div>
          <div className="rounded-xl border border-surface-800/60 bg-surface-950/60 p-4 flex items-center gap-3">
            <Logo size={40} animated={false} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-surface-100 truncate">{watch('siteTitle') || 'Section MATIPID'}</p>
              <p className="text-xs text-surface-500 truncate">{watch('motto') || 'Transparent. Accountable. United.'}</p>
            </div>
          </div>
        </motion.div>

        {/* Social links */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="card-hover">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-tile bg-emerald-500/15 text-emerald-600">
              <Globe size={16} />
            </div>
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
        </motion.div>

        {/* Section anthem */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3.5} className="card-hover">
          <div className="flex items-center gap-2 mb-4">
            <div className="icon-tile bg-brand-600/15 text-brand-600">
              <Music2 size={16} />
            </div>
            <h2 className="text-sm font-semibold text-surface-200">Section Anthem</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Playlist / video embed URL</label>
              <input className="input" placeholder="https://youtube.com/watch?v=... or https://open.spotify.com/playlist/..." {...register('anthemEmbedUrl')} />
              <p className="text-xs text-surface-500 mt-1">Shown as a video/playlist embed on the Home and About pages. Leave blank to hide.</p>
            </div>
            <div>
              <label className="label">Short anthem clip (.mp3 URL)</label>
              <input className="input" placeholder="https://.../anthem.mp3" {...register('anthemAudioUrl')} />
              <p className="text-xs text-surface-500 mt-1">
                Plays once, quietly, the moment a visitor accepts the cookie notice. A visible pause/mute
                control always appears alongside it. Leave blank to disable. Host the file yourself
                (e.g. via Cloudinary) — keep it short and make sure you have the rights to use it.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Maintenance mode */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="show" custom={4}
          className={`card border transition-colors duration-300 ${maintenance ? 'border-red-600/40 bg-red-900/10' : 'border-surface-800/60'}`}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className={`icon-tile ${maintenance ? 'bg-red-500/15 text-red-600' : 'bg-surface-700/30 text-surface-400'}`}>
              <AlertTriangle size={16} />
            </div>
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
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-xs text-red-600 mt-3 font-medium"
            >
              ⚠️ Public site is currently in maintenance mode.
            </motion.p>
          )}
        </motion.div>
      </form>

      {/* Sticky save bar (mobile) */}
      {isDirty && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 sm:hidden z-40"
        >
          <button onClick={handleSubmit(onSave)} disabled={saving} className="btn-primary w-full shadow-2xl">
            {saving ? <Spinner size={16} /> : <><Save size={16} /> Save Changes</>}
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
