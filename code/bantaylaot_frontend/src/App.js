import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminSetup from './AdminSetup';
import MunicipalDashboard from './pages/MunicipalDashboard';
import CentralDashboard from './pages/CentralDashboard';
import ResearcherDashboard from './pages/ResearcherDashboard';
import ManageUsers from './pages/ManageUsers';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('jwt_token');
    return token ? children : <Navigate to="/login" replace />;
};

const HomeRedirect = () => {
    const role = localStorage.getItem('role');
    if (role === 'central_admin') return <Navigate to="/central" replace />;
    if (role === 'researcher')    return <Navigate to="/researcher" replace />;
    return <Navigate to="/municipal" replace />;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/setup"  element={<AdminSetup />} />
                <Route path="/login"  element={<Login />} />
                <Route path="/home"   element={<PrivateRoute><HomeRedirect /></PrivateRoute>} />
                <Route path="/municipal" element={
                    <PrivateRoute><MunicipalDashboard /></PrivateRoute>
                } />
                <Route path="/central" element={
                    <PrivateRoute><CentralDashboard /></PrivateRoute>
                } />
                <Route path="/researcher" element={
                    <PrivateRoute><ResearcherDashboard /></PrivateRoute>
                } />
                <Route path="/manage-users" element={
                    <PrivateRoute><ManageUsers /></PrivateRoute>
                } />
                <Route path="/" element={<Navigate to="/home" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
