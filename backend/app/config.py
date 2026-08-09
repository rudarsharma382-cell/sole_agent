from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent


def _env_files() -> tuple[str, ...]:
    # Prefer backend/.env, fall back to repo-root .env
    candidates = [BACKEND_ROOT / ".env", REPO_ROOT / ".env"]
    return tuple(str(p) for p in candidates if p.exists())


def _find_file(filename: str) -> Path:
    # Prefer REPO_ROOT if file exists
    if (REPO_ROOT / filename).exists():
        return REPO_ROOT / filename
    # Fall back to BACKEND_ROOT (for Vercel/standalone deployment)
    if (BACKEND_ROOT / filename).exists():
        return BACKEND_ROOT / filename
    # Fall back to app folder
    if (BACKEND_ROOT / "app" / filename).exists():
        return BACKEND_ROOT / "app" / filename
    return REPO_ROOT / filename


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files() or (str(BACKEND_ROOT / ".env"),),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek/deepseek-chat"

    openrouter_api_key: str = ""
    model_name: str = "meta-llama/llama-3.1-8b-instruct"
    fallback_model_name: str = "deepseek/deepseek-chat"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"


    curriculum_path: Path = _find_file("curriculum.json")
    candidates_path: Path = _find_file("candidates.json")
    chroma_dir: Path = BACKEND_ROOT / ".chroma"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    min_questions: int = 8
    min_curriculum_days: int = 4
    retrieval_top_k: int = 6


settings = Settings()

