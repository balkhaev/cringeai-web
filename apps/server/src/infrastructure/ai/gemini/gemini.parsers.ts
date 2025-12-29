import type {
  GeminiRawAnalysis,
  RawAnalysisWithoutOptions,
  VideoAnalysis,
  VideoAnalysisWithoutOptions,
} from "./gemini.types";

export const JSON_REGEX = /\{[\s\S]*\}/;

/**
 * Пытается исправить типичные ошибки JSON от LLM
 * Например: }] вместо }}, или }} вместо }]
 */
function tryFixCommonJsonErrors(jsonStr: string): string {
  // Попробуем распарсить как есть
  try {
    JSON.parse(jsonStr);
    return jsonStr;
  } catch {
    // Продолжаем с исправлениями
  }

  let fixed = jsonStr;

  // Паттерн: }} где первая } закрывает объект, а вторая должна быть ]
  // Это происходит когда LLM путает закрытие массива
  // Ищем паттерн: }\s*}\s*} или }\s*}\s*, где средняя } должна быть ]
  fixed = fixed.replace(/\}\s*\}\s*\}/g, (match) =>
    match.replace(/\}\s*\}/, "}]")
  );

  // Паттерн: объект в массиве заканчивается на }} вместо }]
  // "appearances": [...{...}}
  fixed = fixed.replace(/(\}\s*)\}(\s*[,}\]])/g, "$1]$2");

  try {
    JSON.parse(fixed);
    console.log("[JSON Fix] Successfully fixed JSON errors");
    return fixed;
  } catch {
    // Не удалось исправить, возвращаем оригинал
    return jsonStr;
  }
}

/**
 * Извлекает JSON объект или массив из текста с балансировкой скобок
 * Более надёжный метод чем простой regex
 */
export function extractJsonFromText(text: string): string | null {
  // Сначала попробуем найти JSON в блоке ```json
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const content = codeBlockMatch[1]?.trim();
    if (content?.startsWith("{") || content?.startsWith("[")) {
      // Попробуем исправить и распарсить
      const fixed = tryFixCommonJsonErrors(content);
      try {
        JSON.parse(fixed);
        return fixed;
      } catch {
        // Продолжаем искать
      }
    }
  }

  // Найдём первую открывающую скобку (объект или массив)
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");

  let startIndex: number;
  let openBracket: string;
  let closeBracket: string;

  if (objStart === -1 && arrStart === -1) return null;

  if (objStart === -1) {
    startIndex = arrStart;
    openBracket = "[";
    closeBracket = "]";
  } else if (arrStart === -1) {
    startIndex = objStart;
    openBracket = "{";
    closeBracket = "}";
  } else {
    // Берём то что раньше
    if (objStart < arrStart) {
      startIndex = objStart;
      openBracket = "{";
      closeBracket = "}";
    } else {
      startIndex = arrStart;
      openBracket = "[";
      closeBracket = "]";
    }
  }

  // Балансируем скобки для нахождения конца JSON
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      braceDepth++;
    } else if (char === "}") {
      braceDepth--;
    } else if (char === "[") {
      bracketDepth++;
    } else if (char === "]") {
      bracketDepth--;
    }

    // Проверяем завершение
    const isBalanced = braceDepth === 0 && bracketDepth === 0;
    const isClosing =
      (openBracket === "{" && char === "}") ||
      (openBracket === "[" && char === "]");

    if (isBalanced && isClosing) {
      const jsonStr = text.substring(startIndex, i + 1);
      // Пробуем исправить и распарсить
      const fixed = tryFixCommonJsonErrors(jsonStr);
      try {
        JSON.parse(fixed);
        return fixed;
      } catch {
        // Невалидный JSON, продолжаем
        return null;
      }
    }
  }

  return null;
}

/**
 * Checks Gemini response for blocking and extracts text
 * @throws Error with clear message if response is blocked
 */
export function extractTextFromResponse(response: {
  text: () => string;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{ category: string; probability: string }>;
  };
  candidates?: Array<{
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
      blocked?: boolean;
    }>;
  }>;
}): string {
  // Check prompt blocking
  if (response.promptFeedback?.blockReason) {
    throw new Error(
      `Запрос заблокирован Gemini: ${response.promptFeedback.blockReason}. Возможно, видео содержит контент, который модерация считает неприемлемым.`
    );
  }

  // Check response blocking
  const candidate = response.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    const blockedCategories = candidate.safetyRatings
      ?.filter((r) => r.blocked)
      .map((r) => r.category)
      .join(", ");
    throw new Error(
      `Ответ заблокирован модерацией Gemini${blockedCategories ? `: ${blockedCategories}` : ""}. Попробуйте другое видео.`
    );
  }

  if (candidate?.finishReason === "OTHER") {
    throw new Error(
      "Gemini не смог обработать видео по неизвестной причине. Попробуйте другое видео или повторите попытку позже."
    );
  }

  try {
    return response.text();
  } catch (error) {
    // If .text() threw an exception, give a clear message
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("blocked")) {
      throw new Error(
        "Контент заблокирован модерацией Gemini. Видео может содержать неприемлемый контент. Попробуйте другое видео."
      );
    }
    throw error;
  }
}

export function parseDuration(
  duration: number | string | null | undefined
): number | null {
  return typeof duration === "string"
    ? Number.parseInt(duration, 10) || null
    : (duration ?? null);
}

export function parseRawAnalysis(raw: GeminiRawAnalysis): VideoAnalysis {
  // Limit to 6 elements (take first - most important by AI ranking)
  let elements = raw.elements || [];
  if (elements.length > 6) {
    elements = elements.slice(0, 6);
  }

  return {
    duration: parseDuration(raw.duration),
    aspectRatio: raw.aspectRatio || "9:16",
    tags: raw.tags || [],
    elements,
  };
}

export function parseRawAnalysisWithoutOptions(
  raw: RawAnalysisWithoutOptions
): VideoAnalysisWithoutOptions {
  // Limit to 6 elements
  let elements = raw.elements || [];
  if (elements.length > 6) {
    elements = elements.slice(0, 6);
  }

  return {
    duration: parseDuration(raw.duration),
    aspectRatio: raw.aspectRatio || "9:16",
    tags: raw.tags || [],
    elements,
  };
}
