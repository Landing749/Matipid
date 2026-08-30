import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { ProtectedRoute } from './ProtectedRoute'

// Public pages
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

// Auth
import { Login } from '@/pages/Login'

// Portal pages
import { Dashboard } from '@/pages/portal/Dashboard'
import { Finance } from '@/pages/portal/Finance'
import { Audit } from '@/pages/portal/Audit'
import { ActivityLog } from '@/pages/portal/ActivityLog'
import { VersionHistory } from '@/pages/portal/VersionHistory'
import { Backup } from '@/pages/portal/Backup'
import { SystemHealth } from '@/pages/portal/SystemHealth'
import { Analytics } from '@/pages/portal/Analytics'
import { StorageManager } from '@/pages/portal/StorageManager'
import { UserManagement } from '@/pages/portal/UserManagement'
import { Settings } from '@/pages/portal/Settings'
import { SearchPage } from '@/pages/portal/SearchPage'
import { AnnouncementsManager } from '@/pages/portal/AnnouncementsManager'
import { SuggestionsManager } from '@/pages/portal/SuggestionsManager'
import { GalleryManager } from '@/pages/portal/GalleryManager'
import { OfficersManager } from '@/pages/portal/OfficersManager'
import { EventsManager } from '@/pages/portal/EventsManager'
import { PhotoSubmissionsManager } from '@/pages/portal/PhotoSubmissionsManager'
import { BudgetTracker } from '@/pages/portal/BudgetTracker'
import { CalendarView } from '@/pages/portal/CalendarView'
import { MembersDirectory } from '@/pages/portal/MembersDirectory'
import { TimelineManager } from '@/pages/portal/TimelineManager'

export function AppRouter() {
  return (
    <HashRouter>
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

        {/* Login */}
        <Route path="/login" element={<Login />} />

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
    </HashRouter>
  )
}
