use serde_json::Value;

#[derive(serde::Serialize)]
struct UserContextView {
    status: i32,
    plan_name: String,
    email: String,
    models: Option<AppConfigView>,
    plan: Option<SubscriptionView>,
}

#[derive(serde::Serialize)]
struct AppConfigView {
    items: Vec<ModelConfigView>,
    recommended: Option<RecommendedModelsView>,
    default_model: Option<DefaultModelView>,
}

#[derive(serde::Serialize)]
struct ModelConfigView {
    name: String,
    id: Option<ModelIdView>,
    field_5: i32,
    field_11: i32,
    meta: Option<ModelMetaView>,
    tag: String,
    supported_types: Vec<MimeTypeSupportView>,
}

#[derive(serde::Serialize)]
struct ModelIdView {
    id: i32,
}

#[derive(serde::Serialize)]
struct ModelMetaView {
    rate_limit: f32,
    timestamp: Option<MetaTimestampView>,
}

#[derive(serde::Serialize)]
struct MetaTimestampView {
    value: i64,
}

#[derive(serde::Serialize)]
struct MimeTypeSupportView {
    mime_type: String,
    enabled: i32,
}

#[derive(serde::Serialize)]
struct RecommendedModelsView {
    category: String,
    list: Option<RecommendedListView>,
}

#[derive(serde::Serialize)]
struct RecommendedListView {
    model_names: Vec<String>,
}

#[derive(serde::Serialize)]
struct DefaultModelView {
    model: Option<ModelIdView>,
}

#[derive(serde::Serialize)]
struct SubscriptionView {
    tier_id: String,
    tier_name: String,
    display_name: String,
    upgrade_url: String,
    upgrade_message: String,
}

impl From<crate::proto::state_sync::UserContext> for UserContextView {
    fn from(value: crate::proto::state_sync::UserContext) -> Self {
        Self {
            status: value.status,
            plan_name: value.plan_name,
            email: value.email,
            models: value.models.map(AppConfigView::from),
            plan: value.plan.map(SubscriptionView::from),
        }
    }
}

impl From<crate::proto::state_sync::AppConfig> for AppConfigView {
    fn from(value: crate::proto::state_sync::AppConfig) -> Self {
        Self {
            items: value.items.into_iter().map(ModelConfigView::from).collect(),
            recommended: value.recommended.map(RecommendedModelsView::from),
            default_model: value.default_model.map(DefaultModelView::from),
        }
    }
}

impl From<crate::proto::state_sync::ModelConfig> for ModelConfigView {
    fn from(value: crate::proto::state_sync::ModelConfig) -> Self {
        Self {
            name: value.name,
            id: value.id.map(ModelIdView::from),
            field_5: value.field_5,
            field_11: value.field_11,
            meta: value.meta.map(ModelMetaView::from),
            tag: value.tag,
            supported_types: value
                .supported_types
                .into_iter()
                .map(MimeTypeSupportView::from)
                .collect(),
        }
    }
}

impl From<crate::proto::state_sync::ModelId> for ModelIdView {
    fn from(value: crate::proto::state_sync::ModelId) -> Self {
        Self { id: value.id }
    }
}

impl From<crate::proto::state_sync::ModelMeta> for ModelMetaView {
    fn from(value: crate::proto::state_sync::ModelMeta) -> Self {
        Self {
            rate_limit: value.rate_limit,
            timestamp: value.timestamp.map(MetaTimestampView::from),
        }
    }
}

impl From<crate::proto::state_sync::MetaTimestamp> for MetaTimestampView {
    fn from(value: crate::proto::state_sync::MetaTimestamp) -> Self {
        Self { value: value.value }
    }
}

impl From<crate::proto::state_sync::MimeTypeSupport> for MimeTypeSupportView {
    fn from(value: crate::proto::state_sync::MimeTypeSupport) -> Self {
        Self {
            mime_type: value.mime_type,
            enabled: value.enabled,
        }
    }
}

impl From<crate::proto::state_sync::RecommendedModels> for RecommendedModelsView {
    fn from(value: crate::proto::state_sync::RecommendedModels) -> Self {
        Self {
            category: value.category,
            list: value.list.map(RecommendedListView::from),
        }
    }
}

impl From<crate::proto::state_sync::RecommendedList> for RecommendedListView {
    fn from(value: crate::proto::state_sync::RecommendedList) -> Self {
        Self {
            model_names: value.model_names,
        }
    }
}

impl From<crate::proto::state_sync::DefaultModel> for DefaultModelView {
    fn from(value: crate::proto::state_sync::DefaultModel) -> Self {
        Self {
            model: value.model.map(ModelIdView::from),
        }
    }
}

impl From<crate::proto::state_sync::Subscription> for SubscriptionView {
    fn from(value: crate::proto::state_sync::Subscription) -> Self {
        Self {
            tier_id: value.tier_id,
            tier_name: value.tier_name,
            display_name: value.display_name,
            upgrade_url: value.upgrade_url,
            upgrade_message: value.upgrade_message,
        }
    }
}

pub(super) fn user_context_to_json(context: crate::proto::state_sync::UserContext) -> Value {
    serde_json::to_value(UserContextView::from(context)).unwrap_or_else(|e| {
        tracing::error!(error = %e, "UserContext JSON 序列化失败");
        Value::Null
    })
}
