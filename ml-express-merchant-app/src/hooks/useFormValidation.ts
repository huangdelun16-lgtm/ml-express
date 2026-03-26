import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  custom?: (value: any) => boolean;
  message: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string;
}

export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  rules: ValidationRules
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as any);

  const validateField = useCallback(
    (name: keyof T, value: any): string => {
      const fieldRules = rules[name as string];
      if (!fieldRules) return '';

      for (const rule of fieldRules) {
        if (rule.required && (value === null || value === undefined || value === '')) {
          return rule.message;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          return rule.message;
        }
        if (rule.minLength && String(value).length < rule.minLength) {
          return rule.message;
        }
        if (rule.maxLength && String(value).length > rule.maxLength) {
          return rule.message;
        }
        if (rule.custom && !rule.custom(value)) {
          return rule.message;
        }
      }
      return '';
    },
    [rules]
  );

  const handleChange = useCallback(
    (name: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      
      // 如果已经接触过该字段，实时验证
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, values[name]);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    },
    [values, validateField]
  );

  const validateAll = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // 标记所有字段为已接触
    const newTouched: any = {};

    Object.keys(rules).forEach((key) => {
      newTouched[key] = true;
      const error = validateField(key as keyof T, values[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    setTouched((prev) => ({ ...prev, ...newTouched }));
    setErrors(newErrors);
    return isValid;
  }, [rules, values, validateField]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({} as any);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    resetForm,
    setValues,
  };
};

