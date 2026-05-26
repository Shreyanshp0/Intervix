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

  const pad = (value) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
