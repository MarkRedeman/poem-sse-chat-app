use futures_util::{stream::BoxStream, StreamExt};
use poem::async_trait;
use poem::web::Data;
use poem::Result;
use poem_openapi::{payload::EventStream, Object, OpenApi};
use serde::Serialize;
use serde_json::json;
use serde_json::Value;
use std::sync::Arc;
use time::OffsetDateTime;
use tokio::sync::broadcast;
use tokio::sync::broadcast::{Receiver, Sender};
use tokio::{sync::Mutex, time::Duration};
use uuid::Uuid;

#[derive(Debug, Object, Clone, Serialize, PartialEq)]
pub struct MyEvent {
    value: i64,
}

#[derive(Debug, Object, Clone, Serialize, PartialEq)]
pub struct OtherEvent {
    other_value: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct PlayerId(Uuid);

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct GameId(Uuid);

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct QuestionId(Uuid);

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Position {
    x: u32,
    y: u32,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum DomainEvent {
    RoomWasCreated {
        id: Uuid,
        name: String,
    },
    UserJoinedRoom {
        room_id: Uuid,
        username: String,
    },
    UserLeftRoom {
        room_id: Uuid,
        username: String,
    },
    MessageWasSend {
        room_id: Uuid,
        username: String,
        message: String,
    },
}

#[allow(dead_code)]
struct Envelope {
    id: Uuid,
    aggregate_id: Uuid,
    version: i64,
    event: DomainEvent,
    time: OffsetDateTime,
}

#[async_trait]
pub trait EventBus {
    async fn dispatch_event(&self, event: DomainEvent);

    // TODO: look into changing this so that it receives a listener callbak instead
    // This would change the intervace to return nothing so that the same trait
    // can be used for our BroadcastingEventBus and RecordingEventBus
    async fn subscribe(&self) -> Option<Receiver<DomainEvent>>;
}

pub type ShareableEventBus = Arc<dyn EventBus + std::marker::Sync + std::marker::Send + 'static>;

#[derive(Clone)]
pub struct BroadcastingEventBus {
    bus: Arc<Mutex<broadcast::Sender<DomainEvent>>>,
}

impl BroadcastingEventBus {
    /// Creates a EventBus out of a broadcast channel that can be used to
    /// dispatch and subscribe to domain events
    ///
    /// # Examples
    ///
    /// ```
    /// use tokio::sync::Mutex;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let (tx, _rx) = broadcast::channel::<DomainEvent>(32);
    ///     let bus = EventBus::from_broadcast(tx);
    /// }
    /// ```
    pub fn from_broadcast(tx: Sender<DomainEvent>) -> BroadcastingEventBus {
        BroadcastingEventBus {
            bus: Arc::new(Mutex::new(tx)),
        }
    }
}

#[async_trait]
impl EventBus for BroadcastingEventBus {
    async fn dispatch_event(&self, event: DomainEvent) {
        let bus = self.bus.lock().await;

        if let Err(send_error) = bus.send(event.clone()) {
            println!(
                "Something wrong while dispatching event: {:?}: {:?}",
                event, send_error
            );
        };
    }

    async fn subscribe(&self) -> Option<Receiver<DomainEvent>> {
        Some(self.bus.lock().await.subscribe())
    }
}

// Not used yet, this event bus can be used in our tests so that we only record
// the events that are being produced
#[derive(Clone, Default)]
pub struct RecordingEventBus {
    recorded_events: Arc<Mutex<Vec<DomainEvent>>>,
}

#[allow(dead_code)]
impl RecordingEventBus {
    /// Create a new event bus that records all events which will be dispatched
    /// Used for unit testing
    fn new() -> RecordingEventBus {
        RecordingEventBus {
            recorded_events: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn recorded_events(&self) -> Vec<DomainEvent> {
        let events = self.recorded_events.lock().await;

        events.clone()
    }
}

#[async_trait]
impl EventBus for RecordingEventBus {
    async fn dispatch_event(&self, event: DomainEvent) {
        let mut events = self.recorded_events.lock().await;
        events.push(event);
    }

    async fn subscribe(&self) -> Option<Receiver<DomainEvent>> {
        None
    }
}

// # Server Side Events
// Below are Endpoint implementations that allow us to send events to the browser
// Essentially we can have other endpoitns produce DomainEvents and automatically
// send these back to the user(s).
// In these endpoints we can do more fancy stuff, like detect the authenticated
// player and thus filter out events that they are (not) allowed to see.
// As an example a player may only be allowed to see a SecretAchievementUnlocked
// event if they unlocked that same event earlier.

#[derive(Default)]
pub struct Api;

#[OpenApi]
impl Api {
    #[oai(path = "/events", method = "get")]
    async fn index(&self, bus: Data<&ShareableEventBus>) -> EventStream<BoxStream<'static, Value>> {
        let mut rx = bus.subscribe().await.unwrap();

        EventStream::new(
            async_stream::stream! {
                while let Ok(event) = rx.recv().await {
                    let json = json!(event);
                    yield json;
                };
            }
            .boxed(),
        )
    }

    // These two endpoints show how we can filter events,
    // we can do this for instance to filter events for a specific player,
    // for admins, for the scoreboard etc

    #[oai(path = "/events/:room_id", method = "get")]
    async fn index_my_event(
        &self,
        bus: Data<&ShareableEventBus>,
    ) -> EventStream<BoxStream<'static, Value>> {
        let mut rx = bus.subscribe().await.unwrap();

        EventStream::new(
            async_stream::stream! {
                while let Ok(event) = rx.recv().await {
                    let json = json!(event);
                    yield json;
                };
            }
            .boxed(),
        )
    }

    #[oai(path = "/generate-events", method = "get")]
    async fn generate_events(&self, bus: Data<&ShareableEventBus>) -> Result<()> {
        for _ in 0..10 {
            let second = Duration::from_millis(1);
            tokio::time::sleep(second).await;

            let room_id = Uuid::new_v4();
            let event = DomainEvent::RoomWasCreated {
                id: room_id,
                name: String::from("Random room"),
            };
            bus.dispatch_event(event.clone()).await;

            tokio::time::sleep(second).await;

            let event = DomainEvent::UserJoinedRoom {
                room_id,
                username: "Francken".to_string(),
            };
            bus.dispatch_event(event.clone()).await;
        }

        Ok(())
    }
}
