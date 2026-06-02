/* eslint-disable @tanstack/query/no-rest-destructuring */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { isFunction, systemLog } from "@brdp/utils";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useEffect, useEffectEvent, useMemo } from "react";
import { http } from "./http/http";
import { URLsType } from "./http/url";
import { useLongRequestNotifier } from "./useLongRequestNotifier";

type SuccessResponse<Result> = {
  isSuccess: true;
  errorList: null;
  message: string | null;
  resultData: Result;
  rsCode: string;
};

export type RequestError = {
  rsCode: string;
  message: string;
  resultData: never;
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

export type APIResponseType<Result = unknown> =
  | SuccessResponse<Result>
  | RequestError;

type LongRequestOptions = {
  notifyOnLongRequest?: boolean;
  longRequestThreshold?: number;
  longRequestMessage?: string;
};

type GetFetcherType<TQueryFnData = unknown, TData = TQueryFnData> = {
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
   * for the trigger (`mutate()` should be called manually).
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
  /**
   * Transform the data from the query function before it is returned.
   */
  select?: (data: TQueryFnData) => TData;
} & LongRequestOptions;

type WithFileUpload = {
  withFileUpload?: boolean;
};

export type MutationCallbacks<TData = unknown, TError = unknown, TVariables = unknown> = {
  onSuccess?: (data: TData, variables: TVariables) => Promise<unknown> | void;
  onError?: (error: TError, variables: TVariables) => Promise<unknown> | void;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
  ) => Promise<unknown> | void;
};

type BaseMutationOptions<TData = unknown, TError = unknown, TVariables = unknown> = Omit<
  GetFetcherType,
  "enable" | "select" | "hasPagination" | "cache"
> &
  WithFileUpload &
  LongRequestOptions &
  MutationCallbacks<TData, TError, TVariables> & {
    /**
     * List of query keys to refetch after mutation is successful
     */
    refetch?: string[];
  };

type PostOptionsType<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
> = BaseMutationOptions<TData, TError, TVariables>;

type PutOptionsType<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
> = BaseMutationOptions<TData, TError, TVariables>;

type PatchOptionsType<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
> = BaseMutationOptions<TData, TError, TVariables>;

type DeleteOptionsType<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
> = BaseMutationOptions<TData, TError, TVariables>;

type GetFileOptionsType = {
  enable?: boolean;
} & LongRequestOptions;

export const useGet = <
  Response = unknown,
  TData = APIResponseType<Response>,
  Error = RequestError,
>(
  key: QueryKey,
  url: URLsType,
  options?: GetFetcherType<APIResponseType<Response>, TData>,
) => {
  const _url = isFunction(url) ? url({}) : url;
  const _key: QueryKey = useMemo(() => [...key, _url], [key, _url]);
  const queryClient = useQueryClient();
  const { enable, hasPagination, select, cache, ...otherOptions } = options ?? {};

  const logger = useEffectEvent(() => {
    if (process.env.NODE_ENV === "development") {
      if (!cache) {
        systemLog.log(
          `%c[Cleanup] Removing query: ${_key}`,
          "color: purple; font-weight: bold",
        );
      }

      queryClient.removeQueries({ queryKey: _key });
    }
  });

  useEffect(() => {
    return () => {
      logger();
    };
  }, []);

  /**
   * useQuery Generics Order:
   * 1. TQueryFnData (What fetcher returns)
   * 2. TError (Error type)
   * 3. TData (What hook returns - result of select)
   * 4. TQueryKey (Key type)
   */
  const { refetch, data, ...query } = useQuery<APIResponseType<Response>, Error, TData>({
    queryKey: _key,
    queryFn: async ({ signal }) => {
      try {
        const res = await http.get<APIResponseType<Response>>(_url, {
          ...otherOptions,
          signal,
        });
        return res.data;
      } catch (error) {
        if (error instanceof Error) {
          throw (error as any).response?.data || error;
        }

        throw error;
      }
    },
    enabled: enable !== false,
    placeholderData: hasPagination ? keepPreviousData : undefined,
    select: select,
    staleTime: cache ? Infinity : 0,
    // behavior: () => {},
    // initialData: [],
    // meta: {},
    // retry: (failureCount: number, error: TError) => boolean,
  });

  useLongRequestNotifier({
    key: _key,
    isPending: query.isFetching,
    enable: options?.notifyOnLongRequest,
    threshold: options?.longRequestThreshold,
    message: options?.longRequestMessage,
  });

  const mutate = () => {
    return refetch();
  };

  const cancel = async () => {
    return await queryClient.cancelQueries({
      queryKey: key,
    });
  };

  const reset = () => {
    const baseUrl = _url.split("?")[0];

    queryClient.setQueriesData<null>(
      {
        predicate: (query) => {
          return JSON.stringify(query.queryKey).includes(baseUrl);
        },
        exact: false,
        type: "all",
      },
      () => null,
    );
  };

  return { ...query, data, mutate, cancel, reset };
};

export const usePost = <
  Response = unknown,
  Data = unknown,
  Error = RequestError,
  URLType = URLsType,
>(
  url: URLType,
  options?: PostOptionsType<APIResponseType<Response>, Error, Data>,
) => {
  const _url = isFunction(url) ? url() : url;
  const _key: QueryKey = useMemo(() => [_url], [_url]);
  const queryClient = useQueryClient();
  const { withFileUpload, onSuccess, onError, onSettled, ...otherOptions } =
    options ?? {};

  const {
    mutateAsync: qMutate,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Data>({
    mutationKey: _key,
    onSuccess: async (data, variables) => {
      if (isFunction(onSuccess)) {
        await onSuccess(data, variables);
      }

      if (options?.refetch) {
        await queryClient.refetchQueries({
          predicate: (query) => !!options.refetch?.includes(String(query.queryKey[0])),
        });
      }
    },
    onError,
    onSettled,
    meta: {
      invalidateQueryKey: options?.refetch,
    },
    mutationFn: async (data: Data) => {
      try {
        const response = await http.post<APIResponseType<Response>, Data>(_url, data, {
          ...otherOptions,
          headers: withFileUpload ? { "Content-Type": "multipart/form-data" } : {},
        });

        return response.data;
      } catch (error) {
        if (error instanceof Error) {
          throw (error as any).response?.data || error.message;
        }

        throw error;
      }
    },
  });

  useLongRequestNotifier({
    key: _key,
    isPending: isPending,
    enable: options?.notifyOnLongRequest,
    threshold: options?.longRequestThreshold,
    message: options?.longRequestMessage,
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: _key });
  };

  const mutate = async (data: Data) => {
    // reset();
    return qMutate(data);
  };

  return { ...query, mutate, cancel, isLoading: isPending };
};

export const usePut = <
  Response = unknown,
  Data = unknown,
  Error = RequestError,
  URLType = URLsType,
>(
  url: URLType,
  options?: PutOptionsType<APIResponseType<Response>, Error, Data>,
) => {
  const _url = isFunction(url) ? url() : url;
  const _key: QueryKey = useMemo(() => [_url], [_url]);
  const queryClient = useQueryClient();
  const { withFileUpload, onSuccess, onError, onSettled, ...otherOptions } =
    options ?? {};

  const {
    mutateAsync: qMutate,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Data>({
    mutationKey: _key,
    onSuccess: async (data, variables) => {
      if (isFunction(onSuccess)) {
        await onSuccess(data, variables);
      }

      if (options?.refetch) {
        await queryClient.refetchQueries({
          predicate: (query) => !!options.refetch?.includes(String(query.queryKey[0])),
        });
      }
    },
    onError,
    onSettled,
    meta: {
      invalidateQueryKey: options?.refetch,
    },
    mutationFn: async (data: Data) => {
      try {
        const response = await http.put<APIResponseType<Response>, Data>(_url, data, {
          ...otherOptions,
          headers: withFileUpload ? { "Content-Type": "multipart/form-data" } : {},
        });

        return response.data;
      } catch (error) {
        if (error instanceof Error) {
          throw (error as any).response?.data || error.message;
        }

        throw error;
      }
    },
  });

  useLongRequestNotifier({
    key: _key,
    isPending: isPending,
    enable: options?.notifyOnLongRequest,
    threshold: options?.longRequestThreshold,
    message: options?.longRequestMessage,
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: _key });
  };

  const mutate = async (data: Data) => {
    // reset();
    return qMutate(data);
  };

  return { ...query, mutate, cancel, isLoading: isPending };
};

export const usePatch = <
  Response = unknown,
  Data = unknown,
  Error = RequestError,
  URLType = URLsType,
>(
  url: URLType,
  options?: PatchOptionsType<APIResponseType<Response>, Error, Data>,
) => {
  const _url = isFunction(url) ? url() : url;
  const _key: QueryKey = useMemo(() => [_url], [_url]);
  const queryClient = useQueryClient();
  const { withFileUpload, onSuccess, onError, onSettled, ...otherOptions } =
    options ?? {};

  const {
    mutateAsync: qMutate,
    data,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Data>({
    mutationKey: _key,
    onSuccess: async (data, variables) => {
      if (isFunction(onSuccess)) {
        await onSuccess(data, variables);
      }

      if (options?.refetch) {
        await queryClient.refetchQueries({
          predicate: (query) => !!options.refetch?.includes(String(query.queryKey[0])),
        });
      }
    },
    onError,
    onSettled,
    meta: {
      invalidateQueryKey: options?.refetch,
    },
    mutationFn: async (data: Data) => {
      try {
        const response = await http.patch<APIResponseType<Response>, Data>(_url, data, {
          ...otherOptions,
          headers: withFileUpload ? { "Content-Type": "multipart/form-data" } : {},
        });

        return response.data;
      } catch (error) {
        if (error instanceof Error) {
          throw (error as any).response?.data || error.message;
        }

        throw error;
      }
    },
  });

  useLongRequestNotifier({
    key: _key,
    isPending: isPending,
    enable: options?.notifyOnLongRequest,
    threshold: options?.longRequestThreshold,
    message: options?.longRequestMessage,
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: _key });
  };

  const mutate = async (data: Data) => {
    // reset();
    return qMutate(data);
  };

  return { ...query, data, mutate, cancel, isLoading: isPending };
};

export const useDelete = <
  Response = unknown,
  Param = unknown,
  Error = RequestError,
  URLType = URLsType,
>(
  url: URLType,
  options?: DeleteOptionsType<APIResponseType<Response>, Error, Param>,
) => {
  const _key: QueryKey = useMemo(() => [url], [url]);
  const queryClient = useQueryClient();
  const { onSuccess, onError, onSettled, ...otherOptions } = options ?? {};

  const {
    mutateAsync: qMutate,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Param>({
    mutationKey: _key,
    onSuccess: async (data, variables) => {
      if (isFunction(onSuccess)) {
        await onSuccess(data, variables);
      }

      if (options?.refetch) {
        await queryClient.refetchQueries({
          predicate: (query) => !!options.refetch?.includes(String(query.queryKey[0])),
        });
      }
    },
    onError,
    onSettled,
    meta: {
      invalidateQueryKey: options?.refetch,
    },
    mutationFn: async (param) => {
      const _url = isFunction(url) ? url(param) : url;

      try {
        const response = await http.delete<APIResponseType<Response>>(_url, {
          ...otherOptions,
        });
        return response.data;
      } catch (error) {
        if (error instanceof Error) {
          throw (error as any).response?.data || error.message;
        }

        throw error;
      }
    },
  });

  useLongRequestNotifier({
    key: _key,
    isPending: isPending,
    enable: options?.notifyOnLongRequest,
    threshold: options?.longRequestThreshold,
    message: options?.longRequestMessage,
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: _key });
  };

  const mutate = async (data: Parameters<typeof qMutate>[0]) => {
    return qMutate(data);
  };

  return { ...query, mutate, cancel, isLoading: isPending };
};

export const useGetFile = (
  key: QueryKey,
  url: URLsType,
  options: GetFileOptionsType = {},
) => {
  const _url = isFunction(url) ? url({}) : url;
  const _key: QueryKey = useMemo(() => [...key, _url], [key, _url]);
  const queryClient = useQueryClient();

  const {
    data: blob,
    refetch,
    isFetching,
    error,
  } = useQuery<Blob, unknown>({
    queryKey: _key,
    queryFn: async ({ signal }) => {
      const response = await http.get<Blob>(_url, {
        raw: true,
        responseType: "blob",
        signal,
      });
      return response.data;
    },
    enabled: options?.enable !== false,
  });

  const mutate = async () => {
    const result = await refetch();
    return result.data!;
  };

  useLongRequestNotifier({
    key: _key,
    isPending: isFetching,
    enable: options?.notifyOnLongRequest,
    threshold: options?.longRequestThreshold,
    message: options?.longRequestMessage,
  });

  const cancel = async () => {
    await queryClient.cancelQueries({ queryKey: _key });
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
  URLType = URLsType,
>(
  url: URLType,
  options?: Omit<PostOptionsType, "withFileUpload">,
) => {
  const _url = isFunction(url) ? url() : url;
  const _key: QueryKey = useMemo(() => [_url], [_url]);
  const queryClient = useQueryClient();
  const { onSuccess, onError, onSettled, ...otherOptions } = options ?? {};

  const {
    mutateAsync: qMutate,
    isPending,
    ...query
  } = useMutation<APIResponseType<Response>, Error, Data>({
    mutationKey: _key,
    onSuccess: async (data, variables) => {
      if (isFunction(onSuccess)) {
        await onSuccess(data, variables);
      }

      if (options?.refetch) {
        await queryClient.refetchQueries({
          predicate: (query) => !!options.refetch?.includes(String(query.queryKey[0])),
        });
      }
    },
    onError,
    onSettled,
    meta: {
      invalidateQueryKey: options?.refetch,
    },
    mutationFn: async (data: Data) => {
      try {
        const formData = new FormData();
        Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
          formData.append(key, value as Blob | string);
        });

        const response = await http.post<APIResponseType<Response>, FormData>(
          _url,
          formData,
          {
            ...otherOptions,
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        return response.data;
      } catch (error) {
        if (error instanceof Error) {
          throw (error as any).response?.data || error.message;
        }

        throw error;
      }
    },
  });

  useLongRequestNotifier({
    key: _key,
    isPending: isPending,
    enable: options?.notifyOnLongRequest,
    threshold: options?.longRequestThreshold,
    message: options?.longRequestMessage,
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: _key });
  };

  const mutate = async (data: Data) => {
    return qMutate(data);
  };

  return { ...query, mutate, cancel, isLoading: isPending };
};

export const useGetFileMutation = <
  Param = unknown,
  Error = RequestError,
  URLType = URLsType,
>(
  url: URLType,
  options: GetFileOptionsType = {},
) => {
  const _key: QueryKey = useMemo(() => [url], [url]);
  const queryClient = useQueryClient();

  const {
    mutateAsync: qMutate,
    isPending,
    ...query
  } = useMutation<Blob, Error, Param>({
    mutationKey: _key,
    mutationFn: async (param) => {
      const _url = isFunction(url) ? url(param) : url;

      try {
        const response = await http.get<Blob>(_url, {
          ...options,
          raw: true,
          responseType: "blob",
        });

        return response.data as Blob;
      } catch (error) {
        if (error instanceof Error) {
          throw (error as any).response?.data || error.message;
        }

        throw error;
      }
    },
  });

  useLongRequestNotifier({
    key: _key,
    isPending: isPending,
    enable: options?.notifyOnLongRequest,
    threshold: options?.longRequestThreshold,
    message: options?.longRequestMessage,
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: _key });
  };

  const mutate = async (data: Parameters<typeof qMutate>[0]) => {
    return qMutate(data);
  };

  return { ...query, mutate, cancel, isLoading: isPending };
};

export const usePostDownloadFile = <
  Data = unknown,
  Error = RequestError,
  URLType = URLsType,
>(
  url: URLType,
  options?: PostOptionsType<Blob, Error, Data>,
) => {
  const _url = isFunction(url) ? url() : url;
  const _key: QueryKey = useMemo(() => [_url], [_url]);
  const queryClient = useQueryClient();
  const { onSuccess, onError, onSettled, ...otherOptions } = options ?? {};

  const {
    mutateAsync: qMutate,
    isPending,
    ...query
  } = useMutation<Blob, Error, Data>({
    mutationKey: _key,
    onSuccess: async (data, variables) => {
      if (isFunction(onSuccess)) {
        await onSuccess(data, variables);
      }

      if (options?.refetch) {
        await queryClient.refetchQueries({
          predicate: (query) => !!options.refetch?.includes(String(query.queryKey[0])),
        });
      }
    },
    onError,
    onSettled,
    meta: {
      invalidateQueryKey: options?.refetch,
    },
    mutationFn: async (data: Data) => {
      try {
        const response = await http.post<Blob, Data>(_url, data, {
          ...otherOptions,
          responseType: "blob",
        });

        return response.data;
      } catch (error) {
        if (error instanceof Error) {
          throw (error as any).response?.data || error.message;
        }

        throw error;
      }
    },
  });

  useLongRequestNotifier({
    key: _key,
    isPending: isPending,
    enable: options?.notifyOnLongRequest,
    threshold: options?.longRequestThreshold,
    message: options?.longRequestMessage,
  });

  const cancel = async () => {
    return await queryClient.cancelQueries({ queryKey: _key });
  };

  const mutate = async (data: Data) => {
    // reset();
    return qMutate(data);
  };

  return { ...query, mutate, cancel, isLoading: isPending };
};
