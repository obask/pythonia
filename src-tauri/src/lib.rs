use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Lesson {
    path: String,
    file_name: String,
    title: String,
    slug: Option<String>,
    description: Option<String>,
    module_id: Option<String>,
    module_title: Option<String>,
    module_order: Option<i64>,
    order: Option<i64>,
    level: Option<String>,
    duration: Option<String>,
    xp: Option<i64>,
    tags: Vec<String>,
    objectives: Vec<String>,
    quiz: Vec<QuizItem>,
    challenge: Option<Challenge>,
    body: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct QuizItem {
    id: Option<String>,
    #[serde(rename = "type")]
    kind: String,
    prompt: String,
    options: Option<Vec<String>>,
    answer: serde_yaml::Value,
    explanation: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Challenge {
    prompt: String,
    #[serde(default, rename = "starterCode")]
    starter_code: String,
    #[serde(default)]
    tests: Vec<ChallengeTest>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ChallengeTest {
    name: String,
    code: String,
}

fn default_vault_path() -> PathBuf {
    if let Some(home) = dirs::home_dir() {
        home.join("ClaudeProjects/pythonia--lessons/lessons")
    } else {
        PathBuf::from("lessons")
    }
}

fn split_frontmatter(content: &str) -> (Option<&str>, &str) {
    let trimmed = content.trim_start_matches('\u{feff}');
    if let Some(rest) = trimmed.strip_prefix("---") {
        let rest = rest.trim_start_matches(['\r', '\n']);
        if let Some(end) = rest.find("\n---") {
            let fm = &rest[..end];
            let body_start = end + "\n---".len();
            let body = &rest[body_start..];
            let body = body.trim_start_matches(['\r', '\n']);
            return (Some(fm), body);
        }
    }
    (None, trimmed)
}

fn yaml_get_str(map: &serde_yaml::Mapping, key: &str) -> Option<String> {
    map.get(serde_yaml::Value::String(key.into()))
        .and_then(|v| match v {
            serde_yaml::Value::String(s) => Some(s.clone()),
            serde_yaml::Value::Number(n) => Some(n.to_string()),
            _ => None,
        })
}
fn yaml_get_i64(map: &serde_yaml::Mapping, key: &str) -> Option<i64> {
    map.get(serde_yaml::Value::String(key.into()))
        .and_then(|v| v.as_i64())
}
fn yaml_get_str_list(map: &serde_yaml::Mapping, key: &str) -> Vec<String> {
    map.get(serde_yaml::Value::String(key.into()))
        .and_then(|v| v.as_sequence())
        .map(|seq| {
            seq.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

fn parse_lesson(path: &Path, root: &Path) -> Option<Lesson> {
    let raw = fs::read_to_string(path).ok()?;
    let (fm_opt, body) = split_frontmatter(&raw);

    let mut title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();
    let mut slug = None;
    let mut description = None;
    let mut module_id = None;
    let mut module_title = None;
    let mut module_order = None;
    let mut order = None;
    let mut level = None;
    let mut duration = None;
    let mut xp = None;
    let mut tags: Vec<String> = Vec::new();
    let mut objectives: Vec<String> = Vec::new();
    let mut quiz: Vec<QuizItem> = Vec::new();
    let mut challenge: Option<Challenge> = None;

    if let Some(fm) = fm_opt {
        if let Ok(val) = serde_yaml::from_str::<serde_yaml::Value>(fm) {
            if let Some(map) = val.as_mapping() {
                if let Some(t) = yaml_get_str(map, "title") {
                    title = t;
                }
                slug = yaml_get_str(map, "slug");
                description = yaml_get_str(map, "description");
                module_id = yaml_get_str(map, "moduleId");
                module_title = yaml_get_str(map, "moduleTitle");
                module_order = yaml_get_i64(map, "moduleOrder");
                order = yaml_get_i64(map, "order");
                level = yaml_get_str(map, "level");
                duration = yaml_get_str(map, "duration");
                xp = yaml_get_i64(map, "xp");
                tags = yaml_get_str_list(map, "tags");
                objectives = yaml_get_str_list(map, "objectives");

                if let Some(q) = map.get(serde_yaml::Value::String("quiz".into())) {
                    if let Ok(parsed) = serde_yaml::from_value::<Vec<QuizItem>>(q.clone()) {
                        quiz = parsed;
                    }
                }
                if let Some(c) = map.get(serde_yaml::Value::String("challenge".into())) {
                    if let Ok(parsed) = serde_yaml::from_value::<Challenge>(c.clone()) {
                        challenge = Some(parsed);
                    }
                }
            }
        }
    }

    let rel = path.strip_prefix(root).unwrap_or(path);
    let file_name = rel.to_string_lossy().to_string();

    Some(Lesson {
        path: path.to_string_lossy().to_string(),
        file_name,
        title,
        slug,
        description,
        module_id,
        module_title,
        module_order,
        order,
        level,
        duration,
        xp,
        tags,
        objectives,
        quiz,
        challenge,
        body: body.to_string(),
    })
}

#[tauri::command]
fn load_lessons(vault: Option<String>) -> Result<Vec<Lesson>, String> {
    let root = vault
        .map(PathBuf::from)
        .unwrap_or_else(default_vault_path);

    if !root.exists() {
        return Err(format!("Vault not found: {}", root.display()));
    }

    let mut lessons: Vec<Lesson> = WalkDir::new(&root)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| {
            e.path()
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s.eq_ignore_ascii_case("md"))
                .unwrap_or(false)
        })
        .filter_map(|e| parse_lesson(e.path(), &root))
        .collect();

    lessons.sort_by(|a, b| {
        a.module_order
            .unwrap_or(9999)
            .cmp(&b.module_order.unwrap_or(9999))
            .then(a.order.unwrap_or(9999).cmp(&b.order.unwrap_or(9999)))
            .then(a.file_name.cmp(&b.file_name))
    });

    Ok(lessons)
}

#[tauri::command]
fn default_vault() -> String {
    default_vault_path().to_string_lossy().to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_lessons, default_vault])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
