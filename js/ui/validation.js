export function validateManualRaidEntry({ type, description }) {
  const errors = [];
  if (!type) errors.push("RAID entry type is required.");
  if (!description || !description.trim()) errors.push("RAID entry description is required.");
  return errors;
}

export function validateManualCost({ low, high }) {
  const errors = [];
  if (!Number.isFinite(low) || low < 0) errors.push("Low estimate must be a non-negative number.");
  if (!Number.isFinite(high) || high < 0) errors.push("High estimate must be a non-negative number.");
  if (Number.isFinite(low) && Number.isFinite(high) && low > high) {
    errors.push("Low estimate cannot exceed the high estimate.");
  }
  return errors;
}
