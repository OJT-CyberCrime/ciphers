import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supa";
import Cookies from "js-cookie";
import { Eye, EyeOff, Loader, ShieldCheckIcon, KeyRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import DataPrivacyModal from "@/components/DataPrivacyModal";
import { toast } from "sonner";
import TwoFactorSetup from "@/components/TwoFactorSetup";
import TwoFactorVerify from "@/components/TwoFactorVerify";
import TwoFactorReset from "@/components/TwoFactorReset";

interface LoginProps {
  setIsLoggedIn: (value: boolean) => void;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const MFA_CODE_LENGTH = 6;

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
  const [showMFAInput, setShowMFAInput] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [tempAuthData, setTempAuthData] = useState<any>(null);
  const [tempUserData, setTempUserData] = useState<any>(null);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [showTwoFactorVerify, setShowTwoFactorVerify] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [showTwoFactorReset, setShowTwoFactorReset] = useState(false);

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
            "Too many failed attempts. Please wait 15 minutes before retrying."
          );
        } else {
          setErrorMessage(
            `Incorrect email or password. You have ${attemptsLeft} attempt(s) left.`
          );
        }

        setFailedAttempts((prev) => prev + 1);
        throw authError;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_id, name, email, role, uuid, two_factor_secret, two_factor_enabled")
        .eq("email", email)
        .single();

      if (userError) throw userError;

      // Store temporary data
      setTempAuthData(authData);
      setTempUserData(userData);

      // Check 2FA status
      if (!userData.two_factor_enabled) {
        // Show 2FA setup if not enabled
        setShowTwoFactorSetup(true);
      } else {
        // Show 2FA verification if enabled
        setTwoFactorSecret(userData.two_factor_secret);
        setShowTwoFactorVerify(true);
      }

    } catch (error: any) {
      // Error is handled above
    } finally {
      setIsLoading(false);
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
      }
    }
  };

  const handleTwoFactorSetupComplete = () => {
    setShowTwoFactorSetup(false);
    completeLogin();
  };

  const handleTwoFactorVerifyComplete = () => {
    setShowTwoFactorVerify(false);
    completeLogin();
  };

  const completeLogin = async () => {
    if (!tempAuthData || !tempUserData) return;

    try {
      setIsLoading(true);

      // Reset login attempts
      setFailedAttempts(0);
      setRetryTimeout(null);
      localStorage.removeItem("retryTimeout");

      // Display welcome toast
      toast.success(`Welcome to CRIMS, ${tempUserData.name.split(" ")[0]}!`, {
        style: {
          backgroundColor: "#d4edda",
          color: "#155724",
        },
        position: "top-right",
      });

      const now = new Date().toISOString();
      await supabase
        .from("users")
        .update({ latest_login: now })
        .eq("email", tempUserData.email);

      // Store auth data
      sessionStorage.setItem(
        "user_token",
        tempAuthData.session?.access_token || ""
      );
      sessionStorage.setItem(
        "user_data",
        JSON.stringify({
          id: tempUserData.user_id,
          name: tempUserData.name,
          email: tempUserData.email,
          role: tempUserData.role,
          uuid: tempUserData.uuid,
        })
      );

      // Set cookies
      Cookies.set("user_token", tempAuthData.session?.access_token || "", {
        sameSite: "strict",
      });
      Cookies.set(
        "user_data",
        JSON.stringify({
          id: tempUserData.user_id,
          name: tempUserData.name,
          email: tempUserData.email,
          role: tempUserData.role,
          uuid: tempUserData.uuid,
        }),
        { sameSite: "strict" }
      );

      setIsLoggedIn(true);
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Error completing login:', error);
      setErrorMessage('Failed to complete login process');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen md:flex-row md:h-screen md:overflow-hidden font-poppins">
      {/* Top Section (Mobile) / Left Section (Desktop) - PNP Background */}
      <div className="h-64 md:h-full md:w-1/2 relative bg-blue-900 order-1 md:order-none">
        <img
          src="/assets/PNP.webp"
          alt="PNP"
          className="object-cover h-full w-full opacity-40"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 md:space-y-8 p-4">
          <img
            src="/assets/RACU.png"
            alt="RACU Logo"
            className="w-20 h-20 md:w-40 md:h-40 drop-shadow-2xl"
          />
          <div className="text-center space-y-2 md:space-y-4">
            <p className="text-lg md:text-2xl font-medium text-white font-poppins max-w-md mx-auto text-center drop-shadow-[3px_3px_2px_rgba(0,0,0,0.5)]">
              Camarines Sur Provincial <br />
              <span className="text-white drop-shadow-[3px_3px_2px_rgba(0,0,0,0.5)]">
                Cyber Response Team
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section (Mobile) / Right Section (Desktop) - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-gray-50 order-2 md:order-none">
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
          <div className="text-left space-y-2 mb-6 md:mb-8">
            <h2 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-blue-700 font-poppins">
              Welcome to CRIMS
            </h2>
            <p className="text-sm font-medium text-gray-600 font-poppins">
              Cybercrime Records and Incident Management System
            </p>
          </div>

          {/* Rest of your login form content remains the same */}
          {showTwoFactorSetup ? (
            <TwoFactorSetup
              userEmail={tempUserData?.email || ''}
              onVerificationComplete={handleTwoFactorSetupComplete}
              onCancel={() => {
                setShowTwoFactorSetup(false);
                setTempAuthData(null);
                setTempUserData(null);
              }}
            />
          ) : showTwoFactorVerify ? (
            <>
              {showTwoFactorReset ? (
                <TwoFactorReset
                  onCancel={() => setShowTwoFactorReset(false)}
                />
              ) : (
                <TwoFactorVerify
                  userEmail={tempUserData?.email || ''}
                  secret={twoFactorSecret || ''}
                  onVerificationComplete={handleTwoFactorVerifyComplete}
                  onCancel={() => {
                    setShowTwoFactorVerify(false);
                    setTempAuthData(null);
                    setTempUserData(null);
                    setTwoFactorSecret(null);
                  }}
                >
                  <Button
                    type="button"
                    variant="link"
                    className="mt-4 text-sm text-blue-600"
                    onClick={() => setShowTwoFactorReset(true)}
                  >
                    Lost access to your authenticator app?
                  </Button>
                </TwoFactorVerify>
              )}
            </>
          ) : (
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
              <div className="flex justify-center">
                <HCaptcha
                  sitekey="2028db5a-e45c-418a-bb88-cd600e04402c"
                  onVerify={handleVerificationSuccess}
                  ref={captchaRef}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-900 text-white p-4 text-lg h-12 rounded-lg hover:bg-blue-800 transition-all duration-300 font-poppins flex items-center justify-center"
                disabled={isLoading || retryTimeout !== null}
              >
                {isLoading ? (
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                ) : null}
                {isLoading ? "Verifying..." : "Log In"}
              </Button>
            </form>
          )}

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
  );
};

export default Login;