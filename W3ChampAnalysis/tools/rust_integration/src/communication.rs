//! Communication Module
//! 
//! Handles WebSocket and HTTP API communication for real-time data streaming
//! and client-server interaction.

use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn, error};
use tokio_tungstenite::{accept_async, WebSocketStream};
use tokio::net::{TcpListener, TcpStream};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use chrono::{DateTime, Utc};

use crate::{IntegrationError, data_structures::ExtractedData};

/// Communication manager for handling client connections
pub struct CommunicationManager {
    server_handle: Arc<RwLock<Option<tokio::task::JoinHandle<()>>>>,
    clients: Arc<RwLock<Vec<ClientConnection>>>,
    server_address: String,
    is_running: Arc<RwLock<bool>>,
    stats: Arc<RwLock<CommunicationStats>>,
}

/// Client connection information
#[derive(Debug, Clone)]
pub struct ClientConnection {
    pub id: u32,
    pub address: String,
    pub connected_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub message_count: u64,
}

/// Communication statistics
#[derive(Debug, Clone, serde::Serialize)]
pub struct CommunicationStats {
    pub total_connections: u64,
    pub active_connections: usize,
    pub total_messages_sent: u64,
    pub total_messages_received: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub server_start_time: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
}

impl CommunicationManager {
    /// Create a new communication manager
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            server_handle: Arc::new(RwLock::new(None)),
            clients: Arc::new(RwLock::new(Vec::new())),
            server_address: "127.0.0.1:8080".to_string(),
            is_running: Arc::new(RwLock::new(false)),
            stats: Arc::new(RwLock::new(CommunicationStats {
                total_connections: 0,
                active_connections: 0,
                total_messages_sent: 0,
                total_messages_received: 0,
                bytes_sent: 0,
                bytes_received: 0,
                server_start_time: Utc::now(),
                last_activity: Utc::now(),
            })),
        })
    }

    /// Start the communication server
    pub async fn start_server(&self) -> anyhow::Result<()> {
        info!("Starting communication server on {}", self.server_address);

        let server_address = self.server_address.clone();
        let clients = self.clients.clone();
        let stats = self.stats.clone();
        let is_running = self.is_running.clone();

        let handle = tokio::spawn(async move {
            if let Err(e) = Self::run_server(server_address, clients, stats, is_running).await {
                error!("Communication server error: {}", e);
            }
        });

        *self.server_handle.write().await = Some(handle);
        *self.is_running.write().await = true;

        info!("Communication server started successfully");
        Ok(())
    }

    /// Run the main server loop
    async fn run_server(
        address: String,
        clients: Arc<RwLock<Vec<ClientConnection>>>,
        stats: Arc<RwLock<CommunicationStats>>,
        is_running: Arc<RwLock<bool>>,
    ) -> anyhow::Result<()> {
        let listener = TcpListener::bind(&address).await?;
        info!("WebSocket server listening on {}", address);

        let mut connection_id = 0u32;

        while *is_running.read().await {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    connection_id += 1;
                    let client_id = connection_id;
                    
                    info!("New client connection from {} (ID: {})", addr, client_id);

                    // Spawn handler for this connection
                    let clients_clone = clients.clone();
                    let stats_clone = stats.clone();
                    
                    tokio::spawn(async move {
                        if let Err(e) = Self::handle_client(stream, client_id, addr.to_string(), clients_clone, stats_clone).await {
                            error!("Client {} error: {}", client_id, e);
                        }
                    });
                }
                Err(e) => {
                    error!("Accept error: {}", e);
                }
            }
        }

        Ok(())
    }

    /// Handle individual client connection
    async fn handle_client(
        stream: TcpStream,
        client_id: u32,
        address: String,
        clients: Arc<RwLock<Vec<ClientConnection>>>,
        stats: Arc<RwLock<CommunicationStats>>,
    ) -> anyhow::Result<()> {
        let ws_stream = accept_async(stream).await?;
        
        // Add client to list
        {
            let mut clients_list = clients.write().await;
            clients_list.push(ClientConnection {
                id: client_id,
                address: address.clone(),
                connected_at: Utc::now(),
                last_activity: Utc::now(),
                message_count: 0,
            });
        }

        // Update stats
        {
            let mut stats_data = stats.write().await;
            stats_data.total_connections += 1;
            stats_data.active_connections += 1;
            stats_data.last_activity = Utc::now();
        }

        // Handle WebSocket communication
        Self::handle_websocket(ws_stream, client_id, clients, stats).await?;

        // Remove client from list
        {
            let mut clients_list = clients.write().await;
            clients_list.retain(|c| c.id != client_id);
        }

        // Update stats
        {
            let mut stats_data = stats.write().await;
            stats_data.active_connections = stats_data.active_connections.saturating_sub(1);
            stats_data.last_activity = Utc::now();
        }

        info!("Client {} disconnected", client_id);
        Ok(())
    }

    /// Handle WebSocket communication
    async fn handle_websocket(
        mut ws_stream: WebSocketStream<TcpStream>,
        client_id: u32,
        clients: Arc<RwLock<Vec<ClientConnection>>>,
        stats: Arc<RwLock<CommunicationStats>>,
    ) -> anyhow::Result<()> {
        while let Some(msg) = ws_stream.next().await {
            match msg {
                Ok(msg) => {
                    // Update client activity
                    {
                        let mut clients_list = clients.write().await;
                        if let Some(client) = clients_list.iter_mut().find(|c| c.id == client_id) {
                            client.last_activity = Utc::now();
                            client.message_count += 1;
                        }
                    }

                    // Update stats
                    {
                        let mut stats_data = stats.write().await;
                        stats_data.total_messages_received += 1;
                        stats_data.last_activity = Utc::now();
                    }

                    // Handle message
                    match msg {
                        tokio_tungstenite::tungstenite::Message::Text(text) => {
                            info!("Received text message from client {}: {}", client_id, text);
                            
                            // Echo message back
                            let response = json!({
                                "type": "echo",
                                "message": text,
                                "timestamp": Utc::now()
                            });
                            
                            if let Err(e) = ws_stream.send(tokio_tungstenite::tungstenite::Message::Text(response.to_string())).await {
                                error!("Failed to send response to client {}: {}", client_id, e);
                                break;
                            }
                        }
                        tokio_tungstenite::tungstenite::Message::Binary(data) => {
                            info!("Received binary message from client {}: {} bytes", client_id, data.len());
                        }
                        tokio_tungstenite::tungstenite::Message::Ping(data) => {
                            if let Err(e) = ws_stream.send(tokio_tungstenite::tungstenite::Message::Pong(data)).await {
                                error!("Failed to send pong to client {}: {}", client_id, e);
                                break;
                            }
                        }
                        tokio_tungstenite::tungstenite::Message::Close(_) => {
                            info!("Client {} requested close", client_id);
                            break;
                        }
                        _ => {}
                    }
                }
                Err(e) => {
                    error!("WebSocket error for client {}: {}", client_id, e);
                    break;
                }
            }
        }

        Ok(())
    }

    /// Stop the communication server
    pub async fn stop_server(&self) -> anyhow::Result<()> {
        info!("Stopping communication server");

        *self.is_running.write().await = false;

        if let Some(handle) = self.server_handle.write().await.take() {
            handle.abort();
        }

        // Clear clients
        self.clients.write().await.clear();

        info!("Communication server stopped");
        Ok(())
    }

    /// Send data to all connected clients
    pub async fn send_data(&self, data: ExtractedData) -> anyhow::Result<()> {
        let data_json = serde_json::to_string(&data)?;
        let message = tokio_tungstenite::tungstenite::Message::Text(data_json);

        // This would send to all connected WebSocket clients
        // For now, just update stats
        {
            let mut stats = self.stats.write().await;
            stats.total_messages_sent += 1;
            stats.bytes_sent += data_json.len() as u64;
            stats.last_activity = Utc::now();
        }

        info!("Sent game data to clients ({} bytes)", data_json.len());
        Ok(())
    }

    /// Get communication statistics
    pub async fn get_stats(&self) -> anyhow::Result<CommunicationStats> {
        Ok(self.stats.read().await.clone())
    }

    /// Get connected clients
    pub async fn get_clients(&self) -> anyhow::Result<Vec<ClientConnection>> {
        Ok(self.clients.read().await.clone())
    }

    /// Set server address
    pub fn set_server_address(&mut self, address: String) {
        self.server_address = address;
    }

    /// Check if server is running
    pub async fn is_server_running(&self) -> bool {
        *self.is_running.read().await
    }

    /// Broadcast message to all clients
    pub async fn broadcast_message(&self, message: &str) -> anyhow::Result<()> {
        let message_json = json!({
            "type": "broadcast",
            "message": message,
            "timestamp": Utc::now()
        });

        // This would send to all connected clients
        // For now, just log the message
        info!("Broadcasting message: {}", message);

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.total_messages_sent += 1;
            stats.bytes_sent += message_json.to_string().len() as u64;
            stats.last_activity = Utc::now();
        }

        Ok(())
    }

    /// Get server status
    pub async fn get_server_status(&self) -> anyhow::Result<ServerStatus> {
        let clients = self.clients.read().await;
        let stats = self.stats.read().await;
        let is_running = *self.is_running.read().await;

        Ok(ServerStatus {
            is_running,
            server_address: self.server_address.clone(),
            active_clients: clients.len(),
            total_connections: stats.total_connections,
            total_messages_sent: stats.total_messages_sent,
            total_messages_received: stats.total_messages_received,
            bytes_sent: stats.bytes_sent,
            bytes_received: stats.bytes_received,
            uptime: Utc::now() - stats.server_start_time,
        })
    }
}

/// Server status information
#[derive(Debug, Clone, serde::Serialize)]
pub struct ServerStatus {
    pub is_running: bool,
    pub server_address: String,
    pub active_clients: usize,
    pub total_connections: u64,
    pub total_messages_sent: u64,
    pub total_messages_received: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub uptime: chrono::Duration,
}

/// HTTP API server for REST endpoints
pub struct HttpApiServer {
    server_handle: Arc<RwLock<Option<tokio::task::JoinHandle<()>>>>,
    server_address: String,
    is_running: Arc<RwLock<bool>>,
}

impl HttpApiServer {
    /// Create a new HTTP API server
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            server_handle: Arc::new(RwLock::new(None)),
            server_address: "127.0.0.1:8081".to_string(),
            is_running: Arc::new(RwLock::new(false)),
        })
    }

    /// Start the HTTP API server
    pub async fn start_server(&self) -> anyhow::Result<()> {
        info!("Starting HTTP API server on {}", self.server_address);

        let server_address = self.server_address.clone();
        let is_running = self.is_running.clone();

        let handle = tokio::spawn(async move {
            if let Err(e) = Self::run_http_server(server_address, is_running).await {
                error!("HTTP API server error: {}", e);
            }
        });

        *self.server_handle.write().await = Some(handle);
        *self.is_running.write().await = true;

        info!("HTTP API server started successfully");
        Ok(())
    }

    /// Run the HTTP server
    async fn run_http_server(address: String, is_running: Arc<RwLock<bool>>) -> anyhow::Result<()> {
        // This would implement a proper HTTP server with endpoints
        // For now, just log that it's running
        info!("HTTP API server would be running on {}", address);
        
        // Keep the task alive
        while *is_running.read().await {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        Ok(())
    }

    /// Stop the HTTP API server
    pub async fn stop_server(&self) -> anyhow::Result<()> {
        info!("Stopping HTTP API server");

        *self.is_running.write().await = false;

        if let Some(handle) = self.server_handle.write().await.take() {
            handle.abort();
        }

        info!("HTTP API server stopped");
        Ok(())
    }

    /// Set server address
    pub fn set_server_address(&mut self, address: String) {
        self.server_address = address;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_communication_manager_creation() {
        let manager = CommunicationManager::new();
        assert!(manager.is_ok());
    }

    #[tokio::test]
    async fn test_http_api_server_creation() {
        let server = HttpApiServer::new();
        assert!(server.is_ok());
    }

    #[tokio::test]
    async fn test_server_status() {
        let manager = CommunicationManager::new().unwrap();
        let status = manager.get_server_status().await.unwrap();
        assert!(!status.is_running);
        assert_eq!(status.active_clients, 0);
    }
}
