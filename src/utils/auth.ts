import { supabase } from './supa';
import Cookies from 'js-cookie';

export const logout = async () => {
  try {
    // Get user data from cookies
    const userData = Cookies.get('user_data');
    if (!userData) {
      throw new Error('No user data found in cookies');
    }

    // Parse user data
    const { email } = JSON.parse(userData);
    if (!email) {
      throw new Error('No email found in user data');
    }

    console.log('Updating last_login for:', email); // Debug log

    // Update last_login timestamp first
    const { data, error: updateError } = await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString()
      })
      .eq('email', email)
      .select();

    if (updateError) {
      console.error('Error updating last_login:', updateError);
      throw updateError;
    }

    console.log('Update response:', data); // Debug log

    // Only proceed with signout if update was successful
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('Error signing out:', signOutError);
      throw signOutError;
    }

    // Clear cookies last
    Cookies.remove('user_token');
    Cookies.remove('user_data');

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error };
  }
};

// Function to clean up auth state
export const cleanupAuthState = async () => {
  try {
    // Get user data from cookies for last_login update
    const userData = Cookies.get('user_data');
    if (userData) {
      const { email } = JSON.parse(userData);
      if (email) {
        // Update last_login timestamp
        await supabase
          .from('users')
          .update({ 
            last_login: new Date().toISOString()
          })
          .eq('email', email);
      }
    }

    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear cookies
    Cookies.remove('user_token');
    Cookies.remove('user_data');
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}; 