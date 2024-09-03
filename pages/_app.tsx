import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";

import "react-toastify/dist/ReactToastify.min.css";

export default function App({
  // @ts-ignore
  Component,
  // @ts-ignore
  pageProps: { session, ...pageProps },
}) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
