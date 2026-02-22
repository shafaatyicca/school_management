// ===========Calculate Tenure for student and employee ==============
export const calculateTenure = (
  joiningDate: any,
  endDate: any,
  status?: string,
) => {
  if (!joiningDate) return "---";

  const start = new Date(joiningDate);
  const end = endDate && status === "inactive" ? new Date(endDate) : new Date(); // Current date

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);

  return parts.length > 0 ? parts.join(", ") : "Less than a day";
};

// ===========Age calculator ==============
export const calculateAge = (dateOfBirth: any) => {
  if (!dateOfBirth) return "---";

  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);

  return parts.length > 0 ? parts.join(", ") : "Less than a day";
};

// =========== Date formatter bhi add kar do =============
export const formatDate = (date: any, format: "short" | "long" = "short") => {
  if (!date) return "---";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: format === "short" ? "short" : "long",
    year: "numeric",
  }).format(new Date(date));
};
