import { isFunction } from "@brdp/utils";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { queryClient } from "../configs/react-query";
import { http } from "./http/http";
import { URLsType } from "./http/url";

export type APIResponseType<Result = unknown> = {
  errorList: null;
  isSuccess: boolean;
  message: string | null;
  resultData: Result;
  rsCode: string;
};

export type RequestError = {
  rsCode: string;
  message: string;
  resultData: null;
  isSuccess: false;
  errorList:
    | {
        code?: string | null;
        desc: string;
        paramName?: string | null;
        paramPath?: string | null;
      }[]
    | []
    | null
    | string[];
};

type GetFetcherType = {
  /**
   * will throw the request error to the function call,
   * by default we will handle the errors on http module.
   */
  raw?: boolean;
  /**
   * on silent will not show any toast, also handle errors
   * in the http module.
   */
  silent?: boolean;
  /**
   * in this the request won't fire automatically, and waits
   * for the trigger.
   */
  enable?: boolean;
  /**
   * with this the request will hold the previous data and won't
   * reset data till new data settle.
   */
  hasPagination?: boolean;
  /**
   * by default there is not cache, but user is able to activate it
   * for certain requests.
   */
  cache?: boolean;
};

type WithFileUpload = {
  withFileUpload?: boolean;
};

type PostOptionsType = Omit<GetFetcherType, "enable"> & WithFileUpload;

type PutOptionsType = Omit<GetFetcherType, "enable"> & WithFileUpload;

type PatchOptionsType = Omit<GetFetcherType, "enable"> & WithFileUpload;

export const useGet = <Response = unknown, Error = RequestError>(
  key: QueryKey,
  url: URLsType,
  options?: GetFetcherType,
) => {
  const _key: QueryKey = useMemo(() => [...key, url], [key, url]);
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      if (!options?.cache) {
        console.log(
          `%c[${new Date().toLocaleTimeString()}] useGet unmounted. Removing query from cache: ${_key}`,
          "color: purple",
        );

        queryClient.removeQueries({ queryKey: _key });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { refetch, data, ...query } = useQuery<APIResponseType<Response>, Error>({
    queryKey: _key,
    queryFn: async ({ signal }) => {
      try {
        const res = await http.get<APIResponseType<Response>>(url, {
          ...options,
          signal,
        });
        return res.data;
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw (error as any).response?.data;
        }

        throw error;
      }
    },
    enabled: (options && options.enable) === false ? false : true,
    // select: (data) => data,
    placeholderData: options?.hasPagination ? keepPreviousData : undefined,
  });

  const mutate = () => {
    return refetch();
  };

  const cancel = async () => {
    return await queryClient.cancelQueries({
      queryKey: [...key],
    });
  };

  const reset = () => {
    const baseUrl = url.split('?')[0];

    queryClient.setQueriesData<null>({
      predicate: (query) => {
        return JSON.stringify(query.queryKey).includes(baseUrl);
      },
      exact: false,
      type: 'all',
    }, () => null);
  };

  return { ...query, data, mutate, cancel, reset };
};

export const usePost = <
  Response = unknown,
  Data = unknown,
  Error = RequestError,
  URLType = ((params: Data) => string) | URLsType,
>(
  url: URLType,
  options?: PostOptionsType,
) => {
  const {
    mutateAsync: qMutate,
    reset,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Data>({
    mutationKey: [url],
    mutationFn: async (data: Data) => {
      const { withFileUpload, ...otherOptions } = options ?? {};

      try {
        const response = await http.post<APIResponseType<Response>, Data>(
          isFunction(url)
            ? ((url as (params: Data) => string)(data) as string)
            : (url as string),
          data,
          {
            ...otherOptions,
            headers: {
              ...(withFileUpload ? { "Content-Type": "multipart/form-data" } : {}),
            },
          },
        );

        return response.data; // explicitly return the correct response data
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw (error as any).response?.data || error.message; // ensure errors are thrown properly
        }

        throw error;
      }
    },
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: [url] });
  };

  const mutate = async (data: Data) => {
    // reset();
    return qMutate(data);
  };

  return { ...query, mutate, reset, cancel, isLoading: isPending };
};

export const usePut = <
  Response = unknown,
  Data = unknown,
  Error = RequestError,
  URLType = ((params: Data) => string) | URLsType,
>(
  url: URLType,
  options?: PutOptionsType,
) => {
  const {
    mutateAsync: qMutate,
    reset,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Data>({
    mutationKey: [url],
    mutationFn: async (data: Data) => {
      const { withFileUpload, ...otherOptions } = options ?? {};

      try {
        const response = await http.put<APIResponseType<Response>, Data>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isFunction(url) ? (url as any)(data) : url,
          data,
          {
            ...otherOptions,
            headers: {
              ...(withFileUpload ? { "Content-Type": "multipart/form-data" } : {}),
            },
          },
        );

        return response.data; // explicitly return the correct response data
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw (error as any).response?.data || error.message; // ensure errors are thrown properly
        }

        throw error;
      }
    },
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: [url] });
  };

  const mutate = async (data: Data) => {
    // reset();
    return qMutate(data);
  };

  return { ...query, mutate, reset, cancel, isLoading: isPending };
};

export const usePatch = <
  Response = unknown,
  Data = unknown,
  Error = RequestError,
  URLType = ((params: Data) => string) | URLsType,
>(
  url: URLType,
  options?: PatchOptionsType,
) => {
  const {
    mutateAsync: qMutate,
    data,
    reset,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Data>({
    mutationKey: [url],
    mutationFn: async (data: Data) => {
      const { withFileUpload, ...otherOptions } = options ?? {};

      try {
        const response = await http.patch<APIResponseType<Response>, Data>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isFunction(url) ? (url as any)(data) : url,
          data,
          {
            ...otherOptions,
            headers: {
              ...(withFileUpload ? { "Content-Type": "multipart/form-data" } : {}),
            },
          },
        );

        return response.data; // explicitly return the correct response data
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw (error as any).response?.data || error.message; // ensure errors are thrown properly
        }

        throw error;
      }
    },
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: [url] });
  };

  const mutate = async (data: Data) => {
    // reset();
    return qMutate(data);
  };

  return { ...query, data, mutate, reset, cancel, isLoading: isPending };
};

export const useDelete = <
  Response = unknown,
  Data = unknown,
  Error = RequestError,
  URLType = ((params: Data) => string) | URLsType,
>(
  url: URLType,
  options?: Omit<GetFetcherType, "enable">,
) => {
  const {
    mutateAsync: qMutate,
    reset,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Data>({
    mutationKey: [url],
    mutationFn: async (data: Data) => {
      try {
        const response = await http.delete<APIResponseType<Response>>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isFunction(url) ? (url as any)(data) : url,
          { ...options },
        );
        return response.data; // explicitly return the correct response data
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw (error as any).response?.data || error.message; // ensure errors are thrown properly
        }

        throw error;
      }
    },
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: [url], exact: true });
  };

  const mutate = async (data: Data) => {
    return qMutate(data);
  };

  return { ...query, mutate, reset, cancel, isLoading: isPending };
};

export type GetFileOptions = {
  /** if false, query will not automatically run until you call mutate() */
  enable?: boolean;
  /** any other flags you want to pass through */
  silent?: boolean;
};

export const useGetFile = (
  key: QueryKey,
  url: URLsType,
  options: GetFileOptions = {},
) => {
  const _key = useMemo(() => [...key, url], [key, url]);

  const {
    data: blob,
    refetch,
    isFetching,
    error,
  } = useQuery<Blob, unknown>({
    queryKey: _key,
    queryFn: async ({ signal }) => {
      const finalUrl = isFunction(url) ? url() : url;
      const response = await http.get<Blob>(finalUrl, {
        responseType: "blob",
        signal,
      });
      return response.data;
    },
    enabled: options.enable === false ? false : true,
    // we don’t need cache‐staleness handling here
  });

  const mutate = async () => {
    const result = await refetch();
    return result.data!;
  };

  const cancel = async () => {
    await queryClient.cancelQueries({ queryKey: _key, exact: true });
  };

  return {
    /** the downloaded blob (only set after mutate() resolves) */
    data: blob,
    /** call this to actually fire the GET and receive a Blob */
    mutate,
    /** loading flag while the file is downloading */
    isLoading: isFetching,
    /** any error that occurred */
    error,
    /** cancel an in‐flight download */
    cancel,
  };
};

export const usePostFile = <
  Response = unknown,
  Data = unknown,
  Error = RequestError,
  URLType = ((params: Data) => string) | URLsType,
>(
  url: URLType,
  options?: Omit<GetFetcherType, "enable">,
) => {
  const {
    mutateAsync: qMutate,
    reset,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Data>({
    mutationKey: [url],
    mutationFn: async (data: Data) => {
      try {
        const formData = new FormData();
        Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
          formData.append(key, value as Blob | string);
        });

        const response = await http.post<APIResponseType<Response>, FormData>(
          isFunction(url)
            ? ((url as (params: Data) => string)(data) as string)
            : (url as string),
          formData,
          {
            ...options,
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        console.log("useHttp()", data);
        return response.data; // explicitly return the correct response data
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw (error as any).response?.data || error.message; // ensure errors are thrown properly
        }

        throw error;
      }
    },
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: [url], exact: true });
  };

  const mutate = async (data: Data) => {
    return qMutate(data);
  };

  return { ...query, mutate, reset, cancel, isLoading: isPending };
};

export const useGetFileMutation = <
  Data = unknown,
  Error = RequestError,
  URLType = ((params: Data) => string) | URLsType,
>(
  url: URLType,
) => {
  const {
    mutateAsync: qMutate,
    reset,
    isPending,
    ...query
  } = useMutation<Blob, Error, Data>({
    mutationKey: [url],
    mutationFn: async (data: Data) => {
      try {
        const response = await http.get<Blob>(
          isFunction(url) ? (url(data) as string) : (url as string),
          {
            raw: true,
            responseType: "blob",
          },
        );

        return response.data as Blob;
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw (error as any).response?.data || error.message; // ensure errors are thrown properly
        }

        throw error;
      }
    },
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: [url], exact: true });
  };

  const mutate = async (data: Data) => {
    return qMutate(data);
  };

  return { ...query, mutate, reset, cancel, isLoading: isPending };
};

export const usePostDownloadFile = <
  Data = unknown,
  Error = RequestError,
  URLType = ((params: Data) => string) | URLsType,
>(
  url: URLType,
) => {
  const {
    mutateAsync: qMutate,
    reset,
    isPending,
    ...query
  } = useMutation<Blob, Error, Data>({
    mutationKey: [url],
    mutationFn: async (data: Data) => {
      try {
        const response = await http.post<Blob, Data>(
          isFunction(url)
            ? ((url as (params: Data) => string)(data) as string)
            : (url as string),
          data,
          {
            responseType: "blob",
          },
        );

        return response.data; // explicitly return the correct response data
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          throw (error as any).response?.data || error.message; // ensure errors are thrown properly
        }

        throw error;
      }
    },
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: [url] });
  };

  const mutate = async (data: Data) => {
    // reset();
    return qMutate(data);
  };

  return { ...query, mutate, reset, cancel, isLoading: isPending };
};
