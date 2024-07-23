import { Route } from "@playwright/test";
import { Context, ParsedRequest } from "openapi-backend";
import { FetchResponse, RequestOptions } from "openapi-fetch";

import { operations, paths } from "./../../src/lib/api/api-schema";

export type HttpMethod =
  | "get"
  | "put"
  | "post"
  | "delete"
  | "options"
  | "head"
  | "patch"
  | "trace";

/** Given an OpenAPI **Paths Object**, find all paths that have the given method */
export type PathsWithMethod<
  Paths extends {},
  PathnameMethod extends HttpMethod,
> = {
  [Pathname in keyof Paths]: Paths[Pathname] extends {
    [K in PathnameMethod]: any;
  }
    ? Pathname
    : never;
}[keyof Paths];

type OpQueryType<OP> = OP extends {
  parameters?: { query?: infer Query };
}
  ? Query
  : Record<string, never>;

type OpPathType<OP> = OP extends { parameters?: { path?: infer Path } }
  ? Path
  : string;

type OpBodyType<OP> = OP extends {
  requestBody?: { content: { "application/json": infer Body } };
}
  ? Body
  : Record<string, never>;

interface OpenApiOperationRequest<OpId extends OperationId>
  extends Omit<ParsedRequest, "body" | "path" | "query"> {
  path: OpPathType<operations[OpId]>;
  query: OpQueryType<operations[OpId]>;
  body: OpBodyType<operations[OpId]>;
}

// TODO
type OperationId = keyof operations;

type GetPathOperation<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = paths[Path][Method];

type SomeFilter<T> = {
  [K in keyof T]: T[K] extends never ? never : K;
}[keyof T];

type OperationIdFromPathAndMethod<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  PathOperation = GetPathOperation<Path, Method>,
> = SomeFilter<{
  [operation_id in keyof operations]: operations[operation_id] extends PathOperation
    ? PathOperation extends operations[operation_id]
      ? operation_id
      : never
    : never;
}>;

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any
  ? A
  : never;

type MediaType = `${string}/${string}`;

type GetResponse<
  M extends HttpMethod,
  P extends PathsWithMethod<paths, M>,
> = M extends keyof paths[P]
  ?
      | {
          json: FetchResponse<paths[P][M], {}, MediaType>["data"];
          status?: number;
        }
      | { status: number }
  : never;

type GetOperationId<
  M extends HttpMethod,
  P extends PathsWithMethod<paths, M>,
> = OperationIdFromPathAndMethod<P, M extends keyof paths[P] ? M : never>;

export type GetRequest<
  M extends HttpMethod,
  P extends PathsWithMethod<paths, M>,
> = OpenApiOperationRequest<GetOperationId<M, P>>;

export type GetRequestResponse<
  M extends HttpMethod,
  P extends PathsWithMethod<paths, M>,
> = (request: GetRequest<M, P>) => GetResponse<M, P>;

export type OpenApiHandler = (
  request: Context<Document>,
  fulfill: (response: unknown) => Promise<void>
) => void;

export type FulfillOptions = ArgumentTypes<Route["fulfill"]>[0];

// Testing...
type X = RequestOptions<paths["/rooms/{room_id}/messages"]["post"]>;
type XParams = RequestOptions<
  paths["/rooms/{room_id}/messages"]["post"]
>["params"];
type YY = XParams["query"];
// body, headers, params

type ReqeustFromFactory = GetRequest<"post", "/rooms">;
// body, cookies, headers, method, params, path, query, requestBody

type Y = FetchResponse<paths["/rooms/{room_id}"]["get"], {}, MediaType>["data"];
