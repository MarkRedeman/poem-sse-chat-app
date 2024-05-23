mod events;

use std::sync::Arc;

use events::{BroadcastingEventBus, DomainEvent, ShareableEventBus};
use poem::{listener::TcpListener, web::Data, Endpoint, EndpointExt, Result, Route, Server};
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

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct CreateRoomRequest {
    id: Uuid,
    #[oai(validator(max_length = 256))]
    name: String,
    #[oai(validator(max_length = 256))]
    creator: String,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct JoinRoomRequest {
    #[oai(validator(max_length = 256))]
    username: String,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct LeaveRoomRequest {
    #[oai(validator(max_length = 256))]
    username: String,
}

#[derive(Debug, Object, Clone, Eq, PartialEq)]
struct SendMessageRequest {
    #[oai(validator(max_length = 256))]
    username: String,
    #[oai(validator(max_length = 1024))]
    message: String,
}

#[OpenApi]
impl Api {
    #[oai(path = "/rooms", method = "post")]
    async fn create_room(
        &self,
        ctx: Data<&Context>,
        request: Json<CreateRoomRequest>,
    ) -> Result<Json<Room>> {
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
                username: request.creator.clone(),
            })
            .await;

        Ok(Json(room))
    }

    #[oai(path = "/rooms/:room_id/users", method = "post")]
    async fn join_room(
        &self,
        room_id: Path<Uuid>,
        ctx: Data<&Context>,
        request: Json<JoinRoomRequest>,
    ) -> Result<()> {
        ctx.bus
            .dispatch_event(DomainEvent::UserJoinedRoom {
                room_id: room_id.0,
                username: request.username.clone(),
            })
            .await;

        Ok(())
    }

    #[oai(path = "/rooms/:room_id/messages", method = "post")]
    async fn send_message(
        &self,
        room_id: Path<Uuid>,
        ctx: Data<&Context>,
        request: Json<SendMessageRequest>,
    ) -> Result<()> {
        ctx.bus
            .dispatch_event(DomainEvent::MessageWasSend {
                room_id: room_id.0,
                username: request.username.clone(),
                message: request.message.clone(),
            })
            .await;

        Ok(())
    }

    #[oai(path = "/rooms/:room_id/users", method = "delete")]
    async fn leave_room(
        &self,
        room_id: Path<Uuid>,
        ctx: Data<&Context>,
        request: Json<LeaveRoomRequest>,
    ) -> Result<()> {
        ctx.bus
            .dispatch_event(DomainEvent::UserLeftRoom {
                room_id: room_id.0,
                username: request.username.clone(),
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
        .data(ctx))
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

    use poem::{http::header, test::TestClient};
    use serde_json::json;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_chat_api() {
        let bus = Arc::new(RecordingEventBus::default());
        let app = create_app(Context { bus: bus.clone() }).await.unwrap();
        let client = TestClient::new(app);

        let room_id = Uuid::new_v4();
        let body = json!({"id": room_id.to_string(), "name": "Lustrum Crash & Compile", "creator": "Francken"});
        let resp = client
            .post("/api/rooms")
            .header(header::CONTENT_TYPE, "application/json")
            .body(body.to_string())
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 2);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Francken".to_string()
                },
            ]
        );

        let body = json!({ "username": "Karel"});
        let resp = client
            .post(format!("/api/rooms/{}/users", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .body(body.to_string())
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 3);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Francken".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Karel".to_string()
                },
            ]
        );

        let body = json!({ "username": "Karel", "message": "Hoi"});
        let resp = client
            .post(format!("/api/rooms/{}/messages", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .body(body.to_string())
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 4);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Francken".to_string()
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

        let body = json!({ "username": "Karel" });
        let resp = client
            .delete(format!("/api/rooms/{}/users", room_id))
            .header(header::CONTENT_TYPE, "application/json")
            .body(body.to_string())
            .send()
            .await;

        resp.assert_status_is_ok();

        let recorded_events = bus.recorded_events().await;
        assert_eq!(recorded_events.len(), 5);
        assert_eq!(
            recorded_events,
            vec![
                DomainEvent::RoomWasCreated {
                    id: room_id,
                    name: "Lustrum Crash & Compile".to_string()
                },
                DomainEvent::UserJoinedRoom {
                    room_id,
                    username: "Francken".to_string()
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
}
