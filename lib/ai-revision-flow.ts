import {
  MAX_REVISION_HISTORY_MESSAGES,
  type GenerateRevisionMessage,
} from "./generate-revision";

export type RewriteStreamState = {
  previousText: string;
  displayText: string;
  hasReceivedFirstChunk: boolean;
};

export function createRewriteStreamState(previousText: string): RewriteStreamState {
  return {
    previousText,
    displayText: previousText,
    hasReceivedFirstChunk: false,
  };
}

export function applyRewriteStreamText(
  state: RewriteStreamState,
  nextText: string
): RewriteStreamState {
  if (!state.hasReceivedFirstChunk && nextText.length === 0) {
    return state;
  }

  return {
    previousText: state.previousText,
    displayText: nextText,
    hasReceivedFirstChunk: state.hasReceivedFirstChunk || nextText.length > 0,
  };
}

export function restorePreviousDraftAfterRewriteFailure(state: RewriteStreamState) {
  return state.previousText;
}

export function appendRevisionAssistantHistory(
  history: GenerateRevisionMessage[],
  feedback: string,
  assistantDraft: string
): GenerateRevisionMessage[] {
  return [
    ...history,
    { role: "user", content: feedback },
    { role: "assistant", content: assistantDraft },
  ].slice(-MAX_REVISION_HISTORY_MESSAGES);
}

export type { GenerateRevisionMessage };
