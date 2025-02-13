import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { supabase } from "@/utils/supa";
import Cookies from 'js-cookie';
import { toast } from "sonner";

interface LoginProps {
  setIsLoggedIn: (value: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ setIsLoggedIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const email = (e.currentTarget[0] as HTMLInputElement).value;
    const password = (e.currentTarget[1] as HTMLInputElement).value;

    try {
      // Sign in with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Get user data from your users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) throw userError;

      // Update only latest_login timestamp
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          latest_login: now // Only update latest_login on login
        })
        .eq('email', email);

      if (updateError) {
        console.error('Error updating login timestamp:', updateError);
        throw updateError;
      }

      // Store user data in cookies
      Cookies.set('user_token', authData.session?.access_token || '', { expires: 7 }); // 7 days expiry
      Cookies.set('user_data', JSON.stringify({
        id: userData.user_id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        uuid: userData.uuid
      }), { expires: 7 });

      setIsLoggedIn(true);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/assets/RACU.png" alt="RACU Logo" className="w-32 h-32" />
        </div>

        {/* Title */}
        <h2 className="text-5xl font-bold text-center text-blue-900 font-poppins">
          CIPHERS
        </h2>
        <p className="text-sm font-regular text-center text-blue-900 font-poppins mb-8" >
          Cybercrime Incident Processing, Handling, and E-Blotter Record System</p>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            type="email"
            placeholder="Enter Email Address"
            className="p-4 text-lg h-12 w-full border border-gray-300 rounded-md font-poppins focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <Input
            type="password"
            placeholder="Enter Password"
            className="p-4 text-lg h-12 w-full border border-gray-300 rounded-md font-poppins focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <Button
            type="submit"
            className="w-full bg-blue-900 text-white p-4 text-lg h-12 rounded-md hover:bg-blue-800 transition-all duration-300 font-poppins"
            disabled={isLoading}
          >
            {isLoading ? "Logging In..." : "Log In"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
