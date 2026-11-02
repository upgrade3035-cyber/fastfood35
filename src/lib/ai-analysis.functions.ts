import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiAnalysis = {
  answer: string;
  verdict: string;
  chartTitle: string;
  chart: { label: string; value: number }[];
  tips: string[];
};

export const analyzeBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        question: z.string().min(3).max(2000),
        snapshot: z.string().max(20000),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<AiAnalysis> => {
    const key = process.env["GROQ_API_KEY"];
    if (!key) throw new Error("AI kaliti topilmadi");

    const systemPrompt = `Sen o'zbek tilida ishlaydigan restoran/fastfood biznes tahlilchisisan.
Sizga saytdagi haqiqiy ma'lumotlar (mahsulotlar, narxlar, tannarx, sotuvlar, xarajatlar, xodim maoshlari) JSON ko'rinishida beriladi.
Vazifa: savolga ANIQ raqamlar bilan javob berish — hisob-kitobni bosqichma-bosqich ko'rsat (1 dona uchun tannarx, sotish narxi, foyda, foyda foizi, kunlik prognoz).
Agar savolda foydalanuvchi o'z narxlarini bergan bo'lsa (masalan 1kg piyoz 10 000 so'm), shu narxlardan foydalanib porsiyaga bo'lib hisobla va mantiqiy taxminlarni ochiq yozib ket.
Har doim sonlarni so'mda, aniq ko'rsat. Javob qisqa, aniq va tushunarli bo'lsin.
Faqat quyidagi JSON formatda javob ber:
{"answer":"markdown matn, hisob-kitob bilan","verdict":"bir qatorli xulosa (foydaga qolasiz / zarar)","chartTitle":"diagramma nomi","chart":[{"label":"Tannarx","value":6000},{"label":"Sotish narxi","value":10000},{"label":"Foyda","value":4000}],"tips":["maslahat 1","maslahat 2"]}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `SAYT MA'LUMOTLARI (JSON):\n${data.snapshot}\n\nSAVOL:\n${data.question}`,
          },
        ],
      }),
    });

    if (response.status === 401 || response.status === 403)
      throw new Error("AI ulanishida ruxsat xatosi. Iltimos qayta urinib ko'ring.");
    if (response.status === 429) throw new Error("AI band — birozdan keyin qayta urinib ko'ring");
    if (response.status === 402) throw new Error("AI krediti tugagan");
    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error", response.status, text.slice(0, 500));
      throw new Error(`AI hozir javob bermadi (kod ${response.status}). Qayta urinib ko'ring.`);
    }


    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = JSON.parse(raw) as Partial<AiAnalysis>;
      return {
        answer: String(parsed.answer ?? raw),
        verdict: String(parsed.verdict ?? ""),
        chartTitle: String(parsed.chartTitle ?? "Tahlil"),
        chart: Array.isArray(parsed.chart)
          ? parsed.chart
              .filter((c) => c && typeof c.label === "string")
              .map((c) => ({ label: String(c.label), value: Number(c.value) || 0 }))
              .slice(0, 12)
          : [],
        tips: Array.isArray(parsed.tips) ? parsed.tips.map(String).slice(0, 6) : [],
      };
    } catch {
      return { answer: raw, verdict: "", chartTitle: "Tahlil", chart: [], tips: [] };
    }
  });
