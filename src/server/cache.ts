import { updateTag } from "next/cache";

export const SHELL_CREATE_DATA_TAG = "shell-create-data";
export const HOME_DATA_TAG = "home-data";
export const REPORTS_DATA_TAG = "reports-data";
export const PERSONALIZATION_DATA_TAG = "personalization-data";

export function invalidateShellCreateData() {
  updateTag(SHELL_CREATE_DATA_TAG);
  updateTag(HOME_DATA_TAG);
}

export function invalidatePersonalizationData() {
  updateTag(PERSONALIZATION_DATA_TAG);
}

export function invalidateHomeData() {
  updateTag(HOME_DATA_TAG);
}

export function invalidateReportsData() {
  updateTag(REPORTS_DATA_TAG);
  updateTag(HOME_DATA_TAG);
}
