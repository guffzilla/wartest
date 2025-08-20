use crate::types::*;
use anyhow::Result;
use reqwest::Client;
use serde_json;

/// HTTP client for server communication
pub struct ServerClient {
    client: Client,
    base_url: String,
    api_key: Option<String>,
}

impl ServerClient {
    /// Create a new server client
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            api_key: None,
        }
    }
    
    /// Create a new server client with authentication
    pub fn new_with_auth(base_url: String, api_key: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            api_key: Some(api_key),
        }
    }
    
    /// Upload a single game result to the server
    pub async fn upload_game_result(&self, game: &GameResult) -> Result<()> {
        let url = format!("{}/api/game-results", self.base_url);
        
        let mut request = self.client.post(&url).json(game);
        
        // Add authentication header if available
        if let Some(ref api_key) = self.api_key {
            request = request.header("Authorization", &format!("Bearer {}", api_key));
        }
        
        let response = request.send().await?;
        
        let status = response.status();
        if status.is_success() {
            Ok(())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(anyhow::anyhow!("Upload failed: {} - {}", status, error_text))
        }
    }
    
    /// Upload multiple game results in batch
    pub async fn upload_game_results_batch(&self, games: &[GameResult]) -> Result<UploadResult> {
        let url = format!("{}/api/game-results/batch", self.base_url);
        
        let mut request = self.client.post(&url).json(games);
        
        // Add authentication header if available
        if let Some(ref api_key) = self.api_key {
            request = request.header("Authorization", &format!("Bearer {}", api_key));
        }
        
        let response = request.send().await?;
        
        let status = response.status();
        if status.is_success() {
            let result: UploadResult = response.json().await?;
            Ok(result)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(anyhow::anyhow!("Batch upload failed: {} - {}", status, error_text))
        }
    }
    
    /// Get user's game history from server
    pub async fn get_game_history(&self) -> Result<Vec<GameResult>> {
        let url = format!("{}/api/user/game-history", self.base_url);
        
        let mut request = self.client.get(&url);
        
        // Add authentication header if available
        if let Some(ref api_key) = self.api_key {
            request = request.header("Authorization", &format!("Bearer {}", api_key));
        }
        
        let response = request.send().await?;
        
        let status = response.status();
        if status.is_success() {
            let games: Vec<GameResult> = response.json().await?;
            Ok(games)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(anyhow::anyhow!("Failed to get game history: {} - {}", status, error_text))
        }
    }
    
    /// Get global statistics from server
    pub async fn get_global_stats(&self) -> Result<serde_json::Value> {
        let url = format!("{}/api/global-stats", self.base_url);
        
        let response = self.client.get(&url).send().await?;
        
        let status = response.status();
        if status.is_success() {
            let stats: serde_json::Value = response.json().await?;
            Ok(stats)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(anyhow::anyhow!("Failed to get global stats: {} - {}", status, error_text))
        }
    }
    
    /// Test server connection
    pub async fn test_connection(&self) -> Result<bool> {
        let url = format!("{}/api/health", self.base_url);
        
        let response = self.client.get(&url).send().await?;
        
        Ok(response.status().is_success())
    }
    
    /// Authenticate with the server
    pub async fn authenticate(&self, username: &str, password: &str) -> Result<String> {
        let url = format!("{}/api/auth/login", self.base_url);
        
        let auth_data = serde_json::json!({
            "username": username,
            "password": password
        });
        
        let response = self.client.post(&url).json(&auth_data).send().await?;
        
        let status = response.status();
        if status.is_success() {
            let auth_response: serde_json::Value = response.json().await?;
            if let Some(token) = auth_response["token"].as_str() {
                Ok(token.to_string())
            } else {
                Err(anyhow::anyhow!("No token in response"))
            }
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(anyhow::anyhow!("Authentication failed: {} - {}", status, error_text))
        }
    }
    
    /// Register a new user account
    pub async fn register(&self, username: &str, email: &str, password: &str) -> Result<String> {
        let url = format!("{}/api/auth/register", self.base_url);
        
        let register_data = serde_json::json!({
            "username": username,
            "email": email,
            "password": password
        });
        
        let response = self.client.post(&url).json(&register_data).send().await?;
        
        let status = response.status();
        if status.is_success() {
            let auth_response: serde_json::Value = response.json().await?;
            if let Some(token) = auth_response["token"].as_str() {
                Ok(token.to_string())
            } else {
                Err(anyhow::anyhow!("No token in response"))
            }
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(anyhow::anyhow!("Registration failed: {} - {}", status, error_text))
        }
    }
    
    /// Get server configuration
    pub async fn get_server_config(&self) -> Result<serde_json::Value> {
        let url = format!("{}/api/config", self.base_url);
        
        let response = self.client.get(&url).send().await?;
        
        let status = response.status();
        if status.is_success() {
            let config: serde_json::Value = response.json().await?;
            Ok(config)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(anyhow::anyhow!("Failed to get server config: {} - {}", status, error_text))
        }
    }
}

impl Clone for ServerClient {
    fn clone(&self) -> Self {
        Self {
            client: Client::new(),
            base_url: self.base_url.clone(),
            api_key: self.api_key.clone(),
        }
    }
}
