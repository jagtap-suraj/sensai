import { useState } from "react";
import { toast } from "sonner";

type FetchCallback<T, Args extends unknown[]> = (
  ...args: Args
) => Promise<T | null>;

interface UseFetchResult<T, Args extends unknown[]> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  fn: (...args: Args) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
}

const useFetch = <T, Args extends unknown[]>(
  cb: FetchCallback<T, Args>
): UseFetchResult<T, Args> => {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fn = async (...args: Args): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await cb(...args);
      if (response !== null) {
        setData(response);
      }
      setError(null);
    } catch (error) {
      setError(error as Error);
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fn, setData };
};

export default useFetch;
