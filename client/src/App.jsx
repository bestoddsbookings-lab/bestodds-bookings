import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Resend from './pages/Resend';
import Dashboard from './pages/Dashboard';
import Offers from './pages/Offers';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Purchases from './pages/Purchases';
import Support from './pages/Support';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/index.css';

const App = () => {
    return (
        <Router>
            <div>
                <Header />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/resend" element={<Resend />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/offers" element={<Offers />} />
                    <Route path="/admin" element={<AdminLogin />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                </Routes>
                <Footer />
            </div>
        </Router>
    );
};

export default App;