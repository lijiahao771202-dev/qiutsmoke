export type GenerateRevisionMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GenerateRevisionPayload = {
  currentDraft?: unknown;
  feedback?: unknown;
  history?: unknown;
};

export type NormalizedGenerateRevision = {
  currentDraft: string;
  feedback: string;
  history: GenerateRevisionMessage[];
};

export const MAX_REVISION_HISTORY_MESSAGES = 8;
const MAX_REVISION_HISTORY_CONTENT_CHARS = 1800;
const MAX_REVISION_FEEDBACK_CHARS = 3000;

function trimToMax(value: unknown, maxChars: number) {
  return String(value ?? "").trim().slice(0, maxChars);
}

export function normalizeGenerateRevision(
  revision: GenerateRevisionPayload | null | undefined
): NormalizedGenerateRevision | null {
  const feedback = trimToMax(revision?.feedback, MAX_REVISION_FEEDBACK_CHARS);
  if (!feedback) return null;

  const history = Array.isArray(revision?.history)
    ? revision.history
        .filter((message): message is GenerateRevisionMessage => {
          if (!message || typeof message !== "object") return false;
          const role = (message as GenerateRevisionMessage).role;
          return role === "user" || role === "assistant";
        })
        .map((message) => ({
          role: message.role,
          content: trimToMax(message.content, MAX_REVISION_HISTORY_CONTENT_CHARS),
        }))
        .filter((message) => message.content.length > 0)
        .slice(-MAX_REVISION_HISTORY_MESSAGES)
    : [];

  return {
    currentDraft: String(revision?.currentDraft ?? ""),
    feedback,
    history,
  };
}

export function buildRevisionGenerationUserPrompt(
  baseUserPrompt: string,
  revision: NormalizedGenerateRevision
) {
  const historyBlock = revision.history.length
    ? revision.history
        .map((message, index) => {
          const label = message.role === "user" ? "用户评价" : "AI上一版重写稿";
          return `${index + 1}. ${label}：\n${message.content}`;
        })
        .join("\n\n")
    : "无";

  return `${baseUserPrompt}

【评价重写模式】
你现在不是首次生成，而是在根据用户对上一版完整稿的评价，重新生成一版完整最终稿。

硬性要求：
- 必须重新生成一版完整最终稿，从开头到结束完整输出。
- 不要局部 patch，不要只修改片段，不要输出差异说明。
- 不要解释你改了什么，不要输出对话，不要写“根据你的反馈”。
- 保持原任务的主题、时长、引导模式、格式规则、[pause] 规则和正念写作原则。
- 用户评价优先级高于上一版措辞；上一版只作为问题参照和上下文，不要机械复述。
- 如果用户指出节奏、pause、语气、结构、体感颗粒度、时长不准等问题，必须在新稿中直接修正。

【用户评价 / 修改要求】
${revision.feedback}

【上一版完整正文】
${revision.currentDraft}

【本次会话最近评价上下文】
${historyBlock}`.trim();
}

