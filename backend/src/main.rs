use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};
use std::{fs, net::SocketAddr};
use uuid::Uuid;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
}

#[derive(Debug, Serialize, Deserialize)]
struct Text {
    id: Uuid,
    content: String,
    created_at: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let db_path = std::env::current_dir()?.join("backend").join("sury.db");
    let db_url = format!("sqlite://{}", db_path.display());

    let init_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
    .join("sql")
    .join("init.sql");

    let db = SqlitePoolOptions::new()
        .connect(&db_url)
        .await?;


    let init_sql = fs::read_to_string(init_path)?;
    sqlx::query(&init_sql).execute(&db).await?;

    let app_state = AppState { db };

    let app = Router::new()
        .route("/api/texts", post(create_text))
        .route("/api/texts/:id", get(get_text))
        .with_state(app_state)
        .layer(CorsLayer::permissive());

    // 🎯 Einfache Variante: Axum bringt Server-Aufruf gleich mit
    let addr = "127.0.0.1:3000".parse::<SocketAddr>()?;
    println!("🚀 Server läuft auf http://{}/", addr);

    axum::serve(
        tokio::net::TcpListener::bind(addr).await?,
        app.into_make_service(),
    )
    .await?;

    Ok(())
}



async fn create_text(
    State(state): State<AppState>,
    Json(payload): Json<Text>,
) -> impl IntoResponse {
    let Text { id, content, created_at } = payload;

    let result = sqlx::query("INSERT INTO texts (id, content, created_at) VALUES (?, ?, ?)")
        .bind(id.to_string())
        .bind(content)
        .bind(created_at)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => StatusCode::CREATED,
        Err(e) => {
            eprintln!("Fehler beim Speichern: {e}");
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

async fn get_text(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let row = sqlx::query("SELECT id, content, created_at FROM texts WHERE id = ?")
        .bind(id.to_string())
        .fetch_optional(&state.db)
        .await;

    match row {
        Ok(Some(row)) => {
            let text = Text {
                id: Uuid::parse_str(row.get::<String, _>("id").as_str()).unwrap(),
                content: row.get("content"),
                created_at: row.get("created_at"),
            };
            Json(text).into_response()
        }
        Ok(None) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            eprintln!("Fehler beim Laden: {e}");
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
