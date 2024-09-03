import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import { useSession, signOut, signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/Button";
import { useRef, useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Session } from "next-auth";
import { getAllFiles } from "./api/app/get/all";
import { getExtension } from "mime";
import { ToastContainer, toast } from "react-toastify";
import { getIcon } from "material-file-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShareNodes as faShare,
  faDownload,
  faTrash,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import Head from "next/head";
import { uploadFileInChunks } from "@/lib/chunksUpload";

/**
 * Format bytes as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
function getSize(bytes: number, si = true, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + " " + units[u];
}

export default function Home({
  files: initialFiles,
}: {
  files: {
    name: string;
    mimeType: string;
    extension: string;
    id: string;
    size: number;
    fullFileExtension: string | null | undefined;
    webContentLink: string | null | undefined;
    webViewLink: string | null | undefined;
    iconLink: string | null | undefined;
    thumbnailLink: string | null | undefined;
  }[];
}) {
  const { data: session } = useSession();
  const [files, setFiles] = useState(initialFiles);
  const formRef = useRef<HTMLFormElement>(null);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Do something with the files
      if (!session || !session.user)
        return alert("You must be signed in to upload files");
      if (acceptedFiles.length === 0) return;
      setFileUploadProgress(0);
      let toastId = null as string | number | null;
      await toast.promise(
        Promise.all(
          acceptedFiles.map(async (file) => {
            if (!session || !session.user) {
              alert("You must be signed in to upload files");
            }
            if (!file) {
              alert("You must select a file to upload");
            }
            const name = file.name;
            if (file.size > 2 * 1024 * 1024) {
              try {
                await uploadFileInChunks(file, 2 * 1024 * 1024, toast);
                toast.success("Uploaded " + name);
              } catch (e) {
                console.error(e);
                toast.error("Failed to upload " + name + ".");
              }
            } else {
              // submit form yay!!
              const data = new FormData();
              data.append("file", file);
              try {
                try {
                  await axios.post("/api/app/upload", data, {
                    onUploadProgress: (p) => {
                      const progress = p.loaded / (p.total as number);

                      // check if we already displayed a toast
                      if (toastId === null) {
                        toastId = toast("Uploading " + name + "...", { progress });
                      } else {
                        toast.update(toastId, { progress });
                      }
                    },
                    headers: { "Content-Type": "multipart/form-data" },
                  });

                  toast.success("Uploaded " + name);
                } catch (e) {
                  console.error(e);
                  toast.error("Failed to upload " + name + ".");
                }

                toast.done(toastId as string | number);
              } catch (e) {
                console.error(e);
              }
              setFileUploadProgress(fileUploadProgress + 1);
            }
          })
        ),
        {
          pending: {
            render: () => (
              <div>
                Uploading files {fileUploadProgress}/{acceptedFiles.length}...
              </div>
            ),
          },
          success: "Uploaded files!",
          error: "Failed to upload files",
        }
      );

      const res: any = await toast.promise(axios.post("/api/app/get/all", {}), {
        pending: "Fetching update",
        success: "Updated!",
        error: "Failed to update",
      });
      setFiles(
        res.data.data.map((file: any) => {
          if (!file.extension) {
            file.extension = getExtension(file.mimeType) as string;
          }
          for (const key in file) {
            // @ts-ignore
            if (file[key] === undefined) {
              // @ts-ignore
              file[key] = null;
            }
          }
          return file;
        })
      );
    },
    [session]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
  });

  if (!session || !session.user)
    return (
      <main>
        <Head>
          <title>File Host</title>
        </Head>
        <h1>Home</h1>
        <p>
          <Button onClick={() => signIn()}>Sign In</Button>
        </p>
      </main>
    );

  const storageUsed = files.length
    ? files.map((file) => file.size).reduce((a, b) => a + b)
    : 0;

  return (
    <main className="p-3 h-screen overflow-auto">
      <ToastContainer />
      <Head>
        <title>{"My Files - " + session.user.name}</title>
      </Head>
      <div className="flex items-center p-3 rounded-xl bg-blue-200">
        {session.user.image && (
          <Image
            src={session.user.image}
            referrerPolicy="no-referrer"
            width={40}
            height={40}
            alt="pfp"
            className="mr-3"
          />
        )}
        {session.user.name}
        {session.user.email && (
          <p className="ml-3 text-sm text-gray-500">{session.user.email}</p>
        )}
        Using {getSize(storageUsed)}
        <Button
          className="ml-auto"
          onClick={async () => {
            if (!confirm("Are you sure you want to delete all files?")) return;
            await toast.promise(axios.post("/api/app/delete/all", {}), {
              pending: "Deleting all files...",
              success: "Deleted all files!",
              error: "Failed to delete all files",
            });
            // fetch update
            const res: any = await toast.promise(axios.post("/api/app/get/all", {}), {
              pending: "Fetching update",
              success: "Updated!",
              error: "Failed to update",
            });
            setFiles(
              res.data.data.map((file: any) => {
                if (!file.extension) {
                  file.extension = getExtension(file.mimeType) as string;
                }
                for (const key in file) {
                  // @ts-ignore
                  if (file[key] === undefined) {
                    // @ts-ignore
                    file[key] = null;
                  }
                }
                return file;
              })
            );
          }}
        >
          Delete All Files
        </Button>
        <Button className="ml-3" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
      {/* upload file button */}
      <form
        {...getRootProps()}
        onClick={undefined}
        method="post"
        encType="multipart/form-data"
        action="api/app/upload"
        className="mt-4"
        ref={formRef}
      >
        <label htmlFor="upload">
          <Button
            style={{ fontSize: 20, padding: 20 }}
            onClick={open}
            contained
            // onClick={({ currentTarget }) => currentTarget.parentElement?.click()}
          >
            Upload File (or drag and drop)
          </Button>
        </label>
        <input
          type="file"
          name="upload"
          id="upload"
          className="hidden"
          {...getInputProps()}
        />
      </form>
      {/* cover screen for drag and drop */}
      <div
        className={`fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-50 transition-opacity text-white items-center justify-center ${
          isDragActive ? "flex" : "hidden"
        }`}
        {...getRootProps()}
      >
        <div className="border-dashed rounded-2xl flex items-center justify-center border-4 border-white w-5/6 h-5/6">
          <div className="text-center">
            <h1 className="text-4xl font-bold">Drop File Here</h1>
          </div>
        </div>
      </div>
      {/* files */}
      <div className="mt-4 flex flex-col gap-5">
        {files.map((file, idx) => (
          <a
            className="flex items-center p-3 rounded-full bg-blue-200 hover:bg-blue-400"
            key={idx}
            href={"/api/app/get/" + file.id}
            target="_blank"
          >
            <Image
              src={
                file.extension === "png" ||
                file.extension === "jpg" ||
                file.extension === "jpeg"
                  ? file.thumbnailLink ||
                    file.iconLink ||
                    file.webContentLink ||
                    file.webViewLink ||
                    "/api/app/get/" + file.id
                  : "/api/icon/" + encodeURIComponent(file.name)
              }
              referrerPolicy="no-referrer"
              width={40}
              height={40}
              alt="icon"
              className="mr-3 rounded-full object-cover"
            />

            <div>
              <p className="text-xl">{file.name}</p>
              <p className="text-sm text-gray-500">{file.mimeType}</p>
            </div>
            <div>
              <p className="ml-3 text-gray-500">{getSize(file.size)}</p>
            </div>
            <div className="ml-auto flex gap-3 mr-5">
              <button
                className="rounded-full w-10 h-10 hover:bg-blue-500"
                title="Copy shareable link"
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  await navigator.clipboard.writeText(
                    "https://file.fezzle.dev/api/app/get/" + file.id
                  );
                  toast.success("Copied!");
                }}
                onMouseOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation;
                }}
                onMouseEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation;
                }}
              >
                <FontAwesomeIcon icon={faCopy} size="lg" />
              </button>
              <button
                className="rounded-full w-10 h-10 hover:bg-blue-500"
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  const shareData = {
                    title: "Share " + file.name,
                    url: "/api/app/get/" + file.id,
                  };

                  await navigator.share(shareData);
                }}
                onMouseOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation;
                }}
                onMouseEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation;
                }}
              >
                <FontAwesomeIcon icon={faShare} size="lg" />
              </button>
              <button
                className="rounded-full w-10 h-10 hover:bg-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const link = "/api/app/get/" + file.id;
                  const a = document.createElement("a");
                  a.href = link;
                  a.download = file.name || "Untitled";
                  a.style.cssText = "display: none";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }}
                onMouseOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation;
                }}
              >
                <FontAwesomeIcon icon={faDownload} size="lg" />
              </button>

              <button
                className="rounded-full w-10 h-10 hover:bg-blue-500"
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  await toast.promise(axios.post("/api/app/delete/" + file.id, {}), {
                    pending: "Deleting " + file.name + "...",
                    success: "Deleted " + file.name + "!",
                    error: "Failed to delete " + file.name,
                  });

                  const res: any = await toast.promise(
                    axios.post("/api/app/get/all", {}),
                    {
                      pending: "Fetching update",
                      success: "Updated!",
                      error: "Failed to update",
                    }
                  );
                  setFiles(
                    res.data.data.map((file: any) => {
                      if (!file.extension) {
                        file.extension = getExtension(file.mimeType) as string;
                      }
                      for (const key in file) {
                        // @ts-ignore
                        if (file[key] === undefined) {
                          // @ts-ignore
                          file[key] = null;
                        }
                      }
                      return file;
                    })
                  );
                }}
                onMouseOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation;
                }}
              >
                <FontAwesomeIcon icon={faTrash} size="lg" />
              </button>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = (await getServerSession(
    context.req,
    context.res,
    authOptions
  )) as Session;
  if (!session || !session.user || !session.user.id)
    return {
      props: {},
    };
  const files = (await getAllFiles(session)).map((file) => {
    if (!file.extension) {
      file.extension = getExtension(file.mimeType) as string;
    }
    for (const key in file) {
      // @ts-ignore
      if (file[key] === undefined) {
        // @ts-ignore
        file[key] = null;
      }
    }
    return file;
  });
  return {
    props: {
      session,
      files,
    },
  };
};
