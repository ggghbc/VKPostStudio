use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub const VK_ANDROID_CLIENT_ID: &str = "2274003";
pub const VK_ANDROID_CLIENT_SECRET: &str = "hHbZxrka2uZ6jB1inYsH";
pub const VK_ANDROID_AUTH_VERSION: &str = "5.272";
pub const VK_AUTH_USER_AGENT: &str =
    "VKAndroidApp/8.183-54468 (Android 14; SDK 34; arm64-v8a; Google; Pixel 7; ru; 2400x1080)";

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct VkDeviceProfile {
    pub device_id: String,
    pub trusted_hash: Option<String>,
}

#[allow(dead_code)]
pub struct VkDeviceManager {
    config_path: PathBuf,
    profile: VkDeviceProfile,
}

#[allow(dead_code)]
impl VkDeviceManager {
    pub fn load_or_generate(app_dir: &Path) -> Self {
        let config_path = app_dir.join("vk_device_profile.json");
        let mut profile = VkDeviceProfile::default();

        if config_path.exists() {
            if let Ok(data) = std::fs::read_to_string(&config_path) {
                if let Ok(loaded) = serde_json::from_str::<VkDeviceProfile>(&data) {
                    if !loaded.device_id.trim().is_empty() {
                        profile = loaded;
                    }
                }
            }
        }

        if profile.device_id.is_empty() {
            let random64: u64 = rand::random();
            let uuid_part = uuid::Uuid::new_v4().simple().to_string();
            profile.device_id = format!("{:016x}:{}", random64, uuid_part);
            let _ = std::fs::write(
                &config_path,
                serde_json::to_string_pretty(&profile).unwrap_or_default(),
            );
        }

        Self {
            config_path,
            profile,
        }
    }

    pub fn get_device_id(&self) -> &str {
        &self.profile.device_id
    }

    pub fn get_trusted_hash(&self) -> Option<&str> {
        self.profile.trusted_hash.as_deref()
    }

    pub fn set_trusted_hash(&mut self, hash: String) {
        if self.profile.trusted_hash.as_deref() != Some(&hash) {
            self.profile.trusted_hash = Some(hash);
            let _ = std::fs::write(
                &self.config_path,
                serde_json::to_string_pretty(&self.profile).unwrap_or_default(),
            );
        }
    }
}
