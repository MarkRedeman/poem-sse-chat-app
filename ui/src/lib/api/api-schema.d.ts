/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/session": {
    get: {
      responses: {
        200: {
          content: {
            "application/json; charset=utf-8": components["schemas"]["AuthData"];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json; charset=utf-8": components["schemas"]["LoginRequest"];
        };
      };
      responses: {
        200: {
          content: never;
        };
      };
    };
    delete: {
      responses: {
        200: {
          content: never;
        };
      };
    };
  };
  "/rooms": {
    get: {
      responses: {
        200: {
          content: {
            "application/json; charset=utf-8": components["schemas"]["IndexRoom"][];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json; charset=utf-8": components["schemas"]["CreateRoomRequest"];
        };
      };
      responses: {
        200: {
          content: {
            "application/json; charset=utf-8": components["schemas"]["Room"];
          };
        };
      };
    };
  };
  "/rooms/{room_id}": {
    get: {
      parameters: {
        path: {
          room_id: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json; charset=utf-8": components["schemas"]["DetailedRoom"];
          };
        };
      };
    };
  };
  "/rooms/{room_id}/users": {
    post: {
      parameters: {
        path: {
          room_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json; charset=utf-8": components["schemas"]["JoinRoomRequest"];
        };
      };
      responses: {
        200: {
          content: never;
        };
      };
    };
    delete: {
      parameters: {
        path: {
          room_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json; charset=utf-8": components["schemas"]["LeaveRoomRequest"];
        };
      };
      responses: {
        200: {
          content: never;
        };
      };
    };
  };
  "/rooms/{room_id}/messages": {
    post: {
      parameters: {
        path: {
          room_id: string;
        };
      };
      requestBody: {
        content: {
          "application/json; charset=utf-8": components["schemas"]["SendMessageRequest"];
        };
      };
      responses: {
        200: {
          content: never;
        };
      };
    };
  };
  "/events": {
    get: {
      responses: {
        200: {
          content: {
            "text/event-stream": unknown[];
          };
        };
      };
    };
  };
  "/events/{room_id}": {
    get: {
      responses: {
        200: {
          content: {
            "text/event-stream": unknown[];
          };
        };
      };
    };
  };
  "/generate-events": {
    get: {
      responses: {
        200: {
          content: never;
        };
      };
    };
  };
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    AuthData: {
      username: string;
    };
    CreateRoomRequest: {
      /** Format: uuid */
      id: string;
      name: string;
      /** Format: date-time */
      created_at: string;
    };
    DetailedRoom: {
      /** Format: uuid */
      id: string;
      name: string;
      messages: components["schemas"]["Message"][];
      users: string[];
    };
    IndexRoom: {
      /** Format: uuid */
      id: string;
      name: string;
      joined: boolean;
      last_message?: components["schemas"]["Message"];
    };
    JoinRoomRequest: {
      /** Format: date-time */
      joined_at: string;
    };
    LeaveRoomRequest: {
      /** Format: date-time */
      left_at: string;
    };
    LoginRequest: {
      username: string;
    };
    Message: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      room_id: string;
      username: string;
      message: string;
      /** Format: date-time */
      send_at: string;
    };
    Room: {
      /** Format: uuid */
      id: string;
      name: string;
    };
    SendMessageRequest: {
      /** Format: uuid */
      id: string;
      message: string;
      /** Format: date-time */
      send_at: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type $defs = Record<string, never>;

export type external = Record<string, never>;

export type operations = Record<string, never>;
