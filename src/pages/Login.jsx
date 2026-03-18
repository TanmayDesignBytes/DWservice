import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function BrandMark() {
  return (
    <img
      src="/DB_Logo.svg"
      alt="Design Bytes"
      className="h-[1.75rem] sm:h-[2.3125rem] w-auto max-w-full object-contain"
    />
  );
}

function Login({ onSignIn }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef4fb] px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,_#f8fbff_0%,_#eef4fb_48%,_#dbe7f4_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,_#5973DC_0%,_rgba(89,115,220,0.75)_28%,_rgba(89,115,220,0.32)_55%,_rgba(89,115,220,0.08)_78%,_rgba(89,115,220,0)_100%)] opacity-75 mix-blend-overlay" />

      <Card className="relative w-full max-w-[32.125rem] rounded-[1rem] sm:rounded-[1.25rem] border-0 bg-[rgba(255,255,255,0.85)] shadow-[0_0.25rem_0.25rem_rgba(0,0,0,0.25)] backdrop-blur-[0.4063rem]">
        <CardContent className="p-5 sm:p-[3.125rem]">
          <div className="flex flex-col items-start justify-center gap-6 sm:gap-8">
            <div className="flex w-full flex-col items-start gap-4 sm:gap-6 self-stretch">
              <BrandMark />

              <div className="flex w-full flex-col items-start gap-1 sm:gap-2 self-stretch">
                <h1 className="w-full self-stretch font-['Poppins'] text-[1.125rem] sm:text-[1.25rem] font-semibold leading-[1.5rem] sm:leading-[1.875rem] tracking-normal text-[#101828]">
                  Log in to your account
                </h1>
                <p className="w-full self-stretch font-['Poppins'] text-[0.8125rem] sm:text-[0.875rem] font-normal leading-[1.125rem] sm:leading-[1.25rem] text-[#475467]">
                  Welcome back! Please enter your details.
                </p>
              </div>
            </div>

            <form
              className="flex w-full flex-col gap-4 sm:gap-6 self-stretch"
              onSubmit={(event) => {
                event.preventDefault();
                onSignIn();
              }}
            >
              <div className="flex w-full flex-col gap-3 sm:gap-4 self-stretch">
                <div className="flex w-full flex-col items-start gap-[0.25rem] sm:gap-[0.375rem] self-stretch">
                  <label
                    htmlFor="email"
                    className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-normal leading-[1rem] sm:leading-[1.25rem] text-[#344054]"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="flex w-full flex-col items-start gap-[0.25rem] sm:gap-[0.375rem] self-stretch">
                  <label
                    htmlFor="password"
                    className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-normal leading-[1rem] sm:leading-[1.25rem] text-[#344054]"
                  >
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={
                      "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                    }
                  />
                </div>
              </div>

              <div className="flex w-full flex-col items-start gap-4 sm:gap-6 self-stretch">
                <div className="flex w-full items-center justify-between gap-2 sm:gap-4 flex-col xs:flex-row">
                  <label className="flex items-center gap-2 font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-medium leading-[1rem] sm:leading-[1.375rem] text-[#344054]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-[0.25rem] border border-[#D5DBE6] text-[#193D9E] accent-[#193D9E]"
                    />
                    <span className="truncate">Remember me</span>
                  </label>

                  <button
                    type="button"
                    className="font-['Poppins'] text-[0.75rem] sm:text-[0.875rem] font-medium leading-[1rem] sm:leading-[1.375rem] text-[#2970FF] transition-colors hover:text-[#175CD3] truncate"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="h-[2.75rem] sm:h-[3.125rem] w-full items-center justify-center gap-[0.375rem] rounded-[6.25rem] border border-[#2970FF] bg-[#2970FF] px-4 py-[0.5rem] sm:py-[0.625rem] font-['Poppins'] text-[0.9375rem] sm:text-[1rem] font-medium leading-5 sm:leading-6 text-white shadow-[0_0.0625rem_0.125rem_rgba(16,24,40,0.05)] hover:bg-[#175CD3] hover:border-[#175CD3]"
                >
                  Sign in
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default Login;
