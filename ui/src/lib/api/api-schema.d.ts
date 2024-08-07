/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */


export interface paths {
  "/session": {
    get: operations["session_get"];
    post: operations["session_post"];
    delete: operations["session_delete"];
  };
  "/rooms": {
    get: operations["rooms_get"];
    post: operations["rooms_post"];
  };
  "/rooms/{room_id}": {
    get: operations["rooms_room_get"];
    delete: operations["rooms_room_delete"];
  };
  "/rooms/{room_id}/users": {
    post: operations["rooms_room_users_post"];
    delete: operations["rooms_room_messages_delete"];
  };
  "/rooms/{room_id}/messages": {
    get: operations["rooms_room_messages_get"];
    post: operations["rooms_room_messages_post"];
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
  "/get-event-types": {
    get: {
      responses: {
        200: {
          content: {
            "application/json; charset=utf-8": components["schemas"]["DomainEvent"];
          };
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
    "CollectionResponse<Message>": {
      items: components["schemas"]["Message"][];
      pagination: components["schemas"]["Pagination"];
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
    DomainEvent: components["schemas"]["UserLoggedIn"] | components["schemas"]["UserLoggedOut"] | components["schemas"]["RoomWasCreated"] | components["schemas"]["RoomWasRemoved"] | components["schemas"]["UserJoinedRoom"] | components["schemas"]["UserLeftRoom"] | components["schemas"]["MessageWasSend"];
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
    MessageWasSend: {
      /** Format: uuid */
      id: string;
      /** Format: uuid */
      room_id: string;
      username: string;
      message: string;
      /** Format: date-time */
      send_at: string;
    };
    Pagination: {
      /** Format: uint64 */
      total_items: number;
      /** Format: uint64 */
      per_page: number;
      /** Format: uint64 */
      total_pages: number;
      /** Format: uint64 */
      current_page: number;
      /** Format: uint64 */
      next_page?: number;
      /** Format: uint64 */
      previous_page?: number;
    };
    RemoveRoomRequest: {
      /** Format: date-time */
      removed_at: string;
    };
    Room: {
      /** Format: uuid */
      id: string;
      name: string;
    };
    RoomWasCreated: {
      /** Format: uuid */
      id: string;
      name: string;
      /** Format: date-time */
      created_at: string;
    };
    RoomWasRemoved: {
      /** Format: uuid */
      id: string;
      /** Format: date-time */
      removed_at: string;
    };
    SendMessageRequest: {
      /** Format: uuid */
      id: string;
      message: string;
      /** Format: date-time */
      send_at: string;
    };
    UserJoinedRoom: {
      /** Format: uuid */
      room_id: string;
      username: string;
      /** Format: date-time */
      joined_at: string;
    };
    UserLeftRoom: {
      /** Format: uuid */
      room_id: string;
      username: string;
      /** Format: date-time */
      left_at: string;
    };
    UserLoggedIn: {
      username: string;
    };
    UserLoggedOut: {
      username: string;
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

export interface operations {

  session_get: {
    responses: {
      200: {
        content: {
          "application/json; charset=utf-8": components["schemas"]["AuthData"];
        };
      };
    };
  };
  session_post: {
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
  session_delete: {
    responses: {
      200: {
        content: never;
      };
    };
  };
  rooms_get: {
    responses: {
      200: {
        content: {
          "application/json; charset=utf-8": components["schemas"]["IndexRoom"][];
        };
      };
    };
  };
  rooms_post: {
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
  rooms_room_get: {
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
  rooms_room_delete: {
    parameters: {
      path: {
        room_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json; charset=utf-8": components["schemas"]["RemoveRoomRequest"];
      };
    };
    responses: {
      200: {
        content: never;
      };
    };
  };
  rooms_room_users_post: {
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
  rooms_room_messages_delete: {
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
  rooms_room_messages_get: {
    parameters: {
      path: {
        room_id: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json; charset=utf-8": components["schemas"]["CollectionResponse<Message>"];
        };
      };
    };
  };
  rooms_room_messages_post: {
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
}
