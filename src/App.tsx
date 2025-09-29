import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CityPackages from './pages/CityPackages';
import UserManagement from './pages/UserManagement';
import CourierManagement from './pages/CourierManagement';
import FinanceManagement from './pages/FinanceManagement';
import TrackingPage from './pages/TrackingPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/city-packages" element={<CityPackages />} />
          <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/couriers" element={<CourierManagement />} />
        <Route path="/admin/finance" element={<FinanceManagement />} />
        <Route path="/admin/tracking" element={<TrackingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
