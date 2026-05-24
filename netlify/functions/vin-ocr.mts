const DEFAULT_MODEL = "gpt-4.1";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, 204);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = Netlify.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "Netlify 环境变量 OPENAI_API_KEY 未配置" }, 500);
  }

  let payload;
  try {
    payload = await req.json();
  } catch (error) {
    return jsonResponse({ error: "请求体不是有效 JSON" }, 400);
  }

  const image = typeof payload?.image === "string" ? payload.image : "";
  const model = typeof payload?.model === "string" && payload.model.trim()
    ? payload.model.trim()
    : Netlify.env.get("OPENAI_VISION_MODEL") || DEFAULT_MODEL;

  if (!image.startsWith("data:image/")) {
    return jsonResponse({ error: "缺少有效图片 data URL" }, 400);
  }

  try {
    const baseUrl = (Netlify.env.get("OPENAI_BASE_URL") || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content: "你是车辆VIN识别助手。只识别图片中的17位车辆识别代码/VIN/车架号。不要解释，不要猜测无关内容。",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请从图片中读取车辆VIN。仅输出最可能的17位VIN；如果看不清，输出你能看到的候选字符，不要输出其它说明。",
              },
              {
                type: "image_url",
                image_url: { url: image, detail: "high" },
              },
            ],
          },
        ],
      }),
    });

    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      data = { raw: text };
    }

    if (!upstream.ok) {
      return jsonResponse({
        error: `OpenAI 接口返回 ${upstream.status}`,
        detail: data?.error?.message || text.slice(0, 300),
      }, upstream.status);
    }

    const content = data?.choices?.[0]?.message?.content || "";
    return jsonResponse({
      vin: extractVIN(content),
      rawText: content,
      model,
    });
  } catch (error) {
    return jsonResponse({
      error: "调用大模型接口失败",
      detail: error instanceof Error ? error.message : String(error),
    }, 500);
  }
};

export const config = {
  path: "/api/vin-ocr",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function extractVIN(text: string) {
  const source = normalizeVinText(text);
  const compact = source.replace(/[^A-Z0-9]/g, "");
  const candidates = new Set<string>();

  for (let i = 0; i <= compact.length - 17; i++) {
    candidates.add(compact.slice(i, i + 17));
  }

  return [...candidates].find(isVinCandidate) || "";
}

function normalizeVinText(text: string) {
  return String(text || "")
    .replace(/[：﹕]/g, ":")
    .replace(/[|｜]/g, "I")
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/I/g, "1");
}

function isVinCandidate(value: string) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(value) && !/^([A-Z0-9])\1{16}$/.test(value);
}
