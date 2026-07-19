import type { Metadata } from "next";
import { GenerationStudio } from "@/components/create/generation-studio";

export const metadata: Metadata = { title: "홍보 이미지 만들기" };
export default function CreateImagePage() { return <GenerationStudio type="image" />; }
