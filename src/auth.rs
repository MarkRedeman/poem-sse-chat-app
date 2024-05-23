use poem::{
    async_trait, http::StatusCode, session::Session, Endpoint, EndpointExt, IntoResponse,
    Middleware, Request, Response, Result,
};
use poem_openapi::Object;

pub struct AuthMiddleware;

#[derive(Object, Clone)]
pub struct AuthData {
    pub username: String,
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

pub fn protect(ep: impl Endpoint) -> impl Endpoint {
    ep.with(AuthMiddleware)
}
