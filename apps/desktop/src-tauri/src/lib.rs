use std::sync::Mutex;
use std::time::Duration;

use tauri::{Emitter, Manager, RunEvent};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

/// Holds the sidecar child process so we can kill it on shutdown.
struct SidecarState(Mutex<Option<CommandChild>>);

/// Poll the sidecar health endpoint until it responds 200.
async fn wait_for_server(port: u16) -> Result<(), String> {
    let url = format!("http://127.0.0.1:{}/api/graph/health", port);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|e| e.to_string())?;

    for _ in 0..60 {
        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => return Ok(()),
            _ => tokio::time::sleep(Duration::from_millis(500)).await,
        }
    }
    Err("Sidecar did not become ready within 30 seconds".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();

            // In dev mode, Nuxt dev server is already running — skip sidecar
            if cfg!(dev) {
                println!("[trellis] dev mode — using devUrl, skipping sidecar");
                return Ok(());
            }

            // Pick a free port for the sidecar
            let port = portpicker::pick_unused_port().expect("no free port found");

            // Resolve the app data directory for the DB
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();
            let db_path = app_data_dir.join("trellis.db");

            // Spawn the Nitro sidecar
            let sidecar = match handle
                .shell()
                .sidecar("binaries/nitro-server")
            {
                Ok(cmd) => cmd
                    .env("NITRO_PORT", port.to_string())
                    .env("HOST", "127.0.0.1")
                    .env("TRELLIS_DATA_MODE", "local")
                    .env("TRELLIS_DB_PATH", db_path.to_string_lossy().to_string()),
                Err(e) => {
                    eprintln!("[trellis] sidecar binary not found: {} — app will not function without the server", e);
                    return Ok(());
                }
            };

            let (mut rx, child) = match sidecar.spawn() {
                Ok(result) => result,
                Err(e) => {
                    eprintln!("[trellis] failed to spawn sidecar: {} — app will not function without the server", e);
                    return Ok(());
                }
            };

            // Store child handle for cleanup
            {
                let state = handle.state::<SidecarState>();
                let mut guard = state.0.lock().unwrap();
                *guard = Some(child);
            }

            // Log sidecar stdout/stderr in background
            let handle_for_logs = handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("[nitro] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[nitro] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(payload) => {
                            eprintln!("[nitro] process exited: {:?}", payload);
                            let _ = handle_for_logs.emit("sidecar-exit", payload.code);
                            break;
                        }
                        _ => {}
                    }
                }
            });

            // Wait for server ready, then navigate webview
            let handle_for_nav = handle.clone();
            tauri::async_runtime::spawn(async move {
                match wait_for_server(port).await {
                    Ok(()) => {
                        println!("[trellis] sidecar ready on port {}", port);
                        if let Some(window) = handle_for_nav.get_webview_window("main") {
                            let url = format!("http://127.0.0.1:{}", port);
                            let _ = window.navigate(url.parse().unwrap());
                        }
                    }
                    Err(e) => {
                        eprintln!("[trellis] sidecar failed to start: {}", e);
                        let _ = handle_for_nav.emit("sidecar-error", &e);
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building Trellis desktop");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { .. } = event {
            let child = {
                let state = app_handle.state::<SidecarState>();
                let mut guard = state.0.lock().unwrap();
                guard.take()
            };
            if let Some(child) = child {
                let _ = child.kill();
                println!("[trellis] sidecar killed");
            }
        }
    });
}
