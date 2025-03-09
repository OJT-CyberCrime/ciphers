import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supa";
import Cookies from "js-cookie";
import {
  Eye,
  EyeOff,
  Loader,
  ShieldCheckIcon,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import DataPrivacyModal from "@/components/DataPrivacyModal";

interface LoginProps {
  setIsLoggedIn: (value: boolean) => void;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 1 * 60 * 1000; // 1 minute

const Login: React.FC<LoginProps> = ({ setIsLoggedIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const userToken = Cookies.get("user_token");
    const userData = Cookies.get("user_data");
    if (userToken && userData) {
      navigate("/dashboard");
    }
  }, [navigate]);

  useEffect(() => {
    const storedTimeout = localStorage.getItem("retryTimeout");
    if (storedTimeout) {
      const timeout = parseInt(storedTimeout, 10);
      const currentTime = Date.now();
      if (currentTime < timeout) {
        setRetryTimeout(timeout);
        setRemainingTime(timeout - currentTime);
        setErrorMessage(
          `Too many failed attempts. Please wait ${Math.ceil(
            (timeout - currentTime) / 1000
          )} seconds before retrying.`
        );
      } else {
        localStorage.removeItem("retryTimeout");
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const email = (e.currentTarget[0] as HTMLInputElement).value;
    const password = (e.currentTarget[1] as HTMLInputElement).value;

    if (!captchaToken) {
      setErrorMessage("Please complete the captcha.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        });

      if (authError) {
        const attemptsLeft = MAX_ATTEMPTS - (failedAttempts + 1);

        if (failedAttempts + 1 >= MAX_ATTEMPTS) {
          const lockoutEndTime = Date.now() + LOCKOUT_TIME;
          setRetryTimeout(lockoutEndTime);
          localStorage.setItem("retryTimeout", lockoutEndTime.toString());
          setErrorMessage(
            "Too many failed attempts. Please wait 1 minute before retrying."
          );
        } else {
          setErrorMessage(
            `Incorrect email or password. You have ${attemptsLeft} attempt(s) left.`
          );
        }

        setFailedAttempts((prev) => prev + 1);
        throw authError;
      }

      setFailedAttempts(0);
      setRetryTimeout(null);
      localStorage.removeItem("retryTimeout");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError) throw userError;

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("users")
        .update({ latest_login: now })
        .eq("email", email);

      if (updateError) throw updateError;

      // Store auth data in sessionStorage
      sessionStorage.setItem(
        "user_token",
        authData.session?.access_token || ""
      );
      sessionStorage.setItem(
        "user_data",
        JSON.stringify({
          id: userData.user_id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          uuid: userData.uuid,
        })
      );

      // Set cookies with session scope
      Cookies.set("user_token", authData.session?.access_token || "", {
        sameSite: "strict",
      });
      Cookies.set(
        "user_data",
        JSON.stringify({
          id: userData.user_id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          uuid: userData.uuid,
        }),
        { sameSite: "strict" }
      );

      setIsLoggedIn(true);
      navigate("/dashboard");
    } catch (error: any) {
      // Error is handled above
    } finally {
      setIsLoading(false);
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
      }
    }
  };

  useEffect(() => {
    if (retryTimeout !== null) {
      const timer = setInterval(() => {
        const currentTime = Date.now();
        const timeLeft = Math.max(
          0,
          Math.ceil((retryTimeout - currentTime) / 1000)
        );

        if (timeLeft === 0) {
          setRetryTimeout(null);
          localStorage.removeItem("retryTimeout");
          setRemainingTime(0);
          setErrorMessage(null);
          setFailedAttempts(0);
        } else {
          setRemainingTime(timeLeft);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [retryTimeout]);

  const handleVerificationSuccess = (token: string) => {
    setCaptchaToken(token);
  };

  return (
    <div className="min-h-screen flex items-center justify-center space-y-0">
      <div className="flex w-full h-screen overflow-hidden">
        <div className="w-1/2 relative bg-blue-900">
          <img
            src="/assets/PNP.webp"
            alt="PNP"
            className="object-cover h-full w-full opacity-40"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8">
            <img
              src="/assets/RACU.png"
              alt="RACU Logo"
              className="w-40 h-40 drop-shadow-2xl"
            />
            <div className="text-center space-y-4">
              {/* <h1 className="text-4xl font-bold text-white font-poppins">
                Welcome to CRIMS
              </h1> */}
              <p className="text-2xl font-medium text-white font-poppins max-w-md mx-auto text-center drop-shadow-[3px_3px_2px_rgba(0,0,0,0.5)]">
                Camarines Sur Provincial <br />
                <span className="text-white drop-shadow-[3px_3px_2px_rgba(0,0,0,0.5)]">
                  Cyber Response Team
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="w-1/2 flex flex-col items-center justify-center p-12 bg-gray-50">
          {errorMessage && (
            <Alert variant="destructive" className="mb-6 w-full max-w-md">
              {errorMessage}
              {remainingTime > 0 && (
                <div>
                  <p>Time remaining: {Math.ceil(remainingTime)} seconds</p>
                </div>
              )}
            </Alert>
          )}

          <div className="w-full max-w-md space-y-6">
            <div className="text-left space-y-2 mb-8">
              <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-blue-700 font-poppins">
                Welcome to CRIMS
              </h2>
              <p className="text-sm font-medium text-gray-600 font-poppins">
                Cybercrime Records and Incident Management System
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                type="email"
                placeholder="Enter Email Address"
                className="p-4 text-lg h-12 w-full border border-gray-300 rounded-lg font-poppins focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter Password"
                  className="p-4 text-lg h-12 w-full border border-gray-300 rounded-lg font-poppins focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseEnter={() => setShowPassword(true)}
                  onMouseLeave={() => setShowPassword(false)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-900 text-white p-4 text-lg h-12 rounded-lg hover:bg-blue-800 transition-all duration-300 font-poppins flex items-center justify-center"
                disabled={isLoading || retryTimeout !== null}
              >
                {isLoading ? (
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                ) : null}
                {isLoading ? "Logging In..." : "Log In"}
              </Button>
              <div className="flex justify-center">
                <HCaptcha
                  sitekey="2028db5a-e45c-418a-bb88-cd600e04402c"
                  onVerify={handleVerificationSuccess}
                  ref={captchaRef}
                />
              </div>
            </form>
            <div className="flex justify-center mt-4">
              <Button
                type="button"
                className="flex items-center space-x-2 bg-blue-900 text-white p-4 rounded-lg hover:bg-blue-800 transition-all duration-300 font-poppins"
                onClick={() => setIsModalOpen(true)}
              >
                <ShieldCheckIcon className="w-5 h-5" />
                <span>Data Privacy Notice</span>
              </Button>
            </div>
          </div>
          <DataPrivacyModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
