import {
  SurveyCardData,
  PaginatedResponse,
  ApiResponse,
  Survey,
} from "@shared/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// API functions
async function fetchSurveysForHome(
  page: number = 1,
  limit: number = 10,
  status: string = "active",
  programIds?: number[],
  questionnaireIds?: number[],
  creatorIds?: number[],
  groupId?: number,
  creationDateFrom?: string,
  creationDateTo?: string,
): Promise<PaginatedResponse<SurveyCardData>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });

  if (programIds?.length) {
    programIds.forEach((id) => params.append("programIds", id));
  }
  if (questionnaireIds?.length) {
    questionnaireIds.forEach((id) => params.append("questionnaireIds", id));
  }
  if (creatorIds?.length) {
    creatorIds.forEach((id) => params.append("creatorIds", id));
  }
  if (groupId) {
    params.append("groupId", String(groupId));
  }
  if (creationDateFrom) {
    params.append("creationDateFrom", creationDateFrom);
  }
  if (creationDateTo) {
    params.append("creationDateTo", creationDateTo);
  }

  return api<PaginatedResponse<SurveyCardData>>(
    `${API_BASE}/surveys/home?${params.toString()}`,
  );
}

async function fetchSurveyById(id: number): Promise<Survey> {
  return api<Survey>(`${API_BASE}/surveys/${id}`);
}

async function createSurvey(
  surveyData: Omit<Survey, "id" | "created_at">,
): Promise<Survey> {
  return api<Survey>(`${API_BASE}/surveys`, {
    method: "POST",
    body: JSON.stringify(surveyData),
  });
}

async function updateSurvey(
  id: number,
  surveyData: Partial<Survey>,
): Promise<Survey> {
  return api<Survey>(`${API_BASE}/surveys/${id}`, {
    method: "PUT",
    body: JSON.stringify(surveyData),
  });
}

async function deleteSurvey(id: number): Promise<void> {
  await api(`${API_BASE}/surveys/${id}`, {
    method: "DELETE",
  });
}

// React Query hooks
export function useSurveys(
  page: number = 1,
  limit: number = 10,
  status: string = "active",
  programIds?: number[],
  questionnaireIds?: number[],
  creatorIds?: number[],
  groupId?: number,
  creationDateFrom?: string,
  creationDateTo?: string,
) {
  return useQuery({
    queryKey: [
      "surveys",
      "home",
      page,
      limit,
      status,
      programIds,
      questionnaireIds,
      creatorIds,
      groupId,
      creationDateFrom,
      creationDateTo,
    ],
    queryFn: () =>
      fetchSurveysForHome(
        page,
        limit,
        status,
        programIds,
        questionnaireIds,
        creatorIds,
        groupId,
        creationDateFrom,
        creationDateTo,
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSurvey(id: number) {
  return useQuery({
    queryKey: ["surveys", id],
    queryFn: () => fetchSurveyById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSurvey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surveys"] }),
  });
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Survey> }) =>
      updateSurvey(id, data),
    onSuccess: (updatedSurvey: Survey) => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({
        queryKey: ["surveys", updatedSurvey.id],
      });
    },
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surveys"] }),
  });
}
