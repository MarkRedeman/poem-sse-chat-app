mod auth;
mod events;

use std::{collections::HashMap, sync::Arc};

use auth::{protect, AuthData};
use events::{
    BroadcastingEventBus, DomainEvent, MessageWasSend, RoomWasCreated, ShareableEventBus,
    UserJoinedRoom, UserLeftRoom, UserLoggedIn, UserLoggedOut,
};
use poem::{
    endpoint::EmbeddedFileEndpoint,
    endpoint::EmbeddedFilesEndpoint,
    http::StatusCode,
    listener::TcpListener,
    middleware::Cors,
    session::{CookieConfig, CookieSession, Session},
    web::{cookie::SameSite, Data},
    Endpoint, EndpointExt, Error, Result, Route, Server,
};
use poem_openapi::{param::Path, payload::Json, Object, OpenApi, OpenApiService, OperationId};
use rust_embed::RustEmbed;
use serde::Serialize;
use time::OffsetDateTime;
use tokio::sync::{broadcast, Mutex};
use uuid::Uuid;

#[derive(Debug, Object, Clone, Serialize, Eq, PartialEq)]
struct Cursor {
    offset: Option<usize>,
    limit: usize,
}

#[derive(Debug, Object, Clone, Serialize, Eq, PartialEq)]
struct Pagination {
    total_items: usize,
    per_page: usize,
    total_pages: usize,
    current_page: usize,
    next_page: Option<usize>,
    previous_page: Option<usize>,
}

#[derive(Debug, Object, Clone, Serialize, Eq, PartialEq)]
struct ItemResponse<T: poem_openapi::types::ParseFromJSON + poem_openapi::types::ToJSON> {
    data: T,
}

#[derive(Debug, Object, Clone, Serialize, Eq, PartialEq)]
struct CollectionResponse<T: poem_openapi::types::ParseFromJSON + poem_openapi::types::ToJSON> {
    items: Vec<T>,
    pagination: Pagination,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct PaginationRequest {
    page: usize,
    limit: Option<usize>,
}

struct ErrorResponse {
    message: String,
    error_code: String,
}

#[derive(Debug, Object, Clone, Serialize, Eq, PartialEq)]
pub struct Message {
    id: Uuid,
    room_id: Uuid,
    username: String,
    message: String,
    send_at: OffsetDateTime,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct Room {
    id: Uuid,
    name: String,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct IndexRoom {
    id: Uuid,
    name: String,
    joined: bool,
    last_message: Option<Message>,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct DetailedRoom {
    id: Uuid,
    name: String,
    messages: Vec<Message>,
    users: Vec<String>,
}

#[derive(Default)]
pub struct Api;

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct LoginRequest {
    #[oai(validator(max_length = 256, min_length = 1))]
    username: String,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct CreateRoomRequest {
    id: Uuid,
    #[oai(validator(max_length = 256, min_length = 1))]
    name: String,
    created_at: OffsetDateTime,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct SendMessageRequest {
    id: Uuid,
    #[oai(validator(max_length = 1024, min_length = 1))]
    message: String,
    send_at: OffsetDateTime,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct JoinRoomRequest {
    joined_at: OffsetDateTime,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct LeaveRoomRequest {
    left_at: OffsetDateTime,
}

#[OpenApi]
impl Api {
    #[oai(path = "/session", method = "post")]
    async fn login(
        &self,
        ctx: Data<&Context>,
        request: Json<LoginRequest>,
        session: &Session,
    ) -> Result<()> {
        session.set("username", request.username.clone());

        ctx.bus
            .dispatch_event(DomainEvent::UserLoggedIn(UserLoggedIn {
                username: request.username.clone(),
            }))
            .await;

        Ok(())
    }

    #[oai(path = "/session", method = "delete", transform = "protect")]
    async fn logout(
        &self,
        ctx: Data<&Context>,
        session: &Session,
        auth_data: Data<&AuthData>,
    ) -> Result<()> {
        let username = auth_data.username.clone();

        ctx.bus
            .dispatch_event(DomainEvent::UserLoggedOut(UserLoggedOut {
                username: username.clone(),
            }))
            .await;

        session.remove("username");

        Ok(())
    }

    #[oai(path = "/session", method = "get", transform = "protect")]
    async fn get_username(&self, auth_data: Data<&AuthData>) -> Result<Json<AuthData>> {
        Ok(Json(AuthData {
            username: auth_data.username.clone(),
        }))
    }

    #[oai(path = "/rooms", method = "get", transform = "protect")]
    async fn get_rooms(&self, ctx: Data<&Context>) -> Result<Json<Vec<IndexRoom>>> {
        let rooms = ctx.rooms.lock().await.clone();
        let messages_lock = ctx.messages_in_room.lock().await;

        let rooms = rooms
            .iter()
            .map(|room| {
                let messages = messages_lock.get(&room.id);

                let last_message = match messages {
                    Some(messages) => messages.last(),
                    None => None,
                };

                IndexRoom {
                    id: room.id,
                    joined: true,
                    name: room.name.clone(),
                    last_message: last_message.cloned(),
                }
            })
            .collect();

        Ok(Json(rooms))
    }

    #[oai(path = "/rooms/:room_id", method = "get", transform = "protect")]
    async fn get_room(
        &self,
        ctx: Data<&Context>,
        room_id: Path<Uuid>,
    ) -> Result<Json<DetailedRoom>> {
        let rooms = ctx.rooms.lock().await.clone();

        let room = rooms.iter().find(|room| room.id == room_id.0);

        match room {
            None => Err(Error::from_status(StatusCode::NOT_FOUND)),
            Some(room) => {
                let messages = ctx
                    .messages_in_room
                    .lock()
                    .await
                    .entry(room.id)
                    .or_default()
                    .clone();

                let users = ctx
                    .users_in_room
                    .lock()
                    .await
                    .entry(room.id)
                    .or_default()
                    .clone();

                Ok(Json(DetailedRoom {
                    id: room.id,
                    name: room.name.clone(),
                    messages,
                    users,
                }))
            }
        }
    }

    #[oai(path = "/rooms", method = "post", transform = "protect")]
    async fn create_room(
        &self,
        ctx: Data<&Context>,
        request: Json<CreateRoomRequest>,
        auth_data: Data<&AuthData>,
    ) -> Result<Json<Room>> {
        let username = auth_data.username.clone();

        let room = Room {
            id: request.id,
            name: request.name.clone(),
        };

        ctx.bus
            .dispatch_event(DomainEvent::RoomWasCreated(RoomWasCreated {
                id: room.id,
                name: room.name.clone(),
                created_at: request.created_at,
            }))
            .await;

        ctx.rooms.lock().await.push(room.clone());

        ctx.bus
            .dispatch_event(DomainEvent::UserJoinedRoom(UserJoinedRoom {
                room_id: room.id,
                username: username.clone(),
                joined_at: request.created_at,
            }))
            .await;

        ctx.users_in_room
            .lock()
            .await
            .entry(request.id)
            .or_insert(Vec::new())
            .push(username.clone());

        Ok(Json(room))
    }

    #[oai(path = "/rooms/:room_id/users", method = "post", transform = "protect")]
    async fn join_room(
        &self,
        room_id: Path<Uuid>,
        request: Json<JoinRoomRequest>,
        ctx: Data<&Context>,
        auth_data: Data<&AuthData>,
    ) -> Result<()> {
        let username = auth_data.username.clone();

        let mut users_in_room = ctx.users_in_room.lock().await;
        let users = users_in_room.entry(room_id.0).or_insert(Vec::new());

        if !users.contains(&username) {
            users.push(auth_data.username.clone());

            ctx.bus
                .dispatch_event(DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id: room_id.0,
                    username: auth_data.username.clone(),
                    joined_at: request.joined_at,
                }))
                .await;
        }

        Ok(())
    }

    #[oai(
        path = "/rooms/:room_id/messages",
        method = "post",
        transform = "protect"
    )]
    async fn send_message(
        &self,
        room_id: Path<Uuid>,
        ctx: Data<&Context>,
        request: Json<SendMessageRequest>,
        auth_data: Data<&AuthData>,
    ) -> Result<()> {
        ctx.bus
            .dispatch_event(DomainEvent::MessageWasSend(MessageWasSend {
                id: request.id,
                room_id: room_id.0,
                username: auth_data.username.clone(),
                message: request.message.clone(),
                send_at: request.send_at,
            }))
            .await;

        ctx.messages_in_room
            .lock()
            .await
            .entry(room_id.0)
            .or_insert(Vec::new())
            .push(Message {
                id: request.id,
                room_id: room_id.0,
                username: auth_data.username.clone(),
                message: request.message.clone(),
                send_at: request.send_at,
            });

        Ok(())
    }

    #[oai(
        path = "/rooms/:room_id/messages",
        method = "get",
        transform = "protect"
    )]
    async fn get_messages(
        &self,
        room_id: Path<Uuid>,
        ctx: Data<&Context>,
    ) -> Result<Json<CollectionResponse<Message>>> {
        let messages = ctx
            .messages_in_room
            .lock()
            .await
            .entry(room_id.0)
            .or_default()
            .clone();

        //Ok(Json(messages))
        let total_items = messages.len();

        Ok(Json(CollectionResponse {
            items: messages,
            pagination: Pagination {
                current_page: 0,
                per_page: total_items,
                total_items: total_items,
                total_pages: 1,
                next_page: None,
                previous_page: None,
            },
        }))
    }

    #[oai(
        path = "/rooms/:room_id/users",
        method = "delete",
        transform = "protect"
    )]
    async fn leave_room(
        &self,
        room_id: Path<Uuid>,
        ctx: Data<&Context>,
        request: Json<LeaveRoomRequest>,
        auth_data: Data<&AuthData>,
    ) -> Result<()> {
        ctx.bus
            .dispatch_event(DomainEvent::UserLeftRoom(UserLeftRoom {
                room_id: room_id.0,
                username: auth_data.username.clone(),
                left_at: request.left_at,
            }))
            .await;

        Ok(())
    }
}

#[derive(Clone)]
pub struct Context {
    bus: ShareableEventBus,

    rooms: Arc<Mutex<Vec<Room>>>,
    messages_in_room: Arc<Mutex<HashMap<Uuid, Vec<Message>>>>,
    users_in_room: Arc<Mutex<HashMap<Uuid, Vec<String>>>>,
}

#[derive(RustEmbed)]
#[folder = "ui/dist"]
#[include = "./index.html"]
pub struct Files;

#[derive(RustEmbed)]
#[folder = "ui/dist/assets"]
pub struct AssetFiles;

pub async fn create_app(ctx: Context) -> Result<impl Endpoint, Box<dyn std::error::Error>> {
    let all_endpoints = (Api, events::Api);

    let api_service = OpenApiService::new(all_endpoints, "Hello World", "1.0")
        .server("http://localhost:3000/api");

    let ui = api_service.swagger_ui();
    let spec = api_service.spec_endpoint();
    let cors = Cors::new().allow_credentials(true);
    let cookie_config = CookieConfig::default().same_site(SameSite::Strict);

    Ok(Route::new()
        .nest("/api", api_service)
        .nest("/api/docs", ui)
        .nest("/spec.json", spec)
        .nest("/assets", EmbeddedFilesEndpoint::<AssetFiles>::new())
        .at("/*", EmbeddedFileEndpoint::<Files>::new("./index.html"))
        .data(ctx)
        .with(CookieSession::new(cookie_config))
        .with(cors))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::var_os("RUST_LOG").is_none() {
        std::env::set_var("RUST_LOG", "poem=debug");
    }
    tracing_subscriber::fmt::init();

    let (tx, _rx) = broadcast::channel::<DomainEvent>(32);
    let bus: ShareableEventBus = Arc::new(BroadcastingEventBus::from_broadcast(tx));
    let ctx = Context {
        bus,
        messages_in_room: Arc::new(Mutex::new(HashMap::new())),
        users_in_room: Arc::new(Mutex::new(HashMap::new())),
        rooms: Arc::new(Mutex::new(Vec::new())),
    };

    let app = create_app(ctx).await?.around(|ep, req| async move {
        let uri = req.uri().clone();
        let resp = ep.get_response(req).await;

        if let Some(operation_id) = resp.data::<OperationId>() {
            println!("[{}]{} {}", operation_id, uri, resp.status());
        } else {
            println!("{} {}", uri, resp.status());
        }

        Ok(resp)
    });

    Server::new(TcpListener::bind("0.0.0.0:3000"))
        .run(app)
        .await?;

    Ok(())
}

#[cfg(test)]
mod test {
    use std::{collections::HashMap, sync::Arc};

    use crate::{
        events::{
            DomainEvent, MessageWasSend, RecordingEventBus, RoomWasCreated, UserJoinedRoom,
            UserLeftRoom, UserLoggedIn, UserLoggedOut,
        },
        Context,
    };

    use super::create_app;

    use poem::{
        http::header::{self, SET_COOKIE},
        test::TestClient,
    };
    use serde_json::json;
    use time::{format_description::well_known::Rfc3339, OffsetDateTime};
    use tokio::sync::Mutex;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_chat_api() {
        let bus = Arc::new(RecordingEventBus::default());
        let app = create_app(Context {
            bus: bus.clone(),
            messages_in_room: Arc::new(Mutex::new(HashMap::new())),
            users_in_room: Arc::new(Mutex::new(HashMap::new())),
            rooms: Arc::new(Mutex::new(Vec::new())),
        })
        .await
        .unwrap();
        let client = TestClient::new(app);

        // Login as Jane Doe
        let body = json!({ "username": "Jane" });
        let resp = client
            .post("/api/session")
            .header(header::CONTENT_TYPE, "application/json")
            .body(body.to_string())
            .send()
            .await;

        let cookie_jane = resp
            .0
            .headers()
            .get(SET_COOKIE)
            .and_then(|value| value.to_str().ok())
            .expect("Failed to get session cookie");

        // Login as John Doe
        let body = json!({ "username": "John" });
        let resp = client
            .post("/api/session")
            .header(header::CONTENT_TYPE, "application/json")
            .body(body.to_string())
            .send()
            .await;

        let cookie = resp
            .0
            .headers()
            .get(SET_COOKIE)
            .and_then(|value| value.to_str().ok())
            .expect("Failed to get session cookie");

        // chat
        let room_id = Uuid::new_v4();
        let body = json!({
            "id": room_id.to_string(),
            "name": "Lustrum Crash & Compile",
            "created_at": "2024-06-09T12:00:00Z"
        });
        let resp = client
            .post("/api/rooms")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .body(body.to_string())
            .send()
            .await;

        resp.assert_status_is_ok();
        let now = OffsetDateTime::parse("2024-06-09T12:00:00Z", &Rfc3339)
            .expect("Failed to parse date string");

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 4);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "Jane".to_string()
                }),
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "John".to_string()
                }),
                DomainEvent::RoomWasCreated(RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string(),
                    created_at: now,
                }),
                DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id,
                    username: "John".to_string(),
                    joined_at: now,
                }),
            ]
        );

        let resp = client
            .post(format!("/api/rooms/{}/users", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie_jane)
            .body(
                json!({
                "joined_at": "2024-06-09T12:00:00Z"
                })
                .to_string(),
            )
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 5);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "Jane".to_string()
                }),
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "John".to_string()
                }),
                DomainEvent::RoomWasCreated(RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string(),
                    created_at: now,
                }),
                DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id,
                    username: "John".to_string(),
                    joined_at: now,
                }),
                DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id,
                    username: "Jane".to_string(),
                    joined_at: now,
                }),
            ]
        );

        // Joining the room again as Jane, should not produce events
        let resp = client
            .post(format!("/api/rooms/{}/users", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie_jane)
            .body(
                json!({
                "joined_at": "2024-06-09T12:00:00Z"
                })
                .to_string(),
            )
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 5);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "Jane".to_string()
                }),
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "John".to_string()
                }),
                DomainEvent::RoomWasCreated(RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string(),
                    created_at: now,
                }),
                DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id,
                    username: "John".to_string(),
                    joined_at: now,
                }),
                DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id,
                    username: "Jane".to_string(),
                    joined_at: now,
                }),
            ]
        );

        let message_id = Uuid::new_v4();
        let body = json!({
            "message": "Hoi",
            "id": message_id,
            "send_at": "2024-06-09T12:00:00Z"
        });
        let resp = client
            .post(format!("/api/rooms/{}/messages", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .body(body.to_string())
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 6);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "Jane".to_string()
                }),
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "John".to_string()
                }),
                DomainEvent::RoomWasCreated(RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string(),
                    created_at: now,
                }),
                DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id,
                    username: "John".to_string(),
                    joined_at: now,
                }),
                DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id,
                    username: "Jane".to_string(),
                    joined_at: now,
                }),
                DomainEvent::MessageWasSend(MessageWasSend {
                    id: message_id,
                    room_id,
                    username: "John".to_string(),
                    message: "Hoi".to_string(),
                    send_at: now,
                }),
            ]
        );

        let resp = client
            .delete(format!("/api/rooms/{}/users", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .body(
                json!({
                "left_at": "2024-06-09T12:00:00Z"
                })
                .to_string(),
            )
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 7);
        let var_name = assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "Jane".to_string()
                }),
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "John".to_string()
                }),
                DomainEvent::RoomWasCreated(RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string(),
                    created_at: now,
                }),
                DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id,
                    username: "John".to_string(),
                    joined_at: now,
                }),
                DomainEvent::UserJoinedRoom(UserJoinedRoom {
                    room_id,
                    username: "Jane".to_string(),
                    joined_at: now,
                }),
                DomainEvent::MessageWasSend(MessageWasSend {
                    id: message_id,
                    room_id,
                    username: "John".to_string(),
                    message: "Hoi".to_string(),
                    send_at: now,
                }),
                DomainEvent::UserLeftRoom(UserLeftRoom {
                    room_id,
                    username: "John".to_string(),
                    left_at: now,
                }),
            ]
        );

        // Get rooms
        let resp = client
            .get("/api/rooms")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .send()
            .await;

        resp.assert_status_is_ok();
        resp.assert_json(json!([
            {
                "id": room_id,
                "joined": true,
                "last_message": {
                    "id": message_id,
                    "message": "Hoi",
                    "room_id": room_id,
                    "send_at": "2024-06-09T12:00:00Z",
                    "username": "John"
                },
                "name": "Lustrum Crash & Compile"
            }
        ]))
        .await;

        // Get room
        let resp = client
            .get(format!("/api/rooms/{}", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .send()
            .await;

        resp.assert_status_is_ok();
        resp.assert_json(json!(
            {
                "id": room_id,
                "name": "Lustrum Crash & Compile",
                "users": ["John", "Jane"],
                "messages": [{
                    "id": message_id,
                    "message": "Hoi",
                    "room_id": room_id,
                    "send_at": "2024-06-09T12:00:00Z",
                    "username": "John"
                }],
            }
        ))
        .await;

        // Get messages
        let resp = client
            .get(format!("/api/rooms/{}/messages", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .send()
            .await;

        resp.assert_status_is_ok();
        resp.assert_json(json!({
            "items": [
                {
                    "id": message_id,
                    "message": "Hoi",
                    "room_id": room_id,
                    "send_at": "2024-06-09T12:00:00Z",
                    "username": "John"
                },
            ],
            "pagination": {
                "current_page": 0,
                "per_page": 1,
                "total_items": 1,
                "total_pages": 1,
                "next_page": null,
                "previous_page": null
            }
        }))
        .await;
    }

    #[tokio::test]
    async fn test_login() {
        let bus = Arc::new(RecordingEventBus::default());
        let app = create_app(Context {
            bus: bus.clone(),
            messages_in_room: Arc::new(Mutex::new(HashMap::new())),
            users_in_room: Arc::new(Mutex::new(HashMap::new())),
            rooms: Arc::new(Mutex::new(Vec::new())),
        })
        .await
        .unwrap();
        let client = TestClient::new(app);

        let body = json!({ "username": "John" });
        let resp = client
            .post("/api/session")
            .header(header::CONTENT_TYPE, "application/json")
            .body(body.to_string())
            .send()
            .await;

        let cookie = resp
            .0
            .headers()
            .get(SET_COOKIE)
            .and_then(|value| value.to_str().ok())
            .expect("Failed to get session cookie");

        resp.assert_status_is_ok();

        let resp = client
            .get("/api/session")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .send()
            .await;
        resp.assert_status_is_ok();
        resp.assert_json(json!({"username": "John"})).await;

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 1);
        assert_eq!(
            recorded_events,
            vec![DomainEvent::UserLoggedIn(UserLoggedIn {
                username: "John".to_string()
            })]
        );

        let resp = client
            .delete("/api/session")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 2);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn(UserLoggedIn {
                    username: "John".to_string()
                }),
                DomainEvent::UserLoggedOut(UserLoggedOut {
                    username: "John".to_string()
                }),
            ]
        );
    }
}
