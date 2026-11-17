import { handleConsultationRequest } from "@/lib/server/consultation-mail";

export async function POST(request: Request) {
  return handleConsultationRequest(request);
}
