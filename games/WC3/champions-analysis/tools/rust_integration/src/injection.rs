//! Process Injection Module
//! 
//! Handles sophisticated process injection techniques similar to W3Champions,
//! including CreateRemoteThread, SetWindowsHookEx, and Manual Map injection.

use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn, error};
use windows::{
    Win32::Foundation::{HANDLE, CloseHandle},
    Win32::System::Threading::{
        OpenProcess, CreateRemoteThread, VirtualAllocEx, WriteProcessMemory,
        PROCESS_ALL_ACCESS, MEM_COMMIT, PAGE_READWRITE, THREAD_ALL_ACCESS
    },
    Win32::System::Memory::VirtualFreeEx,
    Win32::System::ProcessStatus::{EnumProcesses, GetModuleBaseNameA},
    Win32::System::LibraryLoader::GetProcAddress,
    Win32::Foundation::GetLastError,
    core::PCSTR,
};

use crate::IntegrationError;

/// Information about a target process
#[derive(Debug, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub handle: HANDLE,
    pub base_address: usize,
    pub architecture: ProcessArchitecture,
}

#[derive(Debug, Clone)]
pub enum ProcessArchitecture {
    X86,
    X64,
}

/// Process manager that handles injection operations
pub struct ProcessManager {
    target_process: Arc<RwLock<Option<ProcessInfo>>>,
    injection_method: InjectionMethod,
    stealth_level: StealthLevel,
}

#[derive(Debug, Clone)]
pub enum InjectionMethod {
    CreateRemoteThread,
    SetWindowsHookEx,
    ManualMap,
}

#[derive(Debug, Clone)]
pub enum StealthLevel {
    Low,
    Medium,
    High,
    Maximum,
}

impl ProcessManager {
    /// Create a new process manager
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            target_process: Arc::new(RwLock::new(None)),
            injection_method: InjectionMethod::CreateRemoteThread,
            stealth_level: StealthLevel::High,
        })
    }

    /// Find Warcraft III process
    pub async fn find_warcraft_process(&self) -> anyhow::Result<ProcessInfo> {
        info!("Searching for Warcraft III process...");

        let processes = self.enumerate_processes().await?;
        
        for process in processes {
            if self.is_warcraft_process(&process).await? {
                info!("Found Warcraft III process: PID {}", process.pid);
                *self.target_process.write().await = Some(process.clone());
                return Ok(process);
            }
        }

        Err(IntegrationError::ProcessNotFound("Warcraft III process not found".to_string()).into())
    }

    /// Enumerate all running processes
    async fn enumerate_processes(&self) -> anyhow::Result<Vec<ProcessInfo>> {
        let mut processes = Vec::new();
        let mut pids = [0u32; 1024];
        let mut bytes_returned = 0u32;

        unsafe {
            if !EnumProcesses(&mut pids, &mut bytes_returned).as_bool() {
                return Err(IntegrationError::ProcessNotFound("Failed to enumerate processes".to_string()).into());
            }
        }

        let process_count = bytes_returned as usize / std::mem::size_of::<u32>();

        for i in 0..process_count {
            let pid = pids[i];
            if pid == 0 {
                continue;
            }

            if let Ok(process_info) = self.get_process_info(pid).await {
                processes.push(process_info);
            }
        }

        Ok(processes)
    }

    /// Get information about a specific process
    async fn get_process_info(&self, pid: u32) -> anyhow::Result<ProcessInfo> {
        unsafe {
            let handle = OpenProcess(PROCESS_ALL_ACCESS, false, pid);
            if handle.is_invalid() {
                return Err(IntegrationError::ProcessNotFound(format!("Failed to open process {}", pid)).into());
            }

            let mut name_buffer = [0u8; 256];
            let mut name_size = 0u32;

            if GetModuleBaseNameA(handle, None, &mut name_buffer, &mut name_size).as_bool() {
                let name = String::from_utf8_lossy(&name_buffer[..name_size as usize]).to_string();
                
                Ok(ProcessInfo {
                    pid,
                    name,
                    handle,
                    base_address: 0, // Will be determined later
                    architecture: ProcessArchitecture::X64, // Default, will be detected
                })
            } else {
                CloseHandle(handle);
                Err(IntegrationError::ProcessNotFound(format!("Failed to get process name for PID {}", pid)).into())
            }
        }
    }

    /// Check if a process is Warcraft III
    async fn is_warcraft_process(&self, process: &ProcessInfo) -> anyhow::Result<bool> {
        let warcraft_names = [
            "war3.exe",
            "Warcraft III.exe",
            "Frozen Throne.exe",
            "w3l.exe",
            "w3g.exe",
        ];

        let process_name_lower = process.name.to_lowercase();
        
        for warcraft_name in &warcraft_names {
            if process_name_lower.contains(&warcraft_name.to_lowercase()) {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// Inject DLL into target process
    pub async fn inject_dll(&self, process_info: &ProcessInfo) -> anyhow::Result<()> {
        info!("Injecting DLL into process PID {}", process_info.pid);

        match self.injection_method {
            InjectionMethod::CreateRemoteThread => {
                self.inject_create_remote_thread(process_info).await
            }
            InjectionMethod::SetWindowsHookEx => {
                self.inject_windows_hook(process_info).await
            }
            InjectionMethod::ManualMap => {
                self.inject_manual_map(process_info).await
            }
        }
    }

    /// CreateRemoteThread injection method
    async fn inject_create_remote_thread(&self, process_info: &ProcessInfo) -> anyhow::Result<()> {
        info!("Using CreateRemoteThread injection method");

        unsafe {
            // Allocate memory in target process for DLL path
            let dll_path = "w3c_integration.dll\0";
            let path_size = dll_path.len() + 1;
            
            let remote_memory = VirtualAllocEx(
                process_info.handle,
                None,
                path_size,
                MEM_COMMIT,
                PAGE_READWRITE,
            );

            if remote_memory.is_null() {
                return Err(IntegrationError::InjectionFailed("Failed to allocate memory in target process".to_string()).into());
            }

            // Write DLL path to target process memory
            let dll_path_bytes = dll_path.as_bytes();
            let mut bytes_written = 0usize;

            if !WriteProcessMemory(
                process_info.handle,
                remote_memory,
                Some(dll_path_bytes.as_ptr() as _),
                dll_path_bytes.len(),
                Some(&mut bytes_written),
            ).as_bool() {
                VirtualFreeEx(process_info.handle, remote_memory, 0, 0x8000); // MEM_RELEASE
                return Err(IntegrationError::InjectionFailed("Failed to write DLL path to target process".to_string()).into());
            }

            // Get LoadLibraryA address
            let kernel32 = windows::Win32::System::LibraryLoader::GetModuleHandleA(PCSTR::null());
            let load_library = GetProcAddress(kernel32, PCSTR::from_raw("LoadLibraryA\0".as_ptr()));

            if load_library.is_none() {
                VirtualFreeEx(process_info.handle, remote_memory, 0, 0x8000);
                return Err(IntegrationError::InjectionFailed("Failed to get LoadLibraryA address".to_string()).into());
            }

            // Create remote thread to load DLL
            let thread_handle = CreateRemoteThread(
                process_info.handle,
                None,
                0,
                Some(std::mem::transmute(load_library.unwrap())),
                Some(remote_memory),
                0,
                None,
            );

            if thread_handle.is_invalid() {
                VirtualFreeEx(process_info.handle, remote_memory, 0, 0x8000);
                return Err(IntegrationError::InjectionFailed("Failed to create remote thread".to_string()).into());
            }

            // Wait for thread to complete
            windows::Win32::System::Threading::WaitForSingleObject(thread_handle, 5000);

            // Clean up
            CloseHandle(thread_handle);
            VirtualFreeEx(process_info.handle, remote_memory, 0, 0x8000);

            info!("CreateRemoteThread injection completed successfully");
            Ok(())
        }
    }

    /// SetWindowsHookEx injection method
    async fn inject_windows_hook(&self, _process_info: &ProcessInfo) -> anyhow::Result<()> {
        info!("Using SetWindowsHookEx injection method");
        
        // This method requires a DLL to be loaded in our process first
        // Then we can set a global hook that will be injected into all processes
        
        warn!("SetWindowsHookEx injection not yet implemented");
        Err(IntegrationError::InjectionFailed("SetWindowsHookEx injection not implemented".to_string()).into())
    }

    /// Manual Map injection method
    async fn inject_manual_map(&self, _process_info: &ProcessInfo) -> anyhow::Result<()> {
        info!("Using Manual Map injection method");
        
        // This is the most sophisticated method that manually loads the DLL
        // without using Windows loader, making it harder to detect
        
        warn!("Manual Map injection not yet implemented");
        Err(IntegrationError::InjectionFailed("Manual Map injection not implemented".to_string()).into())
    }

    /// Set injection method
    pub fn set_injection_method(&mut self, method: InjectionMethod) {
        self.injection_method = method;
    }

    /// Set stealth level
    pub fn set_stealth_level(&mut self, level: StealthLevel) {
        self.stealth_level = level;
    }

    /// Get current process information
    pub async fn get_process_info(&self) -> anyhow::Result<Option<ProcessInfo>> {
        Ok(self.target_process.read().await.clone())
    }

    /// Check if process is still running
    pub async fn is_process_running(&self) -> anyhow::Result<bool> {
        if let Some(process_info) = self.target_process.read().await.as_ref() {
            unsafe {
                let handle = OpenProcess(PROCESS_QUERY_INFORMATION, false, process_info.pid);
                if !handle.is_invalid() {
                    CloseHandle(handle);
                    Ok(true)
                } else {
                    Ok(false)
                }
            }
        } else {
            Ok(false)
        }
    }

    /// Terminate the target process
    pub async fn terminate_process(&self) -> anyhow::Result<()> {
        if let Some(process_info) = self.target_process.read().await.as_ref() {
            unsafe {
                if windows::Win32::System::Threading::TerminateProcess(process_info.handle, 0).as_bool() {
                    info!("Terminated process PID {}", process_info.pid);
                    Ok(())
                } else {
                    Err(IntegrationError::ProcessNotFound("Failed to terminate process".to_string()).into())
                }
            }
        } else {
            Err(IntegrationError::ProcessNotFound("No target process to terminate".to_string()).into())
        }
    }
}

impl Drop for ProcessManager {
    fn drop(&mut self) {
        // Clean up any open handles
        if let Some(process_info) = self.target_process.try_read().ok().and_then(|p| p.as_ref()) {
            unsafe {
                CloseHandle(process_info.handle);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_process_manager_creation() {
        let manager = ProcessManager::new();
        assert!(manager.is_ok());
    }

    #[tokio::test]
    async fn test_warcraft_process_detection() {
        let manager = ProcessManager::new().unwrap();
        let process_info = ProcessInfo {
            pid: 1234,
            name: "war3.exe".to_string(),
            handle: HANDLE::default(),
            base_address: 0,
            architecture: ProcessArchitecture::X64,
        };

        let is_warcraft = manager.is_warcraft_process(&process_info).await.unwrap();
        assert!(is_warcraft);
    }
}
