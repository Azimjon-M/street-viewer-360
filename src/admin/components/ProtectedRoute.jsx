import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { admin, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="admin-loading-screen">
                <div className="admin-spinner" />
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    if (!admin) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
