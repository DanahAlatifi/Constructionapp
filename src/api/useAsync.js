import { useState, useEffect, useCallback } from 'react';

// خطّاف عام لتحميل بيانات مع حالات تحميل/خطأ
// initial: القيمة الابتدائية قبل وصول البيانات (افتراضياً [] لتفادي أخطاء .length على null)
export function useAsync(fn, deps = [], initial = []) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await fn();
      setData(result == null ? initial : result);
    } catch (e) {
      setError(e.message || 'تعذّر التحميل');
      setData(initial);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => { run(); }, [run]);
  return { data, loading, error, reload: run };
}
