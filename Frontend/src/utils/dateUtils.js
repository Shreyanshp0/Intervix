/**
 * Formats an ISO date string for use in <input type="datetime-local">
 * Ensures valid format: YYYY-MM-DDThh:mm
 */
export function formatDateTimeLocal(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (isNaN(date.getTime()) || date.getFullYear() < 1000) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}