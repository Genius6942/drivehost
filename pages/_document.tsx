import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        {process.env.NODE_ENV === "development" && (
          <>
            <script src="https://cdn.jsdelivr.net/npm/eruda"></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `
            try {
              eruda.init({
                defaults: {
                  displaySize: 30,
                  theme: "Atom One Dark",
                  transparency: 1,
                },
              });
              if (localStorage.getItem("eruda-auto-show") === "1") eruda.show();
              window.addEventListener("keydown", (e) => {
                const { key, ctrlKey } = e;
                if (key === "e" && ctrlKey) {
                  e.preventDefault();
                  if (localStorage.getItem("eruda-auto-show") === "1") {
                    localStorage.setItem("eruda-auto-show", "0");
                    eruda.hide();
                  } else {
                    localStorage.setItem("eruda-auto-show", "1");
                    eruda.show();
                  }
                }
              });
            } catch (e) {
              alert(e);
            }
          
        `,
              }}
            ></script>
          </>
        )}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
