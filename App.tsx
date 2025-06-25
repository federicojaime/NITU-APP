import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage';
import { SuperAdminDashboardPage }  from './pages/SuperAdminDashboardPage'; 
import { ClientPortalPage } from './pages/ClientPortalPage'; 
import { ClientLoginPage } from './pages/client/ClientLoginPage'; // New
import { ClientRegisterPage } from './pages/client/ClientRegisterPage'; // New
import { ClientDashboardPage } from './pages/client/ClientDashboardPage'; // New
import { UserRole } from './types';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Verificando autenticación..." size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    // If trying to access a client-protected route, redirect to client login
    if (allowedRoles.includes(UserRole.CLIENT)) {
        return <Navigate to="/client/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    // If role doesn't match, redirect based on actual role or to login
    if (currentUser.role === UserRole.SUPER_ADMIN) return <Navigate to="/superadmin" replace />;
    if (currentUser.role === UserRole.OWNER) return <Navigate to="/owner" replace />;
    if (currentUser.role === UserRole.EMPLOYEE) return <Navigate to="/employee" replace />;
    if (currentUser.role === UserRole.CLIENT) return <Navigate to="/client/dashboard" replace />; // Should not happen if logic is correct
    return <Navigate to="/login" replace />; 
  }

  return children ? <>{children}</> : <Outlet />;
};


const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  // This initial loading is for the very first app load before AuthProvider has determined currentUser
  if (isLoading && currentUser === undefined) { 
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Cargando aplicación..." size="lg" />
      </div>
    );
  }
  
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/client-portal" element={<ClientPortalPage />} /> 
      <Route path="/client/login" element={<ClientLoginPage />} />
      <Route path="/client/register" element={<ClientRegisterPage />} />
      
      <Route element={<ProtectedRoute allowedRoles={[UserRole.CLIENT]} />}>
        <Route path="/client/dashboard" element={<ClientDashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} />}>
        <Route path="/superadmin" element={<SuperAdminDashboardPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[UserRole.OWNER]} />}>
        <Route path="/owner" element={<OwnerDashboardPage />} />
      </Route>
      
      <Route element={<ProtectedRoute allowedRoles={[UserRole.EMPLOYEE]} />}>
        <Route path="/employee" element={<EmployeeDashboardPage />} />
      </Route>
      
      <Route 
        path="/" 
        element={
          isLoading ? <div className="min-h-screen flex items-center justify-center"><LoadingSpinner text="Cargando..." size="lg" /></div> : 
          currentUser ? (
            currentUser.role === UserRole.SUPER_ADMIN ? <Navigate to="/superadmin" replace /> :
            currentUser.role === UserRole.OWNER ? <Navigate to="/owner" replace /> : 
            currentUser.role === UserRole.EMPLOYEE ? <Navigate to="/employee" replace /> :
            currentUser.role === UserRole.CLIENT ? <Navigate to="/client/dashboard" replace /> :
            <Navigate to="/login" replace /> 
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all */}
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;