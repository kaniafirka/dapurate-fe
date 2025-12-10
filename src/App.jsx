import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import SamplePage from './SamplePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/sample/:id" element={<SamplePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
