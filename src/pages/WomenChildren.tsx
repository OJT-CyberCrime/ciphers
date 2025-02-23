import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

export default function WomenChildren() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check user role
    const userData = JSON.parse(Cookies.get('user_data') || '{}');
    const userRole = userData.role;

    // If not WCPD role, redirect to dashboard
    if (userRole !== 'wcpd') {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-medium font-poppins text-blue-900 mb-6">
        Women and Children Protection
      </h1>
      {/* Add your WCPD content here */}
    </div>
  );
}
