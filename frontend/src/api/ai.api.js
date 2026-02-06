import api from "./index";

export const generateAI = (contentId) => {
  return api.post(`/ai/generate/${contentId}`);
};
