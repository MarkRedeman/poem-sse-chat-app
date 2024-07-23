import { Page, Request, Route, test as base } from "@playwright/test";
import fs from "node:fs";
import url from "node:url";
import { Request as OpenApiRequest } from "openapi-backend";
import type { Document, Options } from "openapi-backend";
import { OpenAPIBackend } from "openapi-backend";

import { paths } from "./../../src/lib/api/api-schema";
import {
  FulfillOptions,
  GetRequest,
  GetRequestResponse,
  HttpMethod,
  OpenApiHandler,
  PathsWithMethod,
} from "./types";

const notFoundHandler: OpenApiHandler = async (c, fulfill) => {
  console.warn(`Handler for path "${c.request.path}" not found.`);

  await fulfill({ status: 404, json: {} });
};

const notImplementedHandler: OpenApiHandler = async (c, fulfill) => {
  const operationId = c.operation.operationId;

  if (operationId === undefined) {
    return;
  }

  const { status, mock: json } = c.api.mockResponseForOperation(operationId);

  await fulfill({ status, json });
};

export const setupOpenApiHandler = async (): Promise<
  OpenAPIBackend<Document>
> => {
  const definitionPath = url.fileURLToPath(
    url.resolve(import.meta.url, "./../../src/lib/api/api-schema.json")
  );
  const definition = JSON.parse(fs.readFileSync(definitionPath));
  const options: Options = { definition } as unknown as Options;

  // Skip precompiling Ajv validators, this saves about 3~5 seconds of init time
  options.quick = true;
  options.validate = false;
  options.strict = false;

  const api = new OpenAPIBackend(options);
  api.register("notFound", notFoundHandler);
  api.register("notImplemented", notImplementedHandler);

  await api.init();

  return api;
};

const getRequestBody = (
  request: Request,
  headers: { [key: string]: string }
) => {
  if (headers["content-type"]?.includes("multipart/form-data")) {
    return request.postData();
  }

  try {
    return request.postDataJSON();
  } catch (e) {
    console.warn(
      "Could not determine request post data",
      request.method(),
      request.url(),
      request.headers()
    );

    return undefined;
  }
};

const getOpenApiRequest = async (
  serverUrl: string,
  route: Route
): Promise<OpenApiRequest> => {
  const request = route.request();
  const method = request.method();
  const requestUrl = new URL(request.url());
  const headers = await request.allHeaders();
  const body = getRequestBody(request, headers);

  const path = requestUrl.href.slice(serverUrl.length);

  return {
    path,
    query: requestUrl.search,
    method,
    body,
    headers,
  };
};

async function proxyApiRequestsToOpenAPIBackend(page: Page) {
  const openApi = await setupOpenApiHandler();
  const servers = openApi.definition.servers ?? [];

  for (const server of servers) {
    await page.route(`${server.url}/**/*`, async (route) => {
      const openApiRequest = await getOpenApiRequest(server.url, route);

      try {
        await openApi.handleRequest(
          openApiRequest,
          async (response: FulfillOptions) => {
            await route.fulfill(response);
          }
        );
      } catch (error: unknown) {
        // OpenAPI was not configured to handle this route, or an issue occured that made it fail
        console.log("Could not handle request", { openApiRequest, error });

        await route.fulfill({
          status: 502,
          body: (error as Error).message,
        });
      }
    });
  }

  function getOperationId(method: HttpMethod, path: string) {
    if (openApi.definition.paths === undefined) {
      return undefined;
    }

    const availablePaths = openApi.definition.paths[path];
    if (availablePaths === undefined) {
      return undefined;
    }

    return availablePaths[method]?.operationId;
  }

  function registerApiResponse<
    M extends HttpMethod,
    P extends PathsWithMethod<paths, M>,
  >(method: M, path: P, getResponse: GetRequestResponse<M, P>) {
    const operationId = getOperationId(method, path);

    if (operationId === undefined) {
      return;
    }

    openApi.registerHandler(operationId, (context, fulfill) => {
      const request = context.request as GetRequest<M, P>;
      const response = getResponse(request);
      console.log("response", response);

      if ("json" in response) {
        return fulfill({ json: response.json });
      }

      return fulfill({ status: response.status, json: {} });
    });
  }

  return { openApi, registerApiResponse };
}

interface OpenApiFixtures {
  openApi: Awaited<ReturnType<typeof proxyApiRequestsToOpenAPIBackend>>;
}

export const test = base.extend<OpenApiFixtures>({
  openApi: [
    async ({ page }, use) => {
      const openApi = await proxyApiRequestsToOpenAPIBackend(page);

      await use(openApi);
    },
    {
      /**
       * Scope this fixture on per test basis to ensure that each test has a
       * fresh copy of MSW. Note: the scope MUST be "test" to be able to use the
       * `page` fixture as it is not possible to access it when scoped to the
       * "worker".
       */
      scope: "test",
      /**
       * By default, fixtures are lazy; they will not be initialised unless they're
       * used by the test. Setting `true` here means that the fixture will be auto-
       * initialised even if the test doesn't use it.
       */
      auto: true,
    },
  ],
});
