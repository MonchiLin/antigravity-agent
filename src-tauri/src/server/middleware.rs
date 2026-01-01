use std::future::{ready, Ready};
// use std::pin::Pin; // Unused
use std::rc::Rc;
use std::task::{Context, Poll};
use std::pin::Pin; // Re-add Pin which is needed for the type annotation

use actix_web::{
    dev::{self, Service, ServiceRequest, ServiceResponse, Transform},
    error::Error,
    error::PayloadError,
    http::header,
    web::Bytes,
};
use futures_util::future::LocalBoxFuture;
use futures_util::stream::once;
use futures_util::Stream; // Import Stream trait
use serde_json::Value;

// Middleware Factory
pub struct CamelCaseToSnakeCase;

impl<S, B> Transform<S, ServiceRequest> for CamelCaseToSnakeCase
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = CamelCaseMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(CamelCaseMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct CamelCaseMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for CamelCaseMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, ctx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(ctx)
    }

    fn call(&self, mut req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();

        Box::pin(async move {
            // Check if Content-Type is application/json
            let is_json = req
                .headers()
                .get(header::CONTENT_TYPE)
                .map(|v| v.to_str().unwrap_or("").contains("application/json"))
                .unwrap_or(false);

            if is_json {
                // Read body
                let body = req.extract::<Bytes>().await?;

                if !body.is_empty() {
                    // Try to parse JSON
                    if let Ok(mut json) = serde_json::from_slice::<Value>(&body) {
                        // Recursively transform keys
                        transform_keys(&mut json);

                        // Serialize back
                        let new_body = serde_json::to_vec(&json).map_err(actix_web::error::ErrorInternalServerError)?;
                        let new_bytes = Bytes::from(new_body);

                        // Construct new payload with explicit cast
                        let stream = once(ready(Ok::<_, PayloadError>(new_bytes)));
                        let boxed_stream: Pin<Box<dyn Stream<Item = Result<Bytes, PayloadError>>>> = Box::pin(stream);
                        let payload = dev::Payload::Stream { payload: boxed_stream };
                        req.set_payload(payload);
                    } else {
                         // Reset original payload
                         let stream = once(ready(Ok::<_, PayloadError>(body)));
                         let boxed_stream: Pin<Box<dyn Stream<Item = Result<Bytes, PayloadError>>>> = Box::pin(stream);
                         let payload = dev::Payload::Stream { payload: boxed_stream };
                         req.set_payload(payload);
                    }
                }
            }

            let res = svc.call(req).await?;
            Ok(res)
        })
    }
}

/// Recursively transform keys from camelCase to snake_case
fn transform_keys(value: &mut Value) {
    match value {
        Value::Object(map) => {
            let original_keys: Vec<String> = map.keys().cloned().collect();
            let mut new_map = serde_json::Map::new();

            for key in original_keys {
                if let Some(mut val) = map.remove(&key) {
                    transform_keys(&mut val);
                    let new_key = camel_to_snake(&key);
                    new_map.insert(new_key, val);
                }
            }
            *map = new_map;
        }
        Value::Array(arr) => {
            for val in arr {
                transform_keys(val);
            }
        }
        _ => {}
    }
}

fn camel_to_snake(s: &str) -> String {
    let mut new_s = String::new();
    for (i, c) in s.char_indices() {
        if c.is_uppercase() {
            if i != 0 {
                new_s.push('_');
            }
            new_s.extend(c.to_lowercase());
        } else {
            new_s.push(c);
        }
    }
    new_s
}
