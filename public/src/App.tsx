import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { SiteLayout } from './components/SiteLayout'
import { ArchivePage } from './pages/ArchivePage'
import { ChapterDetailPage } from './pages/ChapterDetailPage'
import { ChaptersPage } from './pages/ChaptersPage'
import { ExecutiveProfilePage } from './pages/ExecutiveProfilePage'
import { HomePage } from './pages/HomePage'
import { LeadershipPage } from './pages/LeadershipPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PublicDataProvider } from './data/PublicData'

function App() {
  return (
    <PublicDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="chapters" element={<ChaptersPage />} />
            <Route path="chapters/:chapterId" element={<ChapterDetailPage />} />
            <Route path="leadership" element={<LeadershipPage />} />
            <Route path="leadership/:executiveId" element={<ExecutiveProfilePage />} />
            <Route path="history" element={<ArchivePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PublicDataProvider>
  )
}

export default App
