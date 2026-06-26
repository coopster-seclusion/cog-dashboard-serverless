const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "That account isn't authorised for the COG dashboard.",
  oauth: "Sign-in failed. Please try again.",
};

export default function Login() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const errorMessage = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.oauth : null;

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-[#0D0D0D] px-6">
      <div className="flex flex-col items-center w-full max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-0.5 h-4 bg-[#E31937] shrink-0" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-white uppercase">
            COG Dashboard
          </span>
        </div>
        <p className="text-xs text-[#808080] mb-8 tracking-wide">
          Sign in to continue
        </p>

        {errorMessage && (
          <div className="w-full mb-4 px-3 py-2 text-xs text-[#E31937] border border-[#E31937]/40 bg-[#E31937]/10 rounded">
            {errorMessage}
          </div>
        )}

        <a
          href="/api/auth/google/login"
          className="flex items-center justify-center gap-3 w-full h-11 bg-white text-[#1F1F1F] text-sm font-medium rounded hover:bg-[#F2F2F2] transition-colors"
        >
          <GoogleIcon />
          Sign in with Google
        </a>

        <p className="text-[10px] text-[#404040] mt-6 text-center tracking-wide">
          Access is restricted to COG team accounts.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
