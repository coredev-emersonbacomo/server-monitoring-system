import createClient, {
    type Client,
    type FetchOptions,
    type ParseAsResponse,
} from "openapi-fetch";
import type {
    ErrorStatus,
    FilterKeys,
    HttpMethod,
    MediaType,
    OkStatus,
    PathsWithMethod,
    RequiredKeysOf,
} from "openapi-typescript-helpers";
import type { paths } from "./schema";
import { getAccessToken, refreshAccessToken } from "./tokenManager";

type InitParam<Init> = RequiredKeysOf<Init> extends never
    ? [(Init & { [key: string]: unknown })?]
    : [Init & { [key: string]: unknown }];

type FriendlyMaybeOptionalInit<PathItem, Method extends HttpMethod> = RequiredKeysOf<
    FetchOptions<FilterKeys<PathItem, Method>>
> extends never
    ? FetchOptions<FilterKeys<PathItem, Method>> | undefined
    : FetchOptions<FilterKeys<PathItem, Method>>;

type OperationFor<
    Paths,
    Path extends keyof Paths,
    Method extends HttpMethod,
> = Method extends keyof Paths[Path] ? Paths[Path][Method] : never;

type ResponseContent<Response, Media extends MediaType> = Response extends unknown
    ? Response extends { content: infer Content }
        ? Content extends Record<string, unknown>
            ? FilterKeys<Content, Media> extends never
                ? Content[keyof Content]
                : FilterKeys<Content, Media>
            : never
        : never
    : never;

type SuccessData<Operation, Media extends MediaType> = Operation extends {
    responses: infer Responses;
}
    ? ResponseContent<FilterKeys<Responses, OkStatus>, Media>
    : never;

type ErrorData<Operation, Media extends MediaType> = Operation extends {
    responses: infer Responses;
}
    ? ResponseContent<FilterKeys<Responses, ErrorStatus>, Media>
    : never;

type FriendlyFetchResponse<Operation, Options, Media extends MediaType> =
    | {
          data: ParseAsResponse<SuccessData<Operation, Media>, Options>;
          error?: never;
          response: Response;
      }
    | {
          data?: never;
          error: ErrorData<Operation, Media>;
          response: Response;
      };

type FriendlyClientMethod<
    Paths extends object,
    Method extends HttpMethod,
    Media extends MediaType,
> = <
    Path extends keyof Paths & PathsWithMethod<Paths, Method>,
    Init extends FriendlyMaybeOptionalInit<Paths[Path], Method>,
>(
    url: Path,
    ...init: InitParam<Init>
) => Promise<
    FriendlyFetchResponse<OperationFor<Paths, Path, Method>, Init, Media>
>;

type FriendlyClient<Paths extends object> = Omit<Client<Paths>, "GET"> & {
    GET: FriendlyClientMethod<Paths, "get", `${string}/json`>;
};
const rawApi = createClient<paths>({
    baseUrl: "/api",
    credentials: "include",
    headers: {
        Accept: "application/json",
    },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        const headers = new Headers(request.headers);

        const token = getAccessToken();
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        let response = await fetch(new Request(request, { headers }));

        if (response.status === 401 && token) {
            try {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    headers.set("Authorization", `Bearer ${newToken}`);
                    response = await fetch(new Request(request, { headers }));
                } else {
                    window.dispatchEvent(new CustomEvent("auth:logout"));
                }
            } catch {
                window.dispatchEvent(new CustomEvent("auth:logout"));
            }
        }

        return response;
    },
});

const api = rawApi as FriendlyClient<paths>;

export default api;
