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
