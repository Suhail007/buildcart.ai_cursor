import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout Components
import Layout from './components/Layout/Layout';
import DashboardLayout from './components/Layout/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';
import Stores from './pages/dashboard/Stores';
import StoreBuilder from './pages/dashboard/StoreBuilder';
import Products from './pages/dashboard/Products';
import Orders from './pages/dashboard/Orders';
import Customers from './pages/dashboard/Customers';
import Analytics from './pages/dashboard/Analytics';
import Settings from './pages/dashboard/Settings';

// Landing Pages
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Features from './pages/Features';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public Landing Pages */}
        <Route path="/" element={<Layout><Landing /></Layout>} />
        <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
        <Route path="/features" element={<Layout><Features /></Layout>} />
        
        {/* Auth Pages */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/stores" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Stores />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/store-builder" element={
          <ProtectedRoute>
            <DashboardLayout>
              <StoreBuilder />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/products" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Products />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/orders" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Orders />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/customers" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Customers />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Analytics />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 