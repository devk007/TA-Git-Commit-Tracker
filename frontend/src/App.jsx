import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import ClassListPage from './pages/ClassListPage.jsx';
import ClassDetailPage from './pages/ClassDetailPage.jsx';

const App = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<ClassListPage />} />
      <Route path="/classes/:classId/*" element={<ClassDetailPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
