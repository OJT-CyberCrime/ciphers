import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { supabase } from "@/utils/supa"; // Ensure this path is correct

interface LoginProps {
  setIsLoggedIn: (value: boolean) => void; // Accept setIsLoggedIn as a prop
}

const Login: React.FC<LoginProps> = ({ setIsLoggedIn }) => {
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true); // Set loading to true
    console.log("Logging in...");

    // Get email and password from the input fields
    const email = (e.currentTarget[0] as HTMLInputElement).value; // Cast to HTMLInputElement
    const password = (e.currentTarget[1] as HTMLInputElement).value; // Cast to HTMLInputElement

    // Use Supabase to sign in the user
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login error:", error.message);
        setIsLoading(false); // Reset loading state
        return; // Exit if there's an error
    }

    setIsLoggedIn(true); // Update login status
    setIsLoading(false); // Reset loading state
    navigate("/dashboard"); // Redirect to Dashboard on login
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
          >
            {isLoading ? "Logging In..." : "Log In"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
