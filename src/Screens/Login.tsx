import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supa";
import Cookies from 'js-cookie';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { Alert } from "@/components/ui/alert";

interface LoginProps {
  setIsLoggedIn: (value: boolean) => void;
}

const MAX_ATTEMPTS = 3; // Define the maximum number of login attempts
const LOCKOUT_TIME = 1 * 60 * 1000; // 1 minute in milliseconds

const Login: React.FC<LoginProps> = ({ setIsLoggedIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0); // State for remaining time
  const navigate = useNavigate();

  useEffect(() => {
    // Check local storage for retry timeout
    const storedTimeout = localStorage.getItem("retryTimeout");
    if (storedTimeout) {
      const timeout = parseInt(storedTimeout, 10);
      const currentTime = Date.now();
      if (currentTime < timeout) {
        setRetryTimeout(timeout);
        setRemainingTime(timeout - currentTime); // Set initial remaining time
        setErrorMessage(`Too many failed attempts. Please wait ${Math.ceil((timeout - currentTime) / 1000)} seconds before retrying.`);
      } else {
        localStorage.removeItem("retryTimeout"); // Clear expired timeout
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const email = (e.currentTarget[0] as HTMLInputElement).value;
    const password = (e.currentTarget[1] as HTMLInputElement).value;

    try {
      // Sign in with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const attemptsLeft = MAX_ATTEMPTS - (failedAttempts + 1); // Calculate remaining attempts
        setFailedAttempts(prev => prev + 1);
        if (failedAttempts + 1 >= MAX_ATTEMPTS) {
          const lockoutEndTime = Date.now() + LOCKOUT_TIME;
          setRetryTimeout(lockoutEndTime);
          localStorage.setItem("retryTimeout", lockoutEndTime.toString());
          setErrorMessage("Too many failed attempts. Please wait 1 minute before retrying.");
          return;
        }

        // Check for specific error message for incorrect credentials
        if (authError.message.includes("invalid login credentials")) {
          setErrorMessage(`Incorrect email or password. You have ${attemptsLeft} attempt(s) left.`);
        } else {
          setErrorMessage(authError.message || "Failed to login");
        }
        throw authError;
      }

      // Reset failed attempts on successful login
      setFailedAttempts(0);
      setRetryTimeout(null);
      localStorage.removeItem("retryTimeout"); // Clear the timeout on successful login

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
      // The error message is handled above
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to handle retry timeout and countdown
  useEffect(() => {
    if (retryTimeout !== null) {
      const timer = setInterval(() => {
        const currentTime = Date.now();
        const timeLeft = Math.max(0, Math.ceil((retryTimeout - currentTime) / 1000)); // Convert to seconds

        if (timeLeft === 0) {
          setRetryTimeout(null);
          localStorage.removeItem("retryTimeout"); // Clear expired timeout
          setRemainingTime(0);
          setErrorMessage(null); // Remove alert when countdown is complete
        } else {
          setRemainingTime(timeLeft); // Set remaining time in seconds
        }
      }, 1000); // Check every second

      return () => clearInterval(timer);
    }
  }, [retryTimeout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/assets/RACU.png" alt="RACU Logo" className="w-32 h-32" />
        </div>

        {/* Alert for error message */}
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            {errorMessage}
            {remainingTime > 0 && (
              <div>
                <p>Time remaining: {Math.ceil(remainingTime)} seconds</p>
              </div>
            )}
          </Alert>
        )}

        <p className="text-sm font-medium text-center text-blue-900 font-poppins mb-8" >
        Camarines Sur Provincial Cyber Response Team</p>

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
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter Password"
              className="p-4 text-lg h-12 w-full border border-gray-300 rounded-md font-poppins focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              onMouseEnter={() => setShowPassword(true)}
              onMouseLeave={() => setShowPassword(false)}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              {showPassword ? <EyeOff className="h-5 w-5 text-gray-500" /> : <Eye className="h-5 w-5 text-gray-500" />}
            </button>
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-900 text-white p-4 text-lg h-12 rounded-md hover:bg-blue-800 transition-all duration-300 font-poppins flex items-center justify-center"
            disabled={isLoading || (failedAttempts >= 3) || (retryTimeout !== null)}
          >
            {isLoading ? <Loader className="animate-spin h-5 w-5 mr-2" /> : null}
            {isLoading ? "Logging In..." : "Log In"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
