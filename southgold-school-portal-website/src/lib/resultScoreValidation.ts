import { ResultRecord } from '../types';

export type ResultScoreField = 'ca1' | 'ca2' | 'ca3' | 'exam' | 'total';

export interface ResultScoreLimits {
  ca1Max: number;
  ca2Max: number;
  ca3Max: number;
  examMax: number;
  totalMax: number;
  receptionCa1Max: number;
  receptionExamMax: number;
}

export interface ResultScoreValidationError {
  field: ResultScoreField;
  message: string;
}

export class ResultScoreValidationException extends Error {
  fieldErrors: ResultScoreValidationError[];

  constructor(fieldErrors: ResultScoreValidationError[]) {
    super(fieldErrors.map(error => error.message).join(' '));
    this.name = 'ResultScoreValidationException';
    this.fieldErrors = fieldErrors;
  }
}

const asLimit = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
};

export const buildResultScoreLimits = (config?: {
  caTestMax?: number;
  caAssignmentMax?: number;
  examMax?: number;
}): ResultScoreLimits => {
  const ca1Max = 15;
  const ca2Max = 15;
  const ca3Max = 10;
  const examMax = 60;

  return {
    ca1Max,
    ca2Max,
    ca3Max,
    examMax,
    totalMax: 100,
    receptionCa1Max: 40,
    receptionExamMax: 60,
  };
};

export const unpackResultScores = (result: Pick<ResultRecord, 'testScore' | 'assignmentScore' | 'examScore' | 'totalScore'>) => {
  const ca1 = Number(result.testScore ?? 0);
  const packedAssignment = Number(result.assignmentScore ?? 0);
  const ca2 = packedAssignment % 100;
  const ca3 = Math.floor(packedAssignment / 100);
  const exam = Number(result.examScore ?? 0);
  const calculatedTotal = ca1 + ca2 + ca3 + exam;
  const total = Number(result.totalScore ?? calculatedTotal);

  return { ca1, ca2, ca3, exam, total, calculatedTotal };
};

export const validateScoreInput = (
  value: unknown,
  max: number,
  label: string
): string | null => {
  if (value === '' || value === null || value === undefined) {
    return `${label} is required.`;
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return `${label} must be a valid number.`;
  }
  if (numberValue < 0) {
    return `${label} cannot be below 0.`;
  }
  if (numberValue > max) {
    return `${label} cannot exceed ${max}.`;
  }
  return null;
};

export const validateResultScoreRecord = (
  result: Pick<ResultRecord, 'testScore' | 'assignmentScore' | 'examScore' | 'totalScore'>,
  limits: ResultScoreLimits,
  options: { isReception?: boolean } = {}
): ResultScoreValidationError[] => {
  const scores = unpackResultScores(result);
  const errors: ResultScoreValidationError[] = [];
  const checks: Array<[ResultScoreField, number, number, string]> = options.isReception
    ? [
        ['ca1', scores.ca1, limits.receptionCa1Max, 'Reception test / CA'],
        ['exam', scores.exam, limits.receptionExamMax, 'Reception exam'],
      ]
    : [
        ['ca1', scores.ca1, limits.ca1Max, 'CA1'],
        ['ca2', scores.ca2, limits.ca2Max, 'CA2'],
        ['ca3', scores.ca3, limits.ca3Max, 'CA3'],
        ['exam', scores.exam, limits.examMax, 'Exam'],
      ];

  checks.forEach(([field, value, max, label]) => {
    const message = validateScoreInput(value, max, label);
    if (message) errors.push({ field, message });
  });

  const totalMessage = validateScoreInput(scores.total, limits.totalMax, 'Total');
  if (totalMessage) {
    errors.push({ field: 'total', message: totalMessage });
  }

  if (scores.calculatedTotal > limits.totalMax) {
    errors.push({ field: 'total', message: `Calculated total cannot exceed ${limits.totalMax}.` });
  }

  return errors;
};

export const assertValidResultScores = (
  rows: Array<Pick<ResultRecord, 'testScore' | 'assignmentScore' | 'examScore' | 'totalScore' | 'classId'>>,
  limits: ResultScoreLimits,
  isReceptionClass: (classId?: string) => boolean
) => {
  const errors = rows.flatMap(row => validateResultScoreRecord(row, limits, { isReception: isReceptionClass(row.classId) }));
  if (errors.length > 0) {
    throw new ResultScoreValidationException(errors);
  }
};
