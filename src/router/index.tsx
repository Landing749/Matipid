import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RouteLoading } from '@/components/layout/RouteLoading'

// Public pages — kept as eager imports so the site visitors actually land on
// (Home, Announcements, Transparency, etc.) paints immediately with no
// Suspense fallback flicker.
import { Home } from '@/pages/public/Home'
import { Announcements } from '@/pages/public/Announcements'
import { AnnouncementDetail } from '@/pages/public/AnnouncementDetail'
import { FinancialTransparency } from '@/pages/public/FinancialTransparency'
import { YearInReview } from '@/pages/public/YearInReview'
import { Suggestions } from '@/pages/public/Suggestions'
import { Events, Gallery, Timeline, OfficerList, About } from '@/pages/public/PublicPages'
import { EventDetail } from '@/pages/public/EventDetail'
import { Privacy } from '@/pages/public/Privacy'
import { Terms } from '@/pages/public/Terms'
import { SharePhotos } from '@/pages/public/SharePhotos'
import { NotFound } from '@/pages/public/NotFound'

// Auth — lazy: not needed until someone actually visits /login.
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })))

// Portal pages — lazy: this is the admin tooling (recharts, xlsx/pdf export,
// 20+ manager pages) that public visitors have no reason to download just to
// read the homepage. Only fetched once someone is actually in the portal.
const Dashboard = lazy(() => import('@/pages/portal/Dashboard').then((m) => ({ default: m.Dashboard })))
const Finance = lazy(() => import('@/pages/portal/Finance').then((m) => ({ default: m.Finance })))
const Audit = lazy(() => import('@/pages/portal/Audit').then((m) => ({ default: m.Audit })))
const ActivityLog = lazy(() => import('@/pages/portal/ActivityLog').then((m) => ({ default: m.ActivityLog })))
const VersionHistory = lazy(() => import('@/pages/portal/VersionHistory').then((m) => ({ default: m.VersionHistory })))
const Backup = lazy(() => import('@/pages/portal/Backup').then((m) => ({ default: m.Backup })))
const SystemHealth = lazy(() => import('@/pages/portal/SystemHealth').then((m) => ({ default: m.SystemHealth })))
const Analytics = lazy(() => import('@/pages/portal/Analytics').then((m) => ({ default: m.Analytics })))
const StorageManager = lazy(() => import('@/pages/portal/StorageManager').then((m) => ({ default: m.StorageManager })))
const UserManagement = lazy(() => import('@/pages/portal/UserManagement').then((m) => ({ default: m.UserManagement })))
const Settings = lazy(() => import('@/pages/portal/Settings').then((m) => ({ default: m.Settings })))
const SearchPage = lazy(() => import('@/pages/portal/SearchPage').then((m) => ({ default: m.SearchPage })))
const AnnouncementsManager = lazy(() => import('@/pages/portal/AnnouncementsManager').then((m) => ({ default: m.AnnouncementsManager })))
const SuggestionsManager = lazy(() => import('@/pages/portal/SuggestionsManager').then((m) => ({ default: m.SuggestionsManager })))
const GalleryManager = lazy(() => import('@/pages/portal/GalleryManager').then((m) => ({ default: m.GalleryManager })))
const OfficersManager = lazy(() => import('@/pages/portal/OfficersManager').then((m) => ({ default: m.OfficersManager })))
const EventsManager = lazy(() => import('@/pages/portal/EventsManager').then((m) => ({ default: m.EventsManager })))
const PhotoSubmissionsManager = lazy(() => import('@/pages/portal/PhotoSubmissionsManager').then((m) => ({ default: m.PhotoSubmissionsManager })))
const BudgetTracker = lazy(() => import('@/pages/portal/BudgetTracker').then((m) => ({ default: m.BudgetTracker })))
const CalendarView = lazy(() => import('@/pages/portal/CalendarView').then((m) => ({ default: m.CalendarView })))
const MembersDirectory = lazy(() => import('@/pages/portal/MembersDirectory').then((m) => ({ default: m.MembersDirectory })))
const TimelineManager = lazy(() => import('@/pages/portal/TimelineManager').then((m) => ({ default: m.TimelineManager })))

export function AppRouter() {
  return (
    // basename matches Vite's `base` (VITE_BASE_URL in the deploy workflow),
    // so this works both at the domain root and under a GitHub Pages
    // project-page subpath like /matipid/. Real paths (not /#/hashes) are
    // what make per-page OG previews for shared links possible — see
    // public/404.html for the GitHub Pages deep-link fallback this needs.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/announcements/:id" element={<AnnouncementDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/finances" element={<FinancialTransparency />} />
          <Route path="/year-in-review" element={<YearInReview />} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/officers" element={<OfficerList />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/share-photos" element={<SharePhotos />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Login — lazy-loaded, wrapped in its own Suspense boundary since
            it sits outside PortalLayout's shared one. */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<RouteLoading />}>
              <Login />
            </Suspense>
          }
        />

        {/* Portal routes */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/portal/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="announcements" element={<AnnouncementsManager />} />
          <Route path="events" element={<EventsManager />} />
          <Route path="gallery" element={<GalleryManager />} />
          <Route path="photo-submissions" element={<PhotoSubmissionsManager />} />
          <Route path="suggestions" element={<SuggestionsManager />} />
          <Route path="officers" element={<OfficersManager />} />
          <Route path="finance" element={<ProtectedRoute allowedRoles={['admin', 'treasurer', 'auditor']}><Finance /></ProtectedRoute>} />
          <Route path="budget" element={<ProtectedRoute allowedRoles={['admin', 'treasurer', 'auditor']}><BudgetTracker /></ProtectedRoute>} />
          <Route path="audit" element={<ProtectedRoute allowedRoles={['admin', 'auditor']}><Audit /></ProtectedRoute>} />
          <Route path="logs" element={<ActivityLog />} />
          <Route path="versions" element={<ProtectedRoute allowedRoles={['admin']}><VersionHistory /></ProtectedRoute>} />
          <Route path="backup" element={<ProtectedRoute allowedRoles={['admin']}><Backup /></ProtectedRoute>} />
          <Route path="health" element={<ProtectedRoute allowedRoles={['admin']}><SystemHealth /></ProtectedRoute>} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="storage" element={<ProtectedRoute allowedRoles={['admin']}><StorageManager /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
          <Route path="search" element={<SearchPage />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="members" element={<MembersDirectory />} />
          <Route path="timeline" element={<TimelineManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
