/**
 * Unit conversion utilities for weight and height
 * Handles conversion between metric and imperial units
 */

/**
 * Convert weight from one unit system to another
 * @param weightValue - The weight value as a string (number only, no units)
 * @param fromUnits - Current unit system ('metric' or 'imperial')
 * @param toUnits - Target unit system ('metric' or 'imperial')
 * @returns Converted weight value as a string
 */
export function convertWeight(
  weightValue: string,
  fromUnits: 'metric' | 'imperial',
  toUnits: 'metric' | 'imperial'
): string {
  if (fromUnits === toUnits || !weightValue) {
    return weightValue;
  }

  // Extract numeric value
  const match = weightValue.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return weightValue;
  }

  const numericValue = parseFloat(match[1]);
  if (isNaN(numericValue) || numericValue <= 0) {
    return weightValue;
  }

  // Convert: kg to lbs (multiply by 2.20462) or lbs to kg (divide by 2.20462)
  let converted: number;
  if (fromUnits === 'metric' && toUnits === 'imperial') {
    // kg to lbs
    converted = numericValue * 2.20462;
  } else {
    // lbs to kg
    converted = numericValue / 2.20462;
  }

  // Round to 1 decimal place for display
  return converted.toFixed(1);
}

/**
 * Convert height from one unit system to another
 * @param heightValue - The height value as a string
 * @param fromUnits - Current unit system ('metric' or 'imperial')
 * @param toUnits - Target unit system ('metric' or 'imperial')
 * @returns Converted height value as a string
 */
export function convertHeight(
  heightValue: string,
  fromUnits: 'metric' | 'imperial',
  toUnits: 'metric' | 'imperial'
): string {
  if (fromUnits === toUnits || !heightValue) {
    return heightValue;
  }

  let converted: string;

  if (fromUnits === 'metric' && toUnits === 'imperial') {
    // cm to feet'inches"
    const cmMatch = heightValue.match(/(\d+(?:\.\d+)?)/);
    if (!cmMatch) {
      return heightValue;
    }

    const cm = parseFloat(cmMatch[1]);
    if (isNaN(cm) || cm <= 0) {
      return heightValue;
    }

    // Convert cm to total inches
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);

    converted = `${feet}'${inches}"`;
  } else {
    // feet'inches" to cm
    const imperialMatch = heightValue.match(/(\d+)'(\d+)?/);
    if (!imperialMatch) {
      return heightValue;
    }

    const feet = parseInt(imperialMatch[1]);
    const inches = parseInt(imperialMatch[2] || '0');

    if (isNaN(feet) || isNaN(inches) || feet < 0 || inches < 0) {
      return heightValue;
    }

    // Convert to cm
    const totalInches = feet * 12 + inches;
    const cm = totalInches * 2.54;

    // Round to nearest whole number for cm
    converted = Math.round(cm).toString();
  }

  return converted;
}

