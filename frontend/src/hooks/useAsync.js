import { useCallback, useEffect, useRef, useState } from 'react';

const initialState = {
  status: 'idle',
  data: null,
  error: null,
};

const useAsync = (asyncFunction, { immediate = true, deps = [] } = {}) => {
  const [state, setState] = useState(initialState);
  const mountedRef = useRef(true);

  const execute = useCallback(
    async (...args) => {
      setState({ status: 'pending', data: null, error: null });
      try {
        const data = await asyncFunction(...args);
        if (mountedRef.current) {
          setState({ status: 'success', data, error: null });
        }
        return data;
      } catch (error) {
        if (mountedRef.current) {
          setState({ status: 'error', data: null, error });
        }
        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  return { ...state, execute };
};

export default useAsync;
