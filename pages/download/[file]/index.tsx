import downloadFile from "@/lib/downloadFile";
import { GetServerSideProps } from "next";
import { useEffect } from "react";

export default function DownloadPage({ file }: { file: string }) {
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {
      file: context.params?.file,
    },
  };
};
