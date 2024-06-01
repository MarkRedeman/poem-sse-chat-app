use std::sync::Arc;
use time::OffsetDateTime;
use tokio::sync::Mutex;

pub trait Clock {
    fn now(&self) -> OffsetDateTime;
}

struct FrozenClock {
    time: Arc<Mutex<OffsetDateTime>>,
}

impl FrozenClock {
    pub fn set_time(&self, time: OffsetDateTime) {
        self.time.lock().await = time;
    }
}

impl Clock for FrozenClock {
    fn now(&self) -> OffsetDateTime {
        self.time.lock().await.clone()
    }
}

struct WallClock {}
