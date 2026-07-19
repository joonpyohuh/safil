import type { Metadata } from "next";
import { CopyGenerator } from "@/components/create/copy-generator";

export const metadata: Metadata = { title: "홍보 문구 만들기" };

export default function CreateCopyPage() {
  return <CopyGenerator />;
}
