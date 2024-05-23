mod events;

use std::sync::Arc;

use events::{BroadcastingEventBus, DomainEvent, ShareableEventBus};
use poem::{
    async_trait,
    http::StatusCode,
    listener::TcpListener,
    session::{CookieConfig, CookieSession, Session},
    web::Data,
    Endpoint, EndpointExt, IntoResponse, Middleware, Request, Response, Result, Route, Server,
};
use poem_openapi::{param::Path, payload::Json, Object, OpenApi, OpenApiService, OperationId};
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct Room {
    id: Uuid,
    name: String,
}

#[derive(Default)]
pub struct Api;

struct AuthMiddleware;

#[derive(Clone)]
struct AuthData {
    username: String,
}

#[async_trait]
impl<E: Endpoint> Middleware<E> for AuthMiddleware {
    type Output = AuthMiddlewareEndpoint<E>;

    fn transform(&self, ep: E) -> Self::Output {
        AuthMiddlewareEndpoint { ep }
    }
}

pub struct AuthMiddlewareEndpoint<E> {
    ep: E,
}

#[async_trait]
impl<E: Endpoint> Endpoint for AuthMiddlewareEndpoint<E> {
    type Output = Response;

    async fn call(&self, mut req: Request) -> Result<Self::Output> {
        let session = req.extensions().get::<Session>().cloned().unwrap();
        let username = session.get::<String>("username");

        match username {
            Some(username) => {
                // Attach user information to the request extensions
                req.extensions_mut().insert(AuthData { username });

                return Ok(self.ep.call(req).await?.into_response());
            }
            None => {
                // Return unauthorized if the session cookie is missing or invalid
                Ok(Response::builder()
                    .status(StatusCode::UNAUTHORIZED)
                    .finish())
            }
        }
    }
}

fn protect(ep: impl Endpoint) -> impl Endpoint {
    ep.with(AuthMiddleware)
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct LoginRequest {
    #[oai(validator(max_length = 256))]
    username: String,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct CreateRoomRequest {
    id: Uuid,
    #[oai(validator(max_length = 256))]
    name: String,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct SendMessageRequest {
    #[oai(validator(max_length = 1024))]
    message: String,
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
            .dispatch_event(DomainEvent::UserLoggedIn {
                username: request.username.clone(),
            })
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
            .dispatch_event(DomainEvent::UserLoggedOut {
                username: username.clone(),
            })
            .await;

        session.purge();

        Ok(())
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
            .dispatch_event(DomainEvent::RoomWasCreated {
                id: room.id,
                name: room.name.clone(),
            })
            .await;

        ctx.bus
            .dispatch_event(DomainEvent::UserJoinedRoom {
                room_id: room.id,
                username,
            })
            .await;

        Ok(Json(room))
    }

    #[oai(path = "/rooms/:room_id/users", method = "post", transform = "protect")]
    async fn join_room(
        &self,
        room_id: Path<Uuid>,
        ctx: Data<&Context>,
        auth_data: Data<&AuthData>,
    ) -> Result<()> {
        ctx.bus
            .dispatch_event(DomainEvent::UserJoinedRoom {
                room_id: room_id.0,
                username: auth_data.username.clone(),
            })
            .await;

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
            .dispatch_event(DomainEvent::MessageWasSend {
                room_id: room_id.0,
                username: auth_data.username.clone(),
                message: request.message.clone(),
            })
            .await;

        Ok(())
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
        auth_data: Data<&AuthData>,
    ) -> Result<()> {
        ctx.bus
            .dispatch_event(DomainEvent::UserLeftRoom {
                room_id: room_id.0,
                username: auth_data.username.clone(),
            })
            .await;

        Ok(())
    }
}

#[derive(Clone)]
pub struct Context {
    bus: ShareableEventBus,
}

pub async fn create_app(ctx: Context) -> Result<impl Endpoint, Box<dyn std::error::Error>> {
    let all_endpoints = (Api, events::Api);

    let api_service = OpenApiService::new(all_endpoints, "Hello World", "1.0")
        .server("http://localhost:3000/api");

    let ui = api_service.swagger_ui();

    Ok(Route::new()
        .nest("/api", api_service)
        .nest("/", ui)
        .data(ctx)
        .with(CookieSession::new(CookieConfig::default().secure(true))))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::var_os("RUST_LOG").is_none() {
        std::env::set_var("RUST_LOG", "poem=debug");
    }
    tracing_subscriber::fmt::init();

    let (tx, _rx) = broadcast::channel::<DomainEvent>(32);
    let bus: ShareableEventBus = Arc::new(BroadcastingEventBus::from_broadcast(tx));
    let ctx = Context { bus };

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
    use std::sync::Arc;

    use crate::{
        events::{DomainEvent, RecordingEventBus},
        Context,
    };

    use super::create_app;

    use poem::{
        http::header::{self, SET_COOKIE},
        test::TestClient,
    };
    use serde_json::json;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_chat_api() {
        let bus = Arc::new(RecordingEventBus::default());
        let app = create_app(Context { bus: bus.clone() }).await.unwrap();
        let client = TestClient::new(app);

        // Login
        let body = json!({ "username": "Karel" });
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
        let body = json!({"id": room_id.to_string(), "name": "Lustrum Crash & Compile"});
        let resp = client
            .post("/api/rooms")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .body(body.to_string())
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 3);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn {
                    username: "Karel".to_string()
                },
                DomainEvent::RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Karel".to_string()
                },
            ]
        );

        let resp = client
            .post(format!("/api/rooms/{}/users", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 4);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn {
                    username: "Karel".to_string()
                },
                DomainEvent::RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Karel".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Karel".to_string()
                },
            ]
        );

        let body = json!({  "message": "Hoi"});
        let resp = client
            .post(format!("/api/rooms/{}/messages", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .body(body.to_string())
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 5);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn {
                    username: "Karel".to_string()
                },
                DomainEvent::RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Karel".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Karel".to_string()
                },
                DomainEvent::MessageWasSend {
                    room_id,
                    username: "Karel".to_string(),
                    message: "Hoi".to_string()
                },
            ]
        );

        let resp = client
            .delete(format!("/api/rooms/{}/users", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::COOKIE, cookie)
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 6);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::UserLoggedIn {
                    username: "Karel".to_string()
                },
                DomainEvent::RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Karel".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Karel".to_string()
                },
                DomainEvent::MessageWasSend {
                    room_id,
                    username: "Karel".to_string(),
                    message: "Hoi".to_string()
                },
                DomainEvent::UserLeftRoom {
                    room_id,
                    username: "Karel".to_string(),
                },
            ]
        );
    }

    #[tokio::test]
    async fn test_login() {
        let bus = Arc::new(RecordingEventBus::default());
        let app = create_app(Context { bus: bus.clone() }).await.unwrap();
        let client = TestClient::new(app);

        let body = json!({ "username": "Karel" });
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

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 1);
        assert_eq!(
            recorded_events,
            vec![DomainEvent::UserLoggedIn {
                username: "Karel".to_string()
            }]
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
                DomainEvent::UserLoggedIn {
                    username: "Karel".to_string()
                },
                DomainEvent::UserLoggedOut {
                    username: "Karel".to_string()
                },
            ]
        );
    }
}
