import { supabase } from './supa';
import Cookies from 'js-cookie';

export const logout = async () => {
  try {
    // Get user data from cookies before clearing
    const userData = Cookies.get('user_data');
    if (userData) {
      const { email } = JSON.parse(userData);
      
      // Update last_login timestamp
      await supabase
        .from('users')
        .update({ 
          last_login: new Date().toISOString()
        })
        .eq('email', email);
    }

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear cookies
    Cookies.remove('user_token');
    Cookies.remove('user_data');

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error };
  }
}; 